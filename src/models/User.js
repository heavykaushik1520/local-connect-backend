const db = require("../config/db");

const User = {
  toPublic(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      city: row.city,
      status: row.status,
      joined: row.joined_at,
      listings: row.listings_count
    };
  },

  async findById(id) {
    const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const rows = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const rows = await db.query("SELECT * FROM users WHERE phone = ?", [phone]);
    return rows[0] || null;
  },

  async findByIdOrPhone(identifier) {
    const rows = await db.query(
      "SELECT * FROM users WHERE id = ? OR phone = ? LIMIT 1",
      [identifier, identifier]
    );
    return rows[0] || null;
  },

  async findByLoginIdentifier(identifier) {
    const value = String(identifier || "").trim();
    if (!value) return null;
    const rows = await db.query(
      "SELECT * FROM users WHERE id = ? OR email = ? OR phone = ? LIMIT 1",
      [value, value, value]
    );
    return rows[0] || null;
  },

  async findAll(filters = {}) {
    let sql = "SELECT * FROM users WHERE 1=1";
    const params = [];

    if (filters.role) {
      sql += " AND role = ?";
      params.push(filters.role);
    }
    if (filters.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }
    if (filters.q) {
      const like = `%${filters.q}%`;
      sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR id LIKE ?)";
      params.push(like, like, like, like);
    }

    sql += " ORDER BY created_at DESC";
    return db.query(sql, params);
  },

  async create(data) {
    await db.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role, city, status, listings_count, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.email || null,
        data.phone || null,
        data.password_hash,
        data.role || "business_owner",
        data.city || null,
        data.status || "Active",
        data.listings_count || 0,
        data.joined_at || new Date().toISOString().slice(0, 10)
      ]
    );
    return this.findById(data.id);
  },

  async update(id, fields) {
    const allowed = ["name", "email", "phone", "role", "city", "status", "listings_count", "password_hash"];
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
    await db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await db.query("DELETE FROM users WHERE id = ?", [id]);
  }
};

module.exports = User;
