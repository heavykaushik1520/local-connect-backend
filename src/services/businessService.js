const Business = require("../models/Business");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { createModel } = require("../models/GenericModel");
const { initialsFromName } = require("../utils/idGenerator");
const { hashPassword } = require("../utils/password");
const {
  assertOfferingLimit,
  assertPhotoLimit,
  countBusinessPhotos,
  parseGallery,
  planUsageForBusiness,
  canAccessAnalytics,
  canAccessLeadDashboard
} = require("../config/planLimits");

const Offering = createModel("business_offerings");
const Lead = createModel("leads");

const businessService = {
  async getPublicBusinesses(filters) {
    const rows = await Business.findApproved(filters);
    const allOfferings = await Offering.findAll();
    return rows.map((row) => {
      const pub = Business.toPublic(row);
      if (pub.premium === "Free") pub.galleryUrls = [];
      const active = allOfferings.filter((o) => o.business_id === row.id && o.status === "Active");
      const primary = active.find((o) => o.coupon_code || o.discount) || active[0] || null;
      pub.dealPoints = Math.max(10, Math.round(Number(row.rating) * 10));
      pub.primaryOffer = primary
        ? {
            id: primary.id,
            title: primary.title,
            discount: primary.discount,
            couponCode: primary.coupon_code,
            type: primary.type
          }
        : null;
      return pub;
    });
  },

  async getBusinessBySlug(slug) {
    const row = await Business.findBySlug(slug);
    if (!row || row.status !== "Approved") {
      throw Object.assign(new Error("Business not found"), { statusCode: 404 });
    }
    await Business.incrementViewCount(row.id);
    const refreshed = await Business.findById(row.id);
    const offerings = await Offering.findAll();
    const businessOfferings = offerings
      .filter((o) => o.business_id === refreshed.id && o.status === "Active")
      .map((o) => ({
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
      }));
    const pub = Business.toPublic(refreshed);
    if (pub.premium === "Free") pub.galleryUrls = [];
    const primary = businessOfferings.find((o) => o.couponCode || o.discount) || businessOfferings[0] || null;
    pub.dealPoints = Math.max(10, Math.round(Number(refreshed.rating) * 10));
    pub.primaryOffer = primary;
    return { ...pub, offerings: businessOfferings };
  },

  async createOwnerListing(payload, existingOwnerId = null) {
    const businessId = `BIZ-${Date.now().toString().slice(-6)}`;
    const listingId = `LST-${Date.now().toString().slice(-6)}`;
    let userId = existingOwnerId;
    let ownerUser = null;

    if (userId) {
      ownerUser = await User.findById(userId);
      if (!ownerUser || ownerUser.role !== "business_owner") {
        throw Object.assign(new Error("Invalid owner account"), { statusCode: 403 });
      }
      await User.update(userId, { listings_count: (ownerUser.listings_count || 0) + 1 });
    } else {
      userId = `USR-${Date.now().toString().slice(-6)}`;
      const password_hash = await hashPassword(payload.password || "Password@123");
      ownerUser = await User.create({
        id: userId,
        name: payload.ownerName,
        email: payload.email || null,
        phone: payload.phone,
        password_hash,
        role: "business_owner",
        city: payload.city,
        status: "Pending KYC",
        listings_count: 1
      });
    }

    const requestedPlan = payload.plan || "Free";
    const activePlan = requestedPlan === "Free" ? "Free" : "Free";

    const business = await Business.create({
      id: businessId,
      name: payload.businessName,
      slug: await Business.ensureUniqueSlug(`${payload.businessName}-${payload.city}`),
      category: payload.category,
      owner_name: payload.ownerName || ownerUser.name,
      owner_id: userId,
      phone: payload.phone,
      city: payload.city,
      area: payload.area,
      plan: activePlan,
      hours: payload.hours || "Pending timings",
      initials: initialsFromName(payload.businessName),
      logo_url: payload.logoUrl || null,
      description: payload.description || null,
      map_url: payload.mapUrl || null,
      status: "Pending"
    });

    const listing = await Listing.create({
      id: listingId,
      business_id: businessId,
      business_name: payload.businessName,
      owner_name: payload.ownerName || ownerUser.name,
      city: payload.city,
      plan: activePlan,
      status: "Pending",
      verification: "Phone pending"
    });

    return {
      user: User.toPublic(await User.findById(userId)),
      business: Business.toPublic(business),
      listing: Listing.toPublic(listing),
      pendingPlan: requestedPlan !== "Free" ? requestedPlan : null,
      isNewOwner: !existingOwnerId
    };
  },

  async getOwnerWorkspace(userId, phone) {
    const businesses = await Business.findByOwner(userId, phone);
    const allOfferings = await Offering.findAll();
    const businessPublic = businesses.map((row) => {
      const pub = Business.toPublic(row);
      const activeCount = allOfferings.filter((o) => o.business_id === row.id && o.status === "Active").length;
      pub.planUsage = planUsageForBusiness(row, activeCount);
      return pub;
    });
    return {
      businesses: businessPublic,
      offerings: allOfferings
        .filter((o) => businesses.some((b) => b.id === o.business_id))
        .map((o) => ({
          id: o.id,
          business: o.business_name,
          businessId: o.business_id,
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

  async updateOwnerBusiness(businessId, user, updates) {
    const business = await Business.findById(businessId);
    if (!business) throw Object.assign(new Error("Business not found"), { statusCode: 404 });
    if (business.owner_id !== user.id && business.phone !== user.phone) {
      throw Object.assign(new Error("Not authorized to edit this business"), { statusCode: 403 });
    }
    const fields = {};
    if (updates.name) fields.name = updates.name;
    if (updates.category) fields.category = updates.category;
    if (updates.phone) fields.phone = updates.phone;
    if (updates.city) fields.city = updates.city;
    if (updates.area) fields.area = updates.area;
    if (updates.hours) fields.hours = updates.hours;
    if (updates.description) fields.description = updates.description;
    if (updates.mapUrl) fields.map_url = updates.mapUrl;
    if (updates.logoUrl !== undefined) fields.logo_url = updates.logoUrl;
    if (updates.galleryUrls !== undefined) fields.gallery_urls = updates.galleryUrls;
    if (updates.open !== undefined) fields.is_open = updates.open ? 1 : 0;

    const nextRow = {
      ...business,
      logo_url: fields.logo_url !== undefined ? fields.logo_url : business.logo_url,
      gallery_urls: fields.gallery_urls !== undefined ? fields.gallery_urls : business.gallery_urls
    };
    assertPhotoLimit(business.plan, countBusinessPhotos(nextRow));

    const updated = await Business.update(businessId, fields);
    return Business.toPublic(updated);
  },

  async createOffering(user, payload) {
    const business = await Business.findByName(payload.business) || await Business.findById(payload.businessId);
    if (!business) throw Object.assign(new Error("Business not found"), { statusCode: 404 });
    if (business.owner_id !== user.id) {
      throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    }
    const allOfferings = await Offering.findAll();
    const activeCount = allOfferings.filter((o) => o.business_id === business.id && o.status === "Active").length;
    assertOfferingLimit(business.plan, activeCount);

    const id = `OFR-${Date.now().toString().slice(-6)}`;
    const row = await Offering.create({
      id,
      business_id: business.id,
      business_name: business.name,
      type: payload.type || "Service",
      title: payload.title,
      price: payload.price,
      discount: payload.discount,
      coupon_code: payload.couponCode,
      valid_until: payload.validUntil,
      description: payload.description,
      status: "Active"
    });
    return row;
  },

  async updateOffering(id, user, payload) {
    const offering = await Offering.findById(id);
    if (!offering) throw Object.assign(new Error("Offering not found"), { statusCode: 404 });
    const business = await Business.findById(offering.business_id);
    if (business.owner_id !== user.id) {
      throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    }
    const fields = {};
    const map = {
      title: "title",
      type: "type",
      price: "price",
      discount: "discount",
      couponCode: "coupon_code",
      validUntil: "valid_until",
      description: "description",
      status: "status"
    };
    for (const [k, col] of Object.entries(map)) {
      if (payload[k] !== undefined) fields[col] = payload[k];
    }
    return Offering.update(id, fields);
  },

  async deleteOffering(id, user) {
    const offering = await Offering.findById(id);
    if (!offering) throw Object.assign(new Error("Offering not found"), { statusCode: 404 });
    const business = await Business.findById(offering.business_id);
    if (business.owner_id !== user.id) {
      throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    }
    await Offering.delete(id);
    return { ok: true };
  },

  async getOwnerAnalytics(user, businessId) {
    const businesses = await Business.findByOwner(user.id, user.phone);
    const business = businesses.find((b) => b.id === businessId);
    if (!business) {
      throw Object.assign(new Error("Business not found"), { statusCode: 404 });
    }
    if (!canAccessAnalytics(business.plan)) {
      throw Object.assign(
        new Error("Analytics are available on Premium and Featured plans. Upgrade to unlock."),
        { statusCode: 403, code: "PLAN_ANALYTICS_LOCKED" }
      );
    }

    const allLeads = await Lead.findAll();
    const leads = allLeads
      .filter((l) => l.business_id === businessId)
      .map((l) => ({
        id: l.id,
        type: l.type,
        visitor: l.visitor_label,
        city: l.city,
        time: l.event_time,
        status: l.status
      }))
      .sort((a, b) => String(b.time).localeCompare(String(a.time)));

    const leadBreakdown = leads.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});

    const allOfferings = await Offering.findAll();
    const activeOfferings = allOfferings.filter((o) => o.business_id === businessId && o.status === "Active").length;

    return {
      businessId,
      businessName: business.name,
      plan: business.plan,
      views: business.view_count || 0,
      leads: {
        total: leads.length,
        breakdown: leadBreakdown,
        recent: leads.slice(0, 20)
      },
      planUsage: planUsageForBusiness(business, activeOfferings),
      hasLeadDashboard: canAccessLeadDashboard(business.plan)
    };
  }
};

module.exports = businessService;
