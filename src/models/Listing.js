const db = require("../config/db");

const Listing = {
  toPublic(row) {
    return {
      id: row.id,
      business: row.business_name,
      businessId: row.business_id,
      owner: row.owner_name,
      city: row.city,
      plan: row.plan,
      status: row.status,
      verification: row.verification
    };
  },

  async findAll() {
    return db.query("SELECT * FROM listings ORDER BY created_at DESC");
  },

  async findById(id) {
    const rows = await db.query("SELECT * FROM listings WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async findByBusinessId(businessId) {
    return db.query("SELECT * FROM listings WHERE business_id = ?", [businessId]);
  },

  async create(data) {
    await db.query(
      `INSERT INTO listings (id, business_id, business_name, owner_name, city, plan, status, verification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.business_id,
        data.business_name,
        data.owner_name,
        data.city,
        data.plan || "Free",
        data.status || "Pending",
        data.verification || "Pending"
      ]
    );
    return this.findById(data.id);
  },

  async update(id, fields) {
    const allowed = ["business_name", "owner_name", "city", "plan", "status", "verification"];
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
    await db.query(`UPDATE listings SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await db.query("DELETE FROM listings WHERE id = ?", [id]);
  }
};

module.exports = Listing;
