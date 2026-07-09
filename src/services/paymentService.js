const crypto = require("crypto");
const Razorpay = require("razorpay");
const env = require("../config/env");
const Business = require("../models/Business");
const Listing = require("../models/Listing");
const { createModel } = require("../models/GenericModel");

const Subscription = createModel("subscriptions");

const PLAN_PRICES_PAISE = {
  Free: 0,
  Premium: 100000,
  Featured: 200000
};

const PLAN_FEATURES = {
  Free: "Basic listing, WhatsApp, 1 photo, up to 2 offerings",
  Premium: "Higher rank, 8 photos, 10 offerings, lead dashboard & analytics",
  Featured: "Top 3 result slots, 20 photos, unlimited offerings, all Premium perks"
};

const PLAN_RANK = { Free: 0, Premium: 1, Featured: 2 };

let razorpayClient = null;

function getRazorpay() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw Object.assign(new Error("Payment gateway is not configured"), { statusCode: 503 });
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret
    });
  }
  return razorpayClient;
}

function formatAmount(plan) {
  const paise = PLAN_PRICES_PAISE[plan];
  if (!paise) return "Rs.0";
  return `Rs.${paise / 100}/Year`;
}

function addOneYear(date = new Date()) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function assertValidPaidPlan(plan) {
  if (!plan || plan === "Free") {
    throw Object.assign(new Error("A paid plan is required"), { statusCode: 400 });
  }
  if (!PLAN_PRICES_PAISE[plan]) {
    throw Object.assign(new Error("Invalid plan"), { statusCode: 400 });
  }
}

async function assertBusinessOwner(businessId, user) {
  const business = await Business.findById(businessId);
  if (!business) {
    throw Object.assign(new Error("Business not found"), { statusCode: 404 });
  }
  if (business.owner_id !== user.id && business.phone !== user.phone) {
    throw Object.assign(new Error("Not authorized for this business"), { statusCode: 403 });
  }
  return business;
}

const paymentService = {
  PLAN_PRICES_PAISE,
  PLAN_FEATURES,

  async createOrder({ businessId, plan }, user) {
    assertValidPaidPlan(plan);
    const business = await assertBusinessOwner(businessId, user);

    // Use already-paid subscriptions as the source of truth.
    // This prevents repeated payments in cases where business.plan is not yet updated/refreshed.
    const paidSubs = await Subscription.findWhere({ business_id: businessId, payment_status: "Paid" });
    const currentRank =
      paidSubs.length > 0
        ? Math.max(...paidSubs.map((s) => PLAN_RANK[s.plan] || 0))
        : (PLAN_RANK[business.plan] || 0);
    const targetRank = PLAN_RANK[plan];
    if (currentRank >= targetRank) {
      throw Object.assign(
        new Error(`Business already has ${business.plan} plan or higher`),
        { statusCode: 400 }
      );
    }

    const amountPaise = PLAN_PRICES_PAISE[plan];
    const subscriptionId = `SUB-${Date.now().toString().slice(-8)}`;
    const receipt = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);

    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        business_id: businessId,
        plan,
        user_id: user.id
      }
    });

    await Subscription.create({
      id: subscriptionId,
      business_id: businessId,
      business_name: business.name,
      user_id: user.id,
      plan,
      amount: formatAmount(plan),
      amount_paise: amountPaise,
      currency: "INR",
      features: PLAN_FEATURES[plan],
      payment_status: "Pending",
      razorpay_order_id: order.id,
      invoice_ref: receipt
    });

    return {
      keyId: env.razorpay.keyId,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      subscriptionId,
      businessId,
      plan,
      businessName: business.name
    };
  },

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }, user) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw Object.assign(new Error("Missing payment details"), { statusCode: 400 });
    }

    const expected = crypto
      .createHmac("sha256", env.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw Object.assign(new Error("Payment verification failed"), { statusCode: 400 });
    }

    const rows = await Subscription.findWhere({ razorpay_order_id });
    const subscription = rows[0];
    if (!subscription) {
      throw Object.assign(new Error("Subscription not found for this order"), { statusCode: 404 });
    }

    if (subscription.user_id && subscription.user_id !== user.id) {
      throw Object.assign(new Error("Not authorized for this payment"), { statusCode: 403 });
    }

    if (subscription.payment_status === "Paid") {
      return this.toPublicSubscription(subscription);
    }

    const business = await assertBusinessOwner(subscription.business_id, user);
    const renewsOn = addOneYear();

    await Subscription.update(subscription.id, {
      payment_status: "Paid",
      razorpay_payment_id,
      razorpay_signature,
      renews_on: renewsOn,
      paid_at: new Date().toISOString().slice(0, 19).replace("T", " ")
    });

    await Business.update(business.id, { plan: subscription.plan });

    const listings = await Listing.findByBusinessId(business.id);
    for (const listing of listings) {
      await Listing.update(listing.id, { plan: subscription.plan });
    }

    const updated = await Subscription.findById(subscription.id);
    return this.toPublicSubscription(updated);
  },

  async getBusinessSubscriptions(businessId, user) {
    await assertBusinessOwner(businessId, user);
    const rows = await Subscription.findWhere({ business_id: businessId });
    return rows.map((row) => this.toPublicSubscription(row));
  },

  toPublicSubscription(row) {
    if (!row) return null;
    return {
      id: row.id,
      businessId: row.business_id,
      businessName: row.business_name,
      plan: row.plan,
      amount: row.amount,
      amountPaise: row.amount_paise,
      currency: row.currency || "INR",
      features: row.features,
      paymentStatus: row.payment_status,
      renewsOn: row.renews_on,
      invoiceRef: row.invoice_ref,
      razorpayOrderId: row.razorpay_order_id,
      razorpayPaymentId: row.razorpay_payment_id,
      paidAt: row.paid_at,
      createdAt: row.created_at
    };
  }
};

module.exports = paymentService;
