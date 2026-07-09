/** Plan tier limits — keep in sync with frontend/src/utils/planLimits.js */
const PLAN_LIMITS = {
  Free: {
    maxPhotos: 1,
    maxOfferings: 2,
    leadDashboard: false,
    analytics: false,
    featuredTopSlots: 0
  },
  Premium: {
    maxPhotos: 8,
    maxOfferings: 10,
    leadDashboard: true,
    analytics: true,
    featuredTopSlots: 0
  },
  Featured: {
    maxPhotos: 20,
    maxOfferings: null,
    leadDashboard: true,
    analytics: true,
    featuredTopSlots: 3
  }
};

const PLAN_RANK = { Free: 0, Premium: 1, Featured: 2 };

const FEATURED_TOP_SLOTS = 3;

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
}

function countBusinessPhotos(business) {
  let count = business.logo_url || business.logoUrl ? 1 : 0;
  const gallery = parseGallery(business.gallery_urls ?? business.galleryUrls);
  count += gallery.length;
  return count;
}

function parseGallery(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function maxOfferingsForPlan(plan) {
  const limit = getPlanLimits(plan).maxOfferings;
  return limit == null ? Infinity : limit;
}

function maxPhotosForPlan(plan) {
  return getPlanLimits(plan).maxPhotos;
}

function canAccessAnalytics(plan) {
  return Boolean(getPlanLimits(plan).analytics);
}

function canAccessLeadDashboard(plan) {
  return Boolean(getPlanLimits(plan).leadDashboard);
}

function assertOfferingLimit(plan, currentActiveCount) {
  const max = maxOfferingsForPlan(plan);
  if (currentActiveCount >= max) {
    throw Object.assign(
      new Error(`Your ${plan} plan allows up to ${max} offerings. Upgrade to add more.`),
      { statusCode: 403, code: "PLAN_LIMIT_OFFERINGS" }
    );
  }
}

function assertPhotoLimit(plan, photoCount) {
  const max = maxPhotosForPlan(plan);
  if (photoCount > max) {
    throw Object.assign(
      new Error(`Your ${plan} plan allows up to ${max} photo${max === 1 ? "" : "s"}. Upgrade to add more.`),
      { statusCode: 403, code: "PLAN_LIMIT_PHOTOS" }
    );
  }
}

function planUsageForBusiness(business, activeOfferingCount) {
  const plan = business.plan || business.premium || "Free";
  const limits = getPlanLimits(plan);
  const photosUsed = countBusinessPhotos(business);
  return {
    plan,
    limits: {
      maxPhotos: limits.maxPhotos,
      maxOfferings: limits.maxOfferings,
      leadDashboard: limits.leadDashboard,
      analytics: limits.analytics,
      featuredTopSlots: limits.featuredTopSlots
    },
    usage: {
      photos: photosUsed,
      offerings: activeOfferingCount
    }
  };
}

module.exports = {
  PLAN_LIMITS,
  PLAN_RANK,
  FEATURED_TOP_SLOTS,
  getPlanLimits,
  parseGallery,
  countBusinessPhotos,
  maxOfferingsForPlan,
  maxPhotosForPlan,
  canAccessAnalytics,
  canAccessLeadDashboard,
  assertOfferingLimit,
  assertPhotoLimit,
  planUsageForBusiness
};
