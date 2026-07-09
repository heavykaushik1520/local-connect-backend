/**
 * Coupon workflow: customer role, user_id + emails_sent on game_unlocks.
 * Usage: node scripts/migrate-coupon-workflow.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

async function tryQuery(sql, okMsg, dupCodes = ["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"]) {
  try {
    await db.query(sql);
    console.log(okMsg);
  } catch (err) {
    if (dupCodes.includes(err.code)) console.log(`${okMsg} (already applied)`);
    else throw err;
  }
}

async function migrate() {
  await tryQuery(
    "ALTER TABLE users MODIFY role ENUM('business_owner', 'city_admin', 'super_admin', 'customer') NOT NULL DEFAULT 'business_owner'",
    "Added customer role to users.role"
  );

  await tryQuery(
    "ALTER TABLE game_unlocks ADD COLUMN user_id VARCHAR(20) NULL AFTER visitor_key",
    "Added game_unlocks.user_id"
  );

  await tryQuery(
    "ALTER TABLE game_unlocks ADD COLUMN emails_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER description",
    "Added game_unlocks.emails_sent"
  );

  await tryQuery(
    "CREATE INDEX idx_game_unlocks_user ON game_unlocks (user_id)",
    "Added idx_game_unlocks_user"
  );

  console.log("Coupon workflow migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
