/**
 * Razorpay payment columns on subscriptions table.
 * Usage: node scripts/migrate-payments.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

const columns = [
  "ADD COLUMN user_id VARCHAR(20) NULL AFTER business_name",
  "ADD COLUMN razorpay_order_id VARCHAR(64) NULL",
  "ADD COLUMN razorpay_payment_id VARCHAR(64) NULL",
  "ADD COLUMN razorpay_signature VARCHAR(128) NULL",
  "ADD COLUMN currency VARCHAR(3) DEFAULT 'INR'",
  "ADD COLUMN amount_paise INT NULL",
  "ADD COLUMN paid_at DATETIME NULL"
];

async function addColumn(sql) {
  try {
    await db.query(`ALTER TABLE subscriptions ${sql}`);
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

  try {
    await db.query(
      "CREATE INDEX idx_sub_razorpay_order ON subscriptions (razorpay_order_id)"
    );
    console.log("OK: index idx_sub_razorpay_order");
  } catch (err) {
    if (err.code === "ER_DUP_KEYNAME") {
      console.log("Skip (exists): idx_sub_razorpay_order");
    } else {
      throw err;
    }
  }

  console.log("subscriptions payment columns ready.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
