/**
 * One-time setup: creates or resets the default admin user.
 * Run: node scripts/create-admin.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const ADMIN = {
  id: "USR-1005",
  name: "Platform Owner",
  email: process.env.ADMIN_EMAIL || "admin@indialocalconnect.local",
  phone: "+91 90000 00001",
  role: "super_admin",
  city: "India",
  password: process.env.ADMIN_PASSWORD || "Admin@123"
};

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ilc_db"
  });

  const hash = await bcrypt.hash(ADMIN.password, 10);
  const [rows] = await conn.query("SELECT id FROM users WHERE email = ?", [ADMIN.email]);

  if (rows.length) {
    await conn.query("UPDATE users SET password_hash = ?, role = 'super_admin', status = 'Active' WHERE email = ?", [
      hash,
      ADMIN.email
    ]);
    console.log(`Admin password reset for ${ADMIN.email}`);
  } else {
    await conn.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role, city, status, listings_count, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 0, CURDATE())`,
      [ADMIN.id, ADMIN.name, ADMIN.email, ADMIN.phone, hash, ADMIN.role, ADMIN.city]
    );
    console.log(`Admin created: ${ADMIN.email}`);
  }

  console.log(`Password: ${ADMIN.password}`);
  await conn.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
