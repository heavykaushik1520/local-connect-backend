const db = require("../config/db");
const { createModel } = require("../models/GenericModel");

const Community = createModel("communities");
const CommunityMember = createModel("community_members");
const CommunityPost = createModel("community_posts");

function mapCommunity(c) {
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    category: c.category,
    admin: c.admin_name,
    members: c.member_count,
    status: c.status,
    description: c.description
  };
}

function mapMember(m) {
  return {
    id: m.id,
    business: m.business_name,
    owner: m.owner_name,
    role: m.role,
    joined: m.joined_at
  };
}

function mapPost(p) {
  return {
    id: p.id,
    author: p.author_name,
    business: p.business_name,
    message: p.message,
    time: p.post_time
  };
}

function requireFields(payload, fields) {
  const missing = fields.filter((f) => !String(payload[f] ?? "").trim());
  if (missing.length) {
    throw Object.assign(new Error(`Missing required fields: ${missing.join(", ")}`), { statusCode: 400 });
  }
}

const communityService = {
  async getCommunities(filters = {}) {
    const { city, category, q } = filters;
    let sql = "SELECT * FROM communities WHERE status = 'Active'";
    const params = [];

    if (city) {
      sql += " AND city = ?";
      params.push(city);
    }
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (q) {
      sql += " AND (name LIKE ? OR description LIKE ? OR city LIKE ?)";
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY member_count DESC, name ASC";
    const rows = await db.query(sql, params);
    const communities = rows.map(mapCommunity);

    const metaRows = await db.query(
      "SELECT DISTINCT city, category FROM communities WHERE status = 'Active' ORDER BY city, category"
    );
    const cities = [...new Set(metaRows.map((r) => r.city).filter(Boolean))];
    const categories = [...new Set(metaRows.map((r) => r.category).filter(Boolean))];

    return { communities, meta: { cities, categories, total: communities.length } };
  },

  async getCommunityById(id, viewer = null) {
    const community = await Community.findById(id);
    if (!community) throw Object.assign(new Error("Community not found"), { statusCode: 404 });
    if (community.status !== "Active") {
      throw Object.assign(new Error("Community is not available"), { statusCode: 404 });
    }

    const [members, posts] = await Promise.all([
      CommunityMember.findWhere({ community_id: id, status: "Approved" }, "joined_at DESC"),
      CommunityPost.findWhere({ community_id: id, status: "Published" }, "created_at DESC")
    ]);

    let membership = null;
    const phone = viewer?.phone?.trim();
    if (phone) {
      const rows = await db.query(
        "SELECT id, status, role FROM community_members WHERE community_id = ? AND phone = ? ORDER BY created_at DESC LIMIT 1",
        [id, phone]
      );
      if (rows[0]) {
        membership = { id: rows[0].id, status: rows[0].status, role: rows[0].role };
      }
    }

    return {
      community: mapCommunity(community),
      members: members.map(mapMember),
      posts: posts.map(mapPost),
      membership
    };
  },

  async syncMemberCount(communityId) {
    const count = await CommunityMember.countWhere({ community_id: communityId, status: "Approved" });
    await Community.update(communityId, { member_count: count });
    return count;
  },

  async joinCommunity(payload, viewer = null) {
    requireFields(payload, ["communityId", "owner"]);

    const community = await Community.findById(payload.communityId);
    if (!community || community.status !== "Active") {
      throw Object.assign(new Error("Community not found or inactive"), { statusCode: 404 });
    }

    const owner = String(payload.owner).trim();
    const phone = String(payload.phone || viewer?.phone || "").trim();
    const city = String(payload.city || viewer?.city || community.city).trim();
    const business = String(payload.business || "").trim();

    if (!phone) {
      throw Object.assign(new Error("Phone number is required to join"), { statusCode: 400 });
    }

    const existing = await db.query(
      "SELECT id, status FROM community_members WHERE community_id = ? AND phone = ? AND status IN ('Pending', 'Approved') LIMIT 1",
      [payload.communityId, phone]
    );
    if (existing[0]) {
      const label = existing[0].status === "Approved" ? "already a member" : "pending admin review";
      throw Object.assign(new Error(`You are ${label} of this community`), { statusCode: 409 });
    }

    const id = `CMB-${Date.now().toString().slice(-6)}`;
    const row = await CommunityMember.create({
      id,
      community_id: payload.communityId,
      community_name: community.name,
      business_name: business || null,
      owner_name: owner,
      phone,
      city,
      role: "Member",
      status: "Pending",
      joined_at: new Date().toISOString().slice(0, 10)
    });

    return {
      id: row.id,
      communityId: row.community_id,
      community: row.community_name,
      business: row.business_name,
      owner: row.owner_name,
      status: row.status
    };
  },

  async createPost(payload, viewer = null) {
    requireFields(payload, ["communityId", "message"]);

    const community = await Community.findById(payload.communityId);
    if (!community || community.status !== "Active") {
      throw Object.assign(new Error("Community not found or inactive"), { statusCode: 404 });
    }

    const author = String(payload.author || viewer?.name || "").trim();
    if (!author) {
      throw Object.assign(new Error("Author name is required"), { statusCode: 400 });
    }

    const phone = String(payload.phone || viewer?.phone || "").trim();
    if (!phone) {
      throw Object.assign(new Error("Phone number is required to post discussions"), { statusCode: 400 });
    }

    const approved = await db.query(
      "SELECT id FROM community_members WHERE community_id = ? AND phone = ? AND status = 'Approved' LIMIT 1",
      [payload.communityId, phone]
    );
    if (!approved[0]) {
      throw Object.assign(
        new Error("Only approved community members can start discussions. Request to join first."),
        { statusCode: 403 }
      );
    }

    const message = String(payload.message).trim();
    if (message.length < 10) {
      throw Object.assign(new Error("Message must be at least 10 characters"), { statusCode: 400 });
    }

    const id = `CPO-${Date.now().toString().slice(-6)}`;
    const row = await CommunityPost.create({
      id,
      community_id: payload.communityId,
      community_name: community.name,
      author_name: author,
      business_name: String(payload.business || "").trim() || null,
      message,
      post_time: payload.time || "Just now",
      status: "Review"
    });

    return {
      id: row.id,
      communityId: row.community_id,
      author: row.author_name,
      message: row.message,
      status: row.status
    };
  },

  async createCommunity(payload) {
    requireFields(payload, ["name", "city"]);

    const id = `COM-${Date.now().toString().slice(-6)}`;
    const row = await Community.create({
      id,
      name: String(payload.name).trim(),
      city: String(payload.city).trim(),
      category: payload.category ? String(payload.category).trim() : null,
      admin_name: payload.admin ? String(payload.admin).trim() : null,
      member_count: Number(payload.members) || 0,
      status: payload.status || "Active",
      description: payload.description ? String(payload.description).trim() : null
    });
    return mapCommunity(row);
  }
};

module.exports = communityService;
