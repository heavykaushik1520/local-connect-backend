-- Plan gating: gallery photos + listing view analytics
-- Run once on existing databases after deploying plan-gating update.

USE ilc_db;

ALTER TABLE businesses
  ADD COLUMN gallery_urls JSON NULL AFTER logo_url;

ALTER TABLE businesses
  ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER gallery_urls;
