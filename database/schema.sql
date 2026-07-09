-- Reference schema only. Run manually in MySQL Workbench / CLI.
-- Indexes use IF NOT EXISTS pattern where supported; re-run safe on fresh DB.

CREATE DATABASE IF NOT EXISTS ilc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ilc_db;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('business_owner', 'city_admin', 'super_admin', 'customer') NOT NULL DEFAULT 'business_owner',
  city VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
  listings_count INT NOT NULL DEFAULT 0,
  joined_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(20),
  phone VARCHAR(30) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100),
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  is_open TINYINT(1) NOT NULL DEFAULT 1,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  plan ENUM('Free', 'Premium', 'Featured') NOT NULL DEFAULT 'Free',
  hours VARCHAR(100),
  initials VARCHAR(5),
  logo_url TEXT,
  gallery_urls JSON NULL,
  view_count INT NOT NULL DEFAULT 0,
  description TEXT,
  map_url TEXT,
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(20) PRIMARY KEY,
  business_id VARCHAR(20) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  plan ENUM('Free', 'Premium', 'Featured') NOT NULL DEFAULT 'Free',
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  verification VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(20) PRIMARY KEY,
  business_id VARCHAR(20) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(20) NULL,
  plan ENUM('Free', 'Premium', 'Featured') NOT NULL,
  amount VARCHAR(50),
  amount_paise INT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  features TEXT,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  razorpay_order_id VARCHAR(64) NULL,
  razorpay_payment_id VARCHAR(64) NULL,
  razorpay_signature VARCHAR(128) NULL,
  renews_on DATE,
  paid_at DATETIME NULL,
  invoice_ref VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_sub_razorpay_order (razorpay_order_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(20) PRIMARY KEY,
  business_id VARCHAR(20),
  business_name VARCHAR(255) NOT NULL,
  type ENUM('Call', 'WhatsApp', 'Direction') NOT NULL,
  phone VARCHAR(30),
  owner_name VARCHAR(255),
  visitor_label VARCHAR(255),
  city VARCHAR(100),
  event_time VARCHAR(50),
  status VARCHAR(50) DEFAULT 'New',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ads (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  position VARCHAR(50) NOT NULL,
  size VARCHAR(20),
  city VARCHAR(100),
  expiry DATE,
  price VARCHAR(50),
  media_type VARCHAR(20) DEFAULT 'Image',
  media_url TEXT,
  target_url TEXT,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_events (
  id VARCHAR(50) PRIMARY KEY,
  ad_id VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  type ENUM('Impression', 'Click') NOT NULL,
  position VARCHAR(50),
  city VARCHAR(100),
  event_time VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS testimonials (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  quote TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communities (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  admin_name VARCHAR(255),
  member_count INT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Active',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_members (
  id VARCHAR(20) PRIMARY KEY,
  community_id VARCHAR(20) NOT NULL,
  community_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(100),
  role VARCHAR(50) DEFAULT 'Member',
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  joined_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  INDEX idx_community_members_community (community_id),
  INDEX idx_community_members_status (status),
  INDEX idx_community_members_phone (phone)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id VARCHAR(20) PRIMARY KEY,
  community_id VARCHAR(20) NOT NULL,
  community_name VARCHAR(255) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  message TEXT NOT NULL,
  post_time VARCHAR(50),
  status ENUM('Review', 'Published', 'Rejected') NOT NULL DEFAULT 'Review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  INDEX idx_community_posts_community (community_id),
  INDEX idx_community_posts_status (status)
);

CREATE TABLE IF NOT EXISTS game_unlocks (
  id VARCHAR(24) PRIMARY KEY,
  visitor_key VARCHAR(64) NOT NULL,
  user_id VARCHAR(20),
  business_id VARCHAR(20),
  game_type ENUM('spin', 'memory', 'tap') NOT NULL,
  offering_id VARCHAR(20),
  business_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Deal',
  discount VARCHAR(100),
  coupon_code VARCHAR(50),
  valid_until DATE,
  description TEXT,
  emails_sent TINYINT(1) NOT NULL DEFAULT 0,
  unlocked_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_game_unlocks_visitor (visitor_key),
  INDEX idx_game_unlocks_user (user_id),
  INDEX idx_game_unlocks_business (business_id),
  INDEX idx_game_unlocks_game (game_type)
);

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
  INDEX idx_kyc_reviewed_by (reviewed_by),
  INDEX idx_kyc_status (status),
  INDEX idx_kyc_business (business_id),
  INDEX idx_kyc_submitted (submitted_at)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(100) NOT NULL DEFAULT 'General inquiry',
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_offerings (
  id VARCHAR(20) PRIMARY KEY,
  business_id VARCHAR(20) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  type ENUM('Product', 'Service') NOT NULL,
  title VARCHAR(255) NOT NULL,
  price VARCHAR(100),
  discount VARCHAR(100),
  coupon_code VARCHAR(50),
  valid_until DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
