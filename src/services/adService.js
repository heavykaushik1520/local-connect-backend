const { createModel } = require("../models/GenericModel");
const db = require("../config/db");

const Ad = createModel("ads");
const AdEvent = createModel("ad_events");

const adService = {
  async getActiveAds(position, city) {
    let sql = "SELECT * FROM ads WHERE status = 'Active' AND (expiry IS NULL OR expiry >= CURDATE())";
    const params = [];
    if (position) {
      sql += " AND position = ?";
      params.push(position);
    }
    const normalizedCity = city && city !== "undefined" && city !== "null" ? city : null;
    if (normalizedCity) {
      sql += " AND (city = ? OR city = 'India')";
      params.push(normalizedCity);
    }
    const rows = await db.query(sql, params);
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      position: a.position,
      size: a.size,
      city: a.city,
      media: a.media_type || "Image",
      mediaUrl: a.media_url,
      targetUrl: a.target_url
    }));
  },

  async createAd(payload) {
    const id = `ADS-${Date.now().toString().slice(-6)}`;
    return Ad.create({
      id,
      title: payload.title,
      position: payload.position,
      size: payload.size,
      city: payload.city,
      expiry: payload.expiry,
      price: payload.price,
      media_type: payload.media || "Image",
      media_url: payload.mediaUrl || null,
      target_url: payload.targetUrl || null,
      impressions: 0,
      clicks: 0,
      status: "Active"
    });
  },

  async recordEvent(adId, type) {
    const ad = await Ad.findById(adId);
    if (!ad) throw Object.assign(new Error("Ad not found"), { statusCode: 404 });
    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await AdEvent.create({
      id: eventId,
      ad_id: adId,
      title: ad.title,
      type,
      position: ad.position,
      city: ad.city,
      event_time: new Date().toLocaleString("en-IN")
    });
    if (type === "Impression") {
      await db.query("UPDATE ads SET impressions = impressions + 1 WHERE id = ?", [adId]);
    } else {
      await db.query("UPDATE ads SET clicks = clicks + 1 WHERE id = ?", [adId]);
    }
    return { ok: true };
  }
};

module.exports = adService;
