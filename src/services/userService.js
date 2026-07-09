const User = require("../models/User");
const { hashPassword } = require("../utils/password");

const ROLES = ["business_owner", "city_admin", "super_admin", "customer"];
const STATUSES = ["Active", "Suspended", "Inactive", "Pending KYC"];
const BLOCKED_STATUSES = new Set(["Suspended", "Inactive", "Banned"]);

function validatePassword(password) {
  if (!password || password.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters"), { statusCode: 400 });
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase() || null;
}

function normalizePhone(phone) {
  return String(phone || "").trim() || null;
}

async function assertUniqueEmail(email, excludeId = null) {
  if (!email) return;
  const existing = await User.findByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  }
}

async function assertUniquePhone(phone, excludeId = null) {
  if (!phone) return;
  const existing = await User.findByPhone(phone);
  if (existing && existing.id !== excludeId) {
    throw Object.assign(new Error("Phone number already in use"), { statusCode: 409 });
  }
}

function assertRole(role) {
  if (!ROLES.includes(role)) {
    throw Object.assign(new Error(`Invalid role. Allowed: ${ROLES.join(", ")}`), { statusCode: 400 });
  }
}

function assertStatus(status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error(`Invalid status. Allowed: ${STATUSES.join(", ")}`), { statusCode: 400 });
  }
}

function canManageRole(actor, targetRole, newRole = targetRole) {
  if (actor.role === "super_admin") return true;
  if (actor.role === "city_admin") {
    return targetRole === "business_owner" && newRole === "business_owner";
  }
  return false;
}

function assertCanModifyUser(actor, target) {
  if (actor.role === "super_admin") return;
  if (actor.role === "city_admin") {
    if (target.role !== "business_owner") {
      throw Object.assign(new Error("City admins can only manage business owners"), { statusCode: 403 });
    }
    return;
  }
  throw Object.assign(new Error("Insufficient permissions"), { statusCode: 403 });
}

const userService = {
  ROLES,
  STATUSES,
  BLOCKED_STATUSES,

  async list(filters = {}) {
    const rows = await User.findAll({
      role: filters.role || undefined,
      status: filters.status || undefined,
      q: filters.q?.trim() || undefined
    });
    return rows.map(User.toPublic);
  },

  async getById(id) {
    const user = await User.findById(id);
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
    return User.toPublic(user);
  },

  async create(actor, payload) {
    const name = payload.name?.trim();
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const role = payload.role || "business_owner";
    const status = payload.status || "Active";

    if (!name) throw Object.assign(new Error("Name is required"), { statusCode: 400 });
    if (!email && !phone) {
      throw Object.assign(new Error("Email or phone is required"), { statusCode: 400 });
    }

    assertRole(role);
    assertStatus(status);
    validatePassword(payload.password);

    if (!canManageRole(actor, role, role)) {
      throw Object.assign(new Error("You cannot create users with this role"), { statusCode: 403 });
    }

    await assertUniqueEmail(email);
    await assertUniquePhone(phone);

    const id = `USR-${Date.now().toString().slice(-6)}`;
    const password_hash = await hashPassword(payload.password);

    const user = await User.create({
      id,
      name,
      email,
      phone,
      password_hash,
      role,
      city: payload.city?.trim() || null,
      status,
      listings_count: 0
    });

    return User.toPublic(user);
  },

  async update(actor, id, payload) {
    const target = await User.findById(id);
    if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    assertCanModifyUser(actor, target);

    const updates = {};

    if (payload.name !== undefined) {
      const name = payload.name?.trim();
      if (!name) throw Object.assign(new Error("Name cannot be empty"), { statusCode: 400 });
      updates.name = name;
    }

    if (payload.email !== undefined) {
      const email = normalizeEmail(payload.email);
      await assertUniqueEmail(email, id);
      updates.email = email;
    }

    if (payload.phone !== undefined) {
      const phone = normalizePhone(payload.phone);
      await assertUniquePhone(phone, id);
      updates.phone = phone;
    }

    if (payload.city !== undefined) {
      updates.city = payload.city?.trim() || null;
    }

    if (payload.status !== undefined) {
      assertStatus(payload.status);
      updates.status = payload.status;
    }

    if (payload.role !== undefined) {
      assertRole(payload.role);
      if (!canManageRole(actor, target.role, payload.role)) {
        throw Object.assign(new Error("You cannot assign this role"), { statusCode: 403 });
      }
      updates.role = payload.role;
    }

    const updated = await User.update(id, updates);
    return User.toPublic(updated);
  },

  async remove(actor, id) {
    if (actor.id === id) {
      throw Object.assign(new Error("You cannot delete your own account"), { statusCode: 400 });
    }

    const target = await User.findById(id);
    if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    assertCanModifyUser(actor, target);
    await User.delete(id);
    return { ok: true };
  },

  async resetPassword(actor, id, newPassword) {
    const target = await User.findById(id);
    if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    assertCanModifyUser(actor, target);
    validatePassword(newPassword);

    const password_hash = await hashPassword(newPassword);
    await User.update(id, { password_hash });
    return { ok: true };
  },

  async updateProfile(userId, payload) {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    const updates = {};

    if (payload.name !== undefined) {
      const name = payload.name?.trim();
      if (!name) throw Object.assign(new Error("Name cannot be empty"), { statusCode: 400 });
      updates.name = name;
    }

    if (payload.email !== undefined) {
      const email = normalizeEmail(payload.email);
      if (!email) throw Object.assign(new Error("Email is required"), { statusCode: 400 });
      await assertUniqueEmail(email, userId);
      updates.email = email;
    }

    if (payload.phone !== undefined) {
      const phone = normalizePhone(payload.phone);
      if (!phone) throw Object.assign(new Error("Phone is required"), { statusCode: 400 });
      await assertUniquePhone(phone, userId);
      updates.phone = phone;
    }

    if (payload.city !== undefined) {
      updates.city = payload.city?.trim() || null;
    }

    if (!Object.keys(updates).length) {
      return User.toPublic(user);
    }

    const updated = await User.update(userId, updates);
    return User.toPublic(updated);
  },

  assertLoginAllowed(user) {
    if (BLOCKED_STATUSES.has(user.status)) {
      throw Object.assign(
        new Error(`Account is ${user.status.toLowerCase()}. Contact support.`),
        { statusCode: 403 }
      );
    }
  }
};

module.exports = userService;
