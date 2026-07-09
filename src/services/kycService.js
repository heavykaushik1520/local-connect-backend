const KycApplication = require("../models/KycApplication");
const User = require("../models/User");
const Business = require("../models/Business");
const Listing = require("../models/Listing");
const db = require("../config/db");

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const AADHAAR_LAST4_REGEX = /^[0-9]{4}$/;

const REQUIRED_DOCS = ["aadhaarDocUrl", "panDocUrl"];

function normalizePan(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeGstin(value) {
  const v = String(value || "").trim().toUpperCase();
  return v || null;
}

function buildChecklist(application) {
  const app = application ? KycApplication.toPublic(application) : null;
  return {
    panNumber: Boolean(app?.panNumber),
    aadhaarLast4: Boolean(app?.aadhaarLast4),
    aadhaarDoc: Boolean(app?.aadhaarDocUrl),
    panDoc: Boolean(app?.panDocUrl),
    shopPhoto: Boolean(app?.shopPhotoUrl),
    gstDoc: Boolean(app?.gstin ? app?.gstDocUrl : true),
    optionalGstSkipped: !app?.gstin
  };
}

function completionPercent(checklist) {
  const items = [
    checklist.panNumber,
    checklist.aadhaarLast4,
    checklist.aadhaarDoc,
    checklist.panDoc,
    checklist.gstDoc
  ];
  const done = items.filter(Boolean).length;
  return Math.round((done / items.length) * 100);
}

function assertOwnerRole(user) {
  if (!user || (user.role !== "business_owner" && user.role !== "super_admin")) {
    throw Object.assign(new Error("Only business owners can manage KYC"), { statusCode: 403 });
  }
}

function assertEditable(application) {
  if (!application) return;
  if (application.status === "approved") {
    throw Object.assign(new Error("KYC is already approved"), { statusCode: 409 });
  }
  if (application.status === "submitted") {
    throw Object.assign(new Error("KYC is under admin review. Wait for a decision before editing."), {
      statusCode: 409
    });
  }
}

function validateSubmitPayload(payload) {
  const pan = normalizePan(payload.panNumber);
  const aadhaarLast4 = String(payload.aadhaarLast4 || "").trim();
  const gstin = normalizeGstin(payload.gstin);

  if (!pan || !PAN_REGEX.test(pan)) {
    throw Object.assign(new Error("Valid PAN number is required (e.g. ABCDE1234F)"), { statusCode: 400 });
  }
  if (!AADHAAR_LAST4_REGEX.test(aadhaarLast4)) {
    throw Object.assign(new Error("Enter last 4 digits of Aadhaar"), { statusCode: 400 });
  }
  if (gstin && !GSTIN_REGEX.test(gstin)) {
    throw Object.assign(new Error("Invalid GSTIN format"), { statusCode: 400 });
  }

  for (const field of REQUIRED_DOCS) {
    if (!payload[field]) {
      throw Object.assign(new Error(`Missing required document: ${field}`), { statusCode: 400 });
    }
  }
  if (gstin && !payload.gstDocUrl) {
    throw Object.assign(new Error("GST certificate is required when GSTIN is provided"), { statusCode: 400 });
  }

  return { pan, aadhaarLast4, gstin };
}

function mapPayloadToDb(payload, user, business) {
  return {
    business_id: payload.businessId || business?.id || null,
    owner_name: payload.ownerName?.trim() || user.name,
    business_name: payload.businessName?.trim() || business?.name || null,
    city: payload.city?.trim() || user.city || business?.city || null,
    phone: payload.phone?.trim() || user.phone,
    pan_number: payload.panNumber ? normalizePan(payload.panNumber) : null,
    aadhaar_last4: payload.aadhaarLast4 ? String(payload.aadhaarLast4).trim() : null,
    gstin: normalizeGstin(payload.gstin),
    legal_business_name: payload.legalBusinessName?.trim() || null,
    aadhaar_doc_url: payload.aadhaarDocUrl || null,
    pan_doc_url: payload.panDocUrl || null,
    shop_photo_url: payload.shopPhotoUrl || null,
    gst_doc_url: payload.gstDocUrl || null,
    shop_license_url: payload.shopLicenseUrl || null,
    owner_photo_url: payload.ownerPhotoUrl || null
  };
}

async function activateOwnerAfterKyc(userId) {
  await User.update(userId, { status: "Active" });

  const businesses = await Business.findByOwner(userId);
  for (const business of businesses) {
    const updates = { is_verified: 1 };
    if (business.status === "Pending") updates.status = "Approved";
    await Business.update(business.id, updates);

    const listings = await db.query("SELECT * FROM listings WHERE business_id = ?", [business.id]);
    for (const listing of listings) {
      const listingUpdates = { verification: "Verified" };
      if (listing.status === "Pending") listingUpdates.status = "Approved";
      await Listing.update(listing.id, listingUpdates);
    }
  }
}

function assertAdminCanAccessKyc(admin, application) {
  if (admin.role === "super_admin") return;
  if (admin.role === "city_admin") {
    const adminCity = (admin.city || "").trim().toLowerCase();
    const appCity = (application.city || "").trim().toLowerCase();
    if (adminCity && appCity && adminCity !== appCity) {
      throw Object.assign(new Error("You can only review KYC for your assigned city"), { statusCode: 403 });
    }
    return;
  }
  throw Object.assign(new Error("Insufficient permissions"), { statusCode: 403 });
}

const kycService = {
  async getOwnerStatus(user) {
    assertOwnerRole(user);
    const fullUser = await User.findById(user.id);
    const application = await KycApplication.findLatestByUserId(user.id);
    const businesses = await Business.findByOwner(user.id, user.phone);
    const primaryBusiness = businesses[0] || null;
    const checklist = buildChecklist(application);
    const pub = application ? KycApplication.toPublic(application) : null;

    return {
      userStatus: fullUser?.status || user.status,
      kycRequired: fullUser?.role === "business_owner" && application?.status !== "approved",
      application: pub,
      canEdit: !application || KycApplication.EDITABLE_STATUSES.has(application.status),
      canSubmit: !application || ["draft", "resubmit_required", "rejected"].includes(application.status),
      checklist,
      completionPercent: completionPercent(checklist),
      primaryBusiness: primaryBusiness ? Business.toPublic(primaryBusiness) : null,
      businesses: businesses.map(Business.toPublic)
    };
  },

  async saveDraft(user, payload) {
    assertOwnerRole(user);
    const businesses = await Business.findByOwner(user.id, user.phone);
    const business =
      businesses.find((b) => b.id === payload.businessId) || businesses[0] || null;

    let application = await KycApplication.findLatestByUserId(user.id);
    assertEditable(application);

    const dbFields = mapPayloadToDb(payload, user, business);

    if (!application) {
      const id = `KYC-${Date.now().toString().slice(-8)}`;
      application = await KycApplication.create({
        id,
        user_id: user.id,
        status: "draft",
        version: 1,
        ...dbFields
      });
    } else {
      application = await KycApplication.update(application.id, dbFields);
    }

    if (user.status === "Pending KYC") {
      await User.update(user.id, { status: "Pending KYC" });
    }

    return this.getOwnerStatus({ ...user, status: user.status });
  },

  async submit(user, payload) {
    assertOwnerRole(user);
    const validated = validateSubmitPayload(payload);
    const businesses = await Business.findByOwner(user.id, user.phone);
    const business =
      businesses.find((b) => b.id === payload.businessId) || businesses[0] || null;

    let application = await KycApplication.findLatestByUserId(user.id);
    assertEditable(application);

    const dbFields = {
      ...mapPayloadToDb({ ...payload, ...validated, panNumber: validated.pan, aadhaarLast4: validated.aadhaarLast4, gstin: validated.gstin }, user, business),
      status: "submitted",
      submitted_at: new Date(),
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null
    };

    if (!application) {
      const id = `KYC-${Date.now().toString().slice(-8)}`;
      application = await KycApplication.create({
        id,
        user_id: user.id,
        version: 1,
        ...dbFields
      });
    } else {
      const version =
        (application.version || 1) +
        (["resubmit_required", "rejected"].includes(application.status) ? 1 : 0);
      application = await KycApplication.update(application.id, { ...dbFields, version });
    }

    await User.update(user.id, { status: "Pending KYC" });

    return {
      message: "KYC submitted for admin review. You will be notified once verified.",
      application: KycApplication.toPublic(application)
    };
  },

  async listForAdmin(admin, filters = {}) {
    const scoped = { ...filters };
    if (admin.role === "city_admin" && admin.city) {
      scoped.city = admin.city;
    }
    const rows = await KycApplication.findForAdmin(scoped);
    return rows.map((row) => KycApplication.toPublic(row));
  },

  async getStats(admin) {
    const filters = admin.role === "city_admin" && admin.city ? { city: admin.city } : {};
    const rows = await KycApplication.findForAdmin(filters);
    const pending = rows.filter((r) => r.status === "submitted").length;
    const resubmit = rows.filter((r) => r.status === "resubmit_required").length;
    return {
      pending,
      resubmit,
      queue: pending + resubmit,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length
    };
  },

  async getByIdForAdmin(admin, id) {
    const application = await KycApplication.findById(id);
    if (!application) throw Object.assign(new Error("KYC application not found"), { statusCode: 404 });
    assertAdminCanAccessKyc(admin, application);
    return KycApplication.toPublic(application);
  },

  async review(admin, id, { action, notes, rejectionReason }) {
    const application = await KycApplication.findById(id);
    if (!application) throw Object.assign(new Error("KYC application not found"), { statusCode: 404 });
    assertAdminCanAccessKyc(admin, application);

    if (!["approve", "reject", "request_resubmit"].includes(action)) {
      throw Object.assign(new Error("Invalid review action"), { statusCode: 400 });
    }
    if (application.status !== "submitted" && application.status !== "resubmit_required") {
      throw Object.assign(
        new Error(`Cannot review application in status: ${application.status}`),
        { statusCode: 409 }
      );
    }

    const now = new Date();
    const baseUpdate = {
      reviewed_by: admin.id,
      reviewed_at: now,
      admin_notes: notes?.trim() || null
    };

    if (action === "approve") {
      await KycApplication.update(id, {
        ...baseUpdate,
        status: "approved",
        rejection_reason: null
      });
      await activateOwnerAfterKyc(application.user_id);
      return {
        message: "KYC approved. Owner activated and listings marked verified.",
        application: KycApplication.toPublic(await KycApplication.findById(id))
      };
    }

    if (action === "reject") {
      if (!rejectionReason?.trim()) {
        throw Object.assign(new Error("Rejection reason is required"), { statusCode: 400 });
      }
      await KycApplication.update(id, {
        ...baseUpdate,
        status: "rejected",
        rejection_reason: rejectionReason.trim()
      });
      await User.update(application.user_id, { status: "Pending KYC" });
      return {
        message: "KYC rejected.",
        application: KycApplication.toPublic(await KycApplication.findById(id))
      };
    }

    if (!rejectionReason?.trim()) {
      throw Object.assign(new Error("Please specify what the owner must resubmit"), { statusCode: 400 });
    }
    await KycApplication.update(id, {
      ...baseUpdate,
      status: "resubmit_required",
      rejection_reason: rejectionReason.trim()
    });
    await User.update(application.user_id, { status: "Pending KYC" });
    return {
      message: "Resubmission requested from owner.",
      application: KycApplication.toPublic(await KycApplication.findById(id))
    };
  },

  async assertOwnerKycApprovedForListing(businessId) {
    const business = await Business.findById(businessId);
    if (!business?.owner_id) return;

    const application = await KycApplication.findLatestByUserId(business.owner_id);
    if (!application || application.status !== "approved") {
      throw Object.assign(
        new Error("Owner KYC must be approved before publishing this listing"),
        { statusCode: 409 }
      );
    }
  },

  async isOwnerKycApproved(userId) {
    const application = await KycApplication.findLatestByUserId(userId);
    return Boolean(application && application.status === "approved");
  }
};

module.exports = kycService;
