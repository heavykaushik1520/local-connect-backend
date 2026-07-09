const Business = require("../models/Business");
const User = require("../models/User");
const { createModel } = require("../models/GenericModel");
const couponEmailService = require("./couponEmailService");

const Offering = createModel("business_offerings");
const GameUnlock = createModel("game_unlocks");

const GAME_TYPES = ["spin", "memory", "tap"];
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DISCOUNT_PERCENTS = [5, 8, 10, 12, 15, 18, 20];

function toOfferPublic(row) {
  return {
    id: row.id,
    offeringId: row.offering_id || row.id,
    businessId: row.business_id || row.businessId,
    business: row.business_name || row.business,
    title: row.title,
    type: row.type || "Discount",
    discount: row.discount,
    couponCode: row.coupon_code || row.couponCode,
    validUntil: row.valid_until || row.validUntil,
    description: row.description,
    gameType: row.game_type || row.gameType,
    unlockedAt: row.unlocked_at || row.unlockedAt,
    emailsSent: Boolean(row.emails_sent)
  };
}

function parsePercent(text) {
  if (!text) return null;
  const match = String(text).match(/(\d{1,2})\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 50 ? value : null;
}

function couponPrefix(businessName) {
  const letters = String(businessName || "DEAL").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return letters.slice(0, 4) || "DEAL";
}

function buildPercentOffer(business, percent, offeringId = null) {
  const code = `${couponPrefix(business.name)}${percent}`;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);
  return {
    offeringId: offeringId || `gen-${business.id}`,
    businessId: business.id,
    business: business.name,
    title: `${percent}% off at ${business.name}`,
    type: "Discount",
    discount: `${percent}% off`,
    couponCode: code,
    validUntil: validUntil.toISOString().slice(0, 10),
    description: `Show this code at ${business.name} or mention it on WhatsApp. Valid for 7 days.`
  };
}

function pickRandomPercent() {
  return DISCOUNT_PERCENTS[Math.floor(Math.random() * DISCOUNT_PERCENTS.length)];
}

function filterUnlocksForUser(unlocks, userId, businessId) {
  return unlocks
    .filter((u) => u.user_id === userId && u.business_id === businessId)
    .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
    .map(toOfferPublic);
}

async function getBusinessPercentOffers(businessId) {
  const rows = await Offering.findWhere({ business_id: businessId, status: "Active" });
  return rows
    .map((o) => {
      const percent = parsePercent(o.discount);
      if (!percent) return null;
      return buildPercentOffer({ id: businessId, name: o.business_name }, percent, o.id);
    })
    .filter(Boolean);
}

async function resolveBusiness(businessId) {
  const row = await Business.findById(businessId);
  if (!row || row.status !== "Approved") {
    throw Object.assign(new Error("Business not found"), { statusCode: 404 });
  }
  return { public: Business.toPublic(row), row };
}

async function pickOfferForBusiness(business, excludeOfferingIds = []) {
  const pool = await getBusinessPercentOffers(business.id);
  const available = pool.filter((o) => !excludeOfferingIds.includes(o.offeringId));
  if (available.length) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return buildPercentOffer(business, pickRandomPercent());
}

function assertPlayUser(user) {
  if (!user) {
    throw Object.assign(new Error("Login required to play games and receive coupons by email"), { statusCode: 401 });
  }
  if (!user.email) {
    throw Object.assign(new Error("Add an email to your profile to receive coupon codes"), { statusCode: 400 });
  }
}

const gameService = {
  GAME_TYPES,
  COOLDOWN_MS,

  async getHub(user, businessId) {
    if (!businessId) {
      return { requiresBusiness: true, requiresLogin: !user, business: null, games: [], unlocks: [] };
    }

    const { public: business } = await resolveBusiness(businessId);

    if (!user) {
      return {
        requiresBusiness: false,
        requiresLogin: true,
        business: { id: business.id, name: business.name, slug: business.slug, category: business.category },
        games: GAME_TYPES.map((type) => ({
          type,
          label: type === "spin" ? "Spin wheel" : type === "memory" ? "Memory match" : "Tap & win",
          onCooldown: false,
          nextPlayAt: null
        })),
        unlocks: []
      };
    }

    const unlocks = await GameUnlock.findAll();
    const mine = filterUnlocksForUser(unlocks, user.id, businessId);

    const now = Date.now();
    const games = GAME_TYPES.map((type) => {
      const last = mine.find((u) => u.gameType === type);
      const lastTime = last?.unlockedAt ? new Date(last.unlockedAt).getTime() : 0;
      const nextAt = lastTime ? lastTime + COOLDOWN_MS : 0;
      const onCooldown = nextAt > now;
      return {
        type,
        label: type === "spin" ? "Spin wheel" : type === "memory" ? "Memory match" : "Tap & win",
        onCooldown,
        nextPlayAt: onCooldown ? new Date(nextAt).toISOString() : null
      };
    });

    return {
      requiresBusiness: false,
      requiresLogin: false,
      business: { id: business.id, name: business.name, slug: business.slug, category: business.category },
      games,
      percentOffersAvailable: (await getBusinessPercentOffers(businessId)).length,
      unlocks: mine
    };
  },

  async claimReward(user, gameType, businessId) {
    assertPlayUser(user);

    if (!businessId) {
      throw Object.assign(new Error("businessId is required — play from a business card to unlock its coupon"), { statusCode: 400 });
    }
    if (!GAME_TYPES.includes(gameType)) {
      throw Object.assign(new Error("Invalid game type"), { statusCode: 400 });
    }

    const { public: business, row: businessRow } = await resolveBusiness(businessId);

    const unlocks = await GameUnlock.findAll();
    const last = unlocks
      .filter((u) => u.user_id === user.id && u.game_type === gameType && u.business_id === businessId)
      .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))[0];

    if (last) {
      const elapsed = Date.now() - new Date(last.unlocked_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        throw Object.assign(
          new Error(`You already played for ${business.name} today. Try another game or come back later!`),
          { statusCode: 429 }
        );
      }
    }

    const recentOfferingIds = unlocks
      .filter((u) => u.user_id === user.id && u.business_id === businessId)
      .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
      .slice(0, 3)
      .map((u) => u.offering_id);

    const offer = await pickOfferForBusiness(business, recentOfferingIds);

    const id = `GUN-${Date.now().toString().slice(-8)}`;
    const row = await GameUnlock.create({
      id,
      user_id: user.id,
      visitor_key: user.id,
      business_id: businessId,
      game_type: gameType,
      offering_id: offer.offeringId,
      business_name: business.name,
      title: offer.title,
      type: offer.type,
      discount: offer.discount,
      coupon_code: offer.couponCode,
      valid_until: offer.validUntil || null,
      description: offer.description || null,
      emails_sent: 0,
      unlocked_at: new Date().toISOString().slice(0, 19).replace("T", " ")
    });

    let owner = null;
    if (businessRow.owner_id) {
      const ownerRow = await User.findById(businessRow.owner_id);
      if (ownerRow) owner = User.toPublic(ownerRow);
    }

    const emailResults = await couponEmailService.sendCouponClaimedEmails({
      customer: user,
      owner,
      business,
      offer,
      gameType
    });

    const emailsSent = Boolean(
      emailResults.customer?.sent || emailResults.customer?.devFallback ||
      emailResults.owner?.sent || emailResults.owner?.devFallback
    );

    if (emailsSent) {
      await GameUnlock.update(id, { emails_sent: 1 });
      row.emails_sent = 1;
    }

    const publicOffer = toOfferPublic(row);
    publicOffer.emailsSent = emailsSent;
    publicOffer.emailNotice = emailsSent
      ? "Coupon details sent to your email" + (owner?.email ? " and the business owner." : ".")
      : "Coupon saved — configure SMTP to enable email delivery.";

    return publicOffer;
  }
};

module.exports = gameService;
