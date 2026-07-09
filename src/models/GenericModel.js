const db = require("../config/db");

function createModel(table, idField = "id") {
  return {
    async findAll(orderBy = "created_at DESC") {
      return db.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
    },

    async findWhere(conditions = {}, orderBy = "created_at DESC") {
      const keys = Object.keys(conditions);
      if (!keys.length) return this.findAll(orderBy);
      const where = keys.map((k) => `${k} = ?`).join(" AND ");
      return db.query(
        `SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy}`,
        keys.map((k) => conditions[k])
      );
    },

    async countWhere(conditions = {}) {
      const keys = Object.keys(conditions);
      if (!keys.length) {
        const rows = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
        return rows[0]?.total || 0;
      }
      const where = keys.map((k) => `${k} = ?`).join(" AND ");
      const rows = await db.query(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`, keys.map((k) => conditions[k]));
      return rows[0]?.total || 0;
    },

    async findById(id) {
      const rows = await db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
      return rows[0] || null;
    },

    async create(data) {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => "?").join(", ");
      await db.query(
        `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
        keys.map((k) => data[k])
      );
      return this.findById(data[idField]);
    },

    async update(id, fields) {
      const keys = Object.keys(fields);
      if (!keys.length) return this.findById(id);
      const sets = keys.map((k) => `${k} = ?`).join(", ");
      await db.query(
        `UPDATE ${table} SET ${sets} WHERE ${idField} = ?`,
        [...keys.map((k) => fields[k]), id]
      );
      return this.findById(id);
    },

    async delete(id) {
      await db.query(`DELETE FROM ${table} WHERE ${idField} = ?`, [id]);
    }
  };
}

module.exports = { createModel };
