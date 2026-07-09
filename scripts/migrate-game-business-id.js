/**
 * Add business_id to game_unlocks for existing databases.
 * Usage: node scripts/migrate-game-business-id.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

async function migrate() {
  try {
    await db.query(
      "ALTER TABLE game_unlocks ADD COLUMN business_id VARCHAR(20) NULL AFTER visitor_key"
    );
    console.log("Added business_id column.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("business_id column already exists.");
    } else {
      throw err;
    }
  }

  try {
    await db.query("CREATE INDEX idx_game_unlocks_business ON game_unlocks (business_id)");
    console.log("Added business_id index.");
  } catch (err) {
    if (err.code === "ER_DUP_KEYNAME") {
      console.log("Index already exists.");
    } else {
      throw err;
    }
  }

  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
