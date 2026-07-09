/**
 * KYC applications table for owner identity verification.
 * Usage: node scripts/migrate-kyc.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS kyc_applications (
      id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      business_id VARCHAR(20) NULL,
      owner_name VARCHAR(255) NOT NULL,
      business_name VARCHAR(255) NULL,
      city VARCHAR(100) NULL,
      phone VARCHAR(30) NOT NULL,
      pan_number VARCHAR(20) NULL,
      aadhaar_last4 VARCHAR(4) NULL,
      gstin VARCHAR(20) NULL,
      legal_business_name VARCHAR(255) NULL,
      aadhaar_doc_url TEXT NULL,
      pan_doc_url TEXT NULL,
      shop_photo_url TEXT NULL,
      gst_doc_url TEXT NULL,
      shop_license_url TEXT NULL,
      owner_photo_url TEXT NULL,
      status ENUM('draft', 'submitted', 'approved', 'rejected', 'resubmit_required') NOT NULL DEFAULT 'draft',
      rejection_reason TEXT NULL,
      admin_notes TEXT NULL,
      reviewed_by VARCHAR(20) NULL,
      reviewed_at DATETIME NULL,
      submitted_at DATETIME NULL,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kyc_user (user_id),
      INDEX idx_kyc_status (status),
      INDEX idx_kyc_business (business_id),
      INDEX idx_kyc_submitted (submitted_at),
      INDEX idx_kyc_reviewed_by (reviewed_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  try {
    await db.query(
      "ALTER TABLE kyc_applications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
    );
    console.log("kyc_applications collation aligned with users table.");
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") throw err;
  }

  console.log("kyc_applications table ready.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
