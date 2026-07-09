const db = require("../config/db");

const EDITABLE_STATUSES = new Set(["draft", "resubmit_required", "rejected"]);

// users/businesses may use utf8mb4_0900_ai_ci while kyc_applications used utf8mb4_unicode_ci
const JOIN_COLLATE = "utf8mb4_0900_ai_ci";
const USER_JOIN = `u.id COLLATE ${JOIN_COLLATE} = k.user_id COLLATE ${JOIN_COLLATE}`;
const REVIEWER_JOIN = `r.id COLLATE ${JOIN_COLLATE} = k.reviewed_by COLLATE ${JOIN_COLLATE}`;

function toPublic(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    businessId: row.business_id,
    ownerName: row.owner_name,
    businessName: row.business_name,
    city: row.city,
    phone: row.phone,
    panNumber: row.pan_number,
    aadhaarLast4: row.aadhaar_last4,
    gstin: row.gstin,
    legalBusinessName: row.legal_business_name,
    aadhaarDocUrl: row.aadhaar_doc_url,
    panDocUrl: row.pan_doc_url,
    shopPhotoUrl: row.shop_photo_url,
    gstDocUrl: row.gst_doc_url,
    shopLicenseUrl: row.shop_license_url,
    ownerPhotoUrl: row.owner_photo_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    adminNotes: row.admin_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    submittedAt: row.submitted_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userEmail: row.user_email || extras.userEmail || null,
    userStatus: row.user_status || extras.userStatus || null,
    reviewedByName: row.reviewed_by_name || extras.reviewedByName || null
  };
}

const KycApplication = {
  EDITABLE_STATUSES,
  toPublic,

  async findById(id) {
    const rows = await db.query(
      `SELECT k.*, u.email AS user_email, u.status AS user_status,
              r.name AS reviewed_by_name
       FROM kyc_applications k
       LEFT JOIN users u ON ${USER_JOIN}
       LEFT JOIN users r ON ${REVIEWER_JOIN}
       WHERE k.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findLatestByUserId(userId) {
    const rows = await db.query(
      `SELECT k.*, u.email AS user_email, u.status AS user_status
       FROM kyc_applications k
       LEFT JOIN users u ON ${USER_JOIN}
       WHERE k.user_id COLLATE ${JOIN_COLLATE} = ?
       ORDER BY k.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async findForAdmin(filters = {}) {
    let sql = `
      SELECT k.*, u.email AS user_email, u.status AS user_status,
             r.name AS reviewed_by_name
      FROM kyc_applications k
      LEFT JOIN users u ON ${USER_JOIN}
      LEFT JOIN users r ON ${REVIEWER_JOIN}
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      sql += " AND k.status = ?";
      params.push(filters.status);
    }
    if (filters.city) {
      sql += " AND k.city = ?";
      params.push(filters.city);
    }
    if (filters.q) {
      sql += ` AND (
        k.owner_name LIKE ? OR k.business_name LIKE ? OR k.phone LIKE ?
        OR k.pan_number LIKE ? OR k.id LIKE ? OR u.email LIKE ?
      )`;
      const like = `%${filters.q}%`;
      params.push(like, like, like, like, like, like);
    }
    if (filters.queue) {
      sql += " AND k.status IN ('submitted', 'resubmit_required')";
    }

    sql += " ORDER BY FIELD(k.status, 'submitted', 'resubmit_required', 'draft', 'rejected', 'approved'), k.submitted_at DESC, k.updated_at DESC";

    return db.query(sql, params);
  },

  async countByStatus(status) {
    const rows = await db.query(
      "SELECT COUNT(*) AS total FROM kyc_applications WHERE status = ?",
      [status]
    );
    return rows[0]?.total || 0;
  },

  async countQueue() {
    const rows = await db.query(
      "SELECT COUNT(*) AS total FROM kyc_applications WHERE status IN ('submitted', 'resubmit_required')"
    );
    return rows[0]?.total || 0;
  },

  async create(data) {
    await db.query(
      `INSERT INTO kyc_applications (
        id, user_id, business_id, owner_name, business_name, city, phone,
        pan_number, aadhaar_last4, gstin, legal_business_name,
        aadhaar_doc_url, pan_doc_url, shop_photo_url, gst_doc_url,
        shop_license_url, owner_photo_url, status, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.user_id,
        data.business_id || null,
        data.owner_name,
        data.business_name || null,
        data.city || null,
        data.phone,
        data.pan_number || null,
        data.aadhaar_last4 || null,
        data.gstin || null,
        data.legal_business_name || null,
        data.aadhaar_doc_url || null,
        data.pan_doc_url || null,
        data.shop_photo_url || null,
        data.gst_doc_url || null,
        data.shop_license_url || null,
        data.owner_photo_url || null,
        data.status || "draft",
        data.version || 1
      ]
    );
    return this.findById(data.id);
  },

  async update(id, fields) {
    const allowed = [
      "business_id", "owner_name", "business_name", "city", "phone",
      "pan_number", "aadhaar_last4", "gstin", "legal_business_name",
      "aadhaar_doc_url", "pan_doc_url", "shop_photo_url", "gst_doc_url",
      "shop_license_url", "owner_photo_url", "status", "rejection_reason",
      "admin_notes", "reviewed_by", "reviewed_at", "submitted_at", "version"
    ];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (!sets.length) return this.findById(id);
    values.push(id);
    await db.query(`UPDATE kyc_applications SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }
};

module.exports = KycApplication;
