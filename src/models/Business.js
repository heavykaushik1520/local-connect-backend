const db = require("../config/db");
const { parseGallery } = require("../config/planLimits");
const { slugify } = require("../utils/idGenerator");

const Business = {
  toPublic(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      owner: row.owner_name,
      ownerId: row.owner_id,
      phone: row.phone,
      city: row.city,
      area: row.area,
      rating: Number(row.rating),
      reviews: row.review_count,
      open: Boolean(row.is_open),
      verified: Boolean(row.is_verified),
      premium: row.plan,
      hours: row.hours,
      initials: row.initials,
      logoUrl: row.logo_url,
      galleryUrls: parseGallery(row.gallery_urls),
      viewCount: row.view_count || 0,
      description: row.description,
      mapUrl: row.map_url,
      status: row.status
    };
  },

  async findById(id) {
    const rows = await db.query("SELECT * FROM businesses WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const rows = await db.query("SELECT * FROM businesses WHERE slug = ?", [slug]);
    return rows[0] || null;
  },

  async ensureUniqueSlug(baseText, excludeId = null) {
    let base = slugify(baseText);
    if (!base) base = `business-${Date.now()}`;

    let slug = base;
    let suffix = 2;
    while (true) {
      const existing = await this.findBySlug(slug);
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      slug = `${base}-${suffix}`;
      suffix += 1;
      if (suffix > 99) {
        return `${base}-${Date.now().toString().slice(-6)}`;
      }
    }
  },

  async findByName(name) {
    const rows = await db.query("SELECT * FROM businesses WHERE name = ?", [name]);
    return rows[0] || null;
  },

  async findApproved(filters = {}) {
    let sql = "SELECT * FROM businesses WHERE status = 'Approved'";
    const params = [];
    if (filters.city) {
      sql += " AND city = ?";
      params.push(filters.city);
    }
    if (filters.area) {
      sql += " AND area = ?";
      params.push(filters.area);
    }
    if (filters.category) {
      sql += " AND category = ?";
      params.push(filters.category);
    }
    if (filters.q) {
      sql += " AND (name LIKE ? OR category LIKE ? OR area LIKE ? OR city LIKE ?)";
      const term = `%${filters.q}%`;
      params.push(term, term, term, term);
    }
    if (filters.open === "true") sql += " AND is_open = 1";
    if (filters.verified === "true") sql += " AND is_verified = 1";
    if (filters.premium) {
      sql += " AND plan = ?";
      params.push(filters.premium);
    }
    sql += ` ORDER BY FIELD(plan, 'Featured', 'Premium', 'Free'), is_verified DESC, rating DESC, review_count DESC`;
    return db.query(sql, params);
  },

  async findAll() {
    return db.query("SELECT * FROM businesses ORDER BY created_at DESC");
  },

  async findByOwner(ownerId, phone) {
    if (ownerId) {
      return db.query("SELECT * FROM businesses WHERE owner_id = ?", [ownerId]);
    }
    if (phone) {
      return db.query("SELECT * FROM businesses WHERE phone = ?", [phone]);
    }
    return [];
  },

  async create(data) {
    const galleryJson = data.gallery_urls
      ? JSON.stringify(data.gallery_urls)
      : data.galleryUrls
        ? JSON.stringify(data.galleryUrls)
        : null;
    await db.query(
      `INSERT INTO businesses
       (id, name, slug, category, owner_name, owner_id, phone, city, area, rating, review_count,
        is_open, is_verified, plan, hours, initials, logo_url, gallery_urls, view_count, description, map_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.slug,
        data.category,
        data.owner_name,
        data.owner_id || null,
        data.phone,
        data.city,
        data.area || null,
        data.rating || 0,
        data.review_count || 0,
        data.is_open !== undefined ? data.is_open : 1,
        data.is_verified || 0,
        data.plan || "Free",
        data.hours || null,
        data.initials || null,
        data.logo_url || null,
        galleryJson,
        data.view_count || 0,
        data.description || null,
        data.map_url || null,
        data.status || "Pending"
      ]
    );
    return this.findById(data.id);
  },

  async update(id, fields) {
    const map = {
      name: "name",
      slug: "slug",
      category: "category",
      owner_name: "owner_name",
      owner_id: "owner_id",
      phone: "phone",
      city: "city",
      area: "area",
      rating: "rating",
      review_count: "review_count",
      is_open: "is_open",
      is_verified: "is_verified",
      plan: "plan",
      hours: "hours",
      initials: "initials",
      logo_url: "logo_url",
      gallery_urls: "gallery_urls",
      view_count: "view_count",
      description: "description",
      map_url: "map_url",
      status: "status"
    };
    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(map)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        if (key === "gallery_urls" && fields[key] != null && typeof fields[key] !== "string") {
          values.push(JSON.stringify(fields[key]));
        } else {
          values.push(fields[key]);
        }
      }
    }
    if (!sets.length) return this.findById(id);
    values.push(id);
    await db.query(`UPDATE businesses SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  },

  async incrementViewCount(id) {
    await db.query("UPDATE businesses SET view_count = view_count + 1 WHERE id = ?", [id]);
  },

  async delete(id) {
    await db.query("DELETE FROM businesses WHERE id = ?", [id]);
  }
};

module.exports = Business;
