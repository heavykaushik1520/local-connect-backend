/**
 * Plan gating columns on businesses table (gallery_urls, view_count).
 * Usage: node scripts/migrate-plan-gating.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

const columns = [
  "ADD COLUMN gallery_urls JSON NULL AFTER logo_url",
  "ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER gallery_urls"
];

async function addColumn(sql) {
  try {
    await db.query(`ALTER TABLE businesses ${sql}`);
    console.log(`OK: ${sql.split(" ")[2]}`);
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log(`Skip (exists): ${sql.split(" ")[2]}`);
    } else {
      throw err;
    }
  }
}

async function migrate() {
  for (const col of columns) {
    await addColumn(col);
  }
  console.log("businesses plan-gating columns ready.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
