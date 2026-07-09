const User = require("../models/User");
const Business = require("../models/Business");
const Listing = require("../models/Listing");
const { createModel } = require("../models/GenericModel");

const Subscription = createModel("subscriptions");
const Lead = createModel("leads");
const Ad = createModel("ads");
const AdEvent = createModel("ad_events");
const Testimonial = createModel("testimonials");
const Community = createModel("communities");
const CommunityMember = createModel("community_members");
const CommunityPost = createModel("community_posts");
const Offering = createModel("business_offerings");
const communityService = require("./communityService");
const kycService = require("./kycService");
const KycApplication = require("../models/KycApplication");

function mapRows(rows, mapper) {
  return rows.map(mapper || ((r) => r));
}

const adminService = {
  async getDashboardData() {
    const [users, businesses, listings, subscriptions, leads, ads, adEvents, testimonials, communities, communityMembers, communityPosts, businessOfferings] =
      await Promise.all([
        User.findAll(),
        Business.findAll(),
        Listing.findAll(),
        Subscription.findAll(),
        Lead.findAll(),
        Ad.findAll(),
        AdEvent.findAll(),
        Testimonial.findAll(),
        Community.findAll(),
        CommunityMember.findAll(),
        CommunityPost.findAll(),
        Offering.findAll()
      ]);

    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    const subscriptionRows = subscriptions
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map((s) => {
        const owner = userById[s.user_id];
        return {
          id: s.id,
          businessId: s.business_id,
          business: s.business_name,
          userId: s.user_id,
          owner: owner?.name || null,
          ownerEmail: owner?.email || null,
          ownerPhone: owner?.phone || null,
          plan: s.plan,
          amount: s.amount,
          amountPaise: s.amount_paise,
          currency: s.currency || "INR",
          features: s.features,
          payment: s.payment_status,
          paymentStatus: s.payment_status,
          renews: s.renews_on,
          renewsOn: s.renews_on,
          paidAt: s.paid_at,
          createdAt: s.created_at,
          invoice: s.invoice_ref,
          invoiceRef: s.invoice_ref,
          razorpayOrderId: s.razorpay_order_id,
          razorpayPaymentId: s.razorpay_payment_id
        };
      });

    const paidSubs = subscriptions.filter((s) => s.payment_status === "Paid");
    const pendingSubs = subscriptions.filter((s) => s.payment_status === "Pending");

    return {
      users: users.map(User.toPublic),
      businesses: businesses.filter((b) => b.status === "Approved").map(Business.toPublic),
      allBusinesses: businesses.map(Business.toPublic),
      listings: listings.map(Listing.toPublic),
      subscriptions: subscriptionRows,
      paymentStats: {
        total: subscriptions.length,
        paid: paidSubs.length,
        pending: pendingSubs.length,
        revenuePaise: paidSubs.reduce((sum, s) => sum + (s.amount_paise || 0), 0)
      },
      leads: leads.map((l) => ({
        id: l.id,
        business: l.business_name,
        type: l.type,
        phone: l.phone,
        owner: l.owner_name,
        visitor: l.visitor_label,
        city: l.city,
        time: l.event_time,
        status: l.status
      })),
      ads: ads.map((a) => ({
        id: a.id,
        title: a.title,
        position: a.position,
        size: a.size,
        city: a.city,
        expiry: a.expiry,
        price: a.price,
        media: a.media_type,
        mediaUrl: a.media_url,
        impressions: String(a.impressions),
        clicks: String(a.clicks),
        status: a.status
      })),
      adEvents: adEvents.map((e) => ({
        id: e.id,
        adId: e.ad_id,
        title: e.title,
        type: e.type,
        position: e.position,
        city: e.city,
        time: e.event_time
      })),
      testimonials: testimonials.map((t) => ({
        id: t.id,
        name: t.name,
        city: t.city,
        quote: t.quote,
        status: t.status
      })),
      communities: communities.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        category: c.category,
        admin: c.admin_name,
        members: c.member_count,
        status: c.status,
        description: c.description
      })),
      communityMembers: communityMembers.map((m) => ({
        id: m.id,
        communityId: m.community_id,
        community: m.community_name,
        business: m.business_name,
        owner: m.owner_name,
        phone: m.phone,
        city: m.city,
        role: m.role,
        status: m.status,
        joined: m.joined_at
      })),
      communityPosts: communityPosts.map((p) => ({
        id: p.id,
        communityId: p.community_id,
        community: p.community_name,
        author: p.author_name,
        business: p.business_name,
        message: p.message,
        time: p.post_time,
        status: p.status
      })),
      kycStats: {
        queue: (await KycApplication.countQueue()),
        submitted: (await KycApplication.countByStatus("submitted")),
        resubmit: (await KycApplication.countByStatus("resubmit_required"))
      },
      businessOfferings: businessOfferings.map((o) => ({
        id: o.id,
        business: o.business_name,
        type: o.type,
        title: o.title,
        price: o.price,
        discount: o.discount,
        couponCode: o.coupon_code,
        validUntil: o.valid_until,
        description: o.description,
        status: o.status
      }))
    };
  },

  async patchEntity(table, id, body) {
    const models = {
      users: User,
      listings: Listing,
      businesses: Business,
      subscriptions: Subscription,
      leads: Lead,
      ads: Ad,
      adEvents: AdEvent,
      testimonials: Testimonial,
      communities: Community,
      communityMembers: CommunityMember,
      communityPosts: CommunityPost,
      businessOfferings: Offering
    };
    const model = models[table];
    if (!model) throw Object.assign(new Error("Unknown collection"), { statusCode: 400 });

    if (table === "listings" && body.status === "Approved") {
      const listing = await Listing.findById(id);
      if (listing) {
        await kycService.assertOwnerKycApprovedForListing(listing.business_id);
        await Business.update(listing.business_id, { status: "Approved", is_verified: 1 });
        await Listing.update(id, { verification: "Verified" });
      }
    }
    if (table === "listings" && body.status === "Rejected") {
      const listing = await Listing.findById(id);
      if (listing) {
        await Business.update(listing.business_id, { status: "Rejected" });
      }
    }

    const fieldMap = {
      users: { name: "name", email: "email", role: "role", phone: "phone", city: "city", status: "status" },
      listings: { status: "status", plan: "plan", verification: "verification" },
      businesses: { status: "status", is_verified: "is_verified", plan: "plan" },
      subscriptions: { payment_status: "payment", plan: "plan" },
      leads: { status: "status" },
      ads: { status: "status", title: "title", city: "city" },
      testimonials: { status: "status", quote: "quote" },
      communities: { status: "status", member_count: "members" },
      communityMembers: { status: "status", role: "role" },
      communityPosts: { status: "status" },
      businessOfferings: { status: "status", title: "title" }
    };

    const updates = {};
    const mapping = fieldMap[table] || {};
    for (const [key, col] of Object.entries(mapping)) {
      if (body[key] !== undefined) updates[col] = body[key];
    }
    if (table === "users") return User.toPublic(await User.update(id, updates));
    if (table === "listings") return Listing.toPublic(await Listing.update(id, updates));
    if (table === "businesses") return Business.toPublic(await Business.update(id, updates));

    const updated = await model.update(id, updates);

    if (table === "communityMembers" && body.status) {
      const member = updated || (await CommunityMember.findById(id));
      if (member?.community_id) await communityService.syncMemberCount(member.community_id);
    }

    return updated;
  },

  async deleteEntity(table, id) {
    const models = {
      users: User,
      listings: Listing,
      businesses: Business,
      subscriptions: Subscription,
      leads: Lead,
      ads: Ad,
      adEvents: AdEvent,
      testimonials: Testimonial,
      communities: Community,
      communityMembers: CommunityMember,
      communityPosts: CommunityPost,
      businessOfferings: Offering
    };
    const model = models[table];
    if (!model) throw Object.assign(new Error("Unknown collection"), { statusCode: 400 });

    let communityId = null;
    if (table === "communityMembers") {
      const member = await CommunityMember.findById(id);
      communityId = member?.community_id;
    }

    await model.delete(id);

    if (communityId) await communityService.syncMemberCount(communityId);

    return { ok: true };
  }
};

module.exports = adminService;
