const User = require("../models/User");
const userService = require("./userService");
const { comparePassword, hashPassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");

function validatePassword(password) {
  if (!password || password.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters"), { statusCode: 400 });
  }
}

const authService = {
  async login({ email, customerId, phone, identifier, password }) {
    validatePassword(password);

    let user = null;
    const loginId = identifier || email || customerId || phone;

    if (loginId) {
      user = await User.findByLoginIdentifier(loginId);
    }

    if (!user) throw Object.assign(new Error("Invalid email, phone, or password"), { statusCode: 401 });

    userService.assertLoginAllowed(user);

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) throw Object.assign(new Error("Invalid email, phone, or password"), { statusCode: 401 });

    const publicUser = User.toPublic(user);
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    return { user: publicUser, token };
  },

  async registerCustomer({ name, email, phone, password, city }) {
    validatePassword(password);

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();

    if (!name?.trim()) {
      throw Object.assign(new Error("Name is required"), { statusCode: 400 });
    }
    if (!normalizedEmail) {
      throw Object.assign(new Error("Email is required for coupon delivery"), { statusCode: 400 });
    }
    if (!normalizedPhone) {
      throw Object.assign(new Error("Phone number is required"), { statusCode: 400 });
    }

    const existingEmail = await User.findByEmail(normalizedEmail);
    if (existingEmail) throw Object.assign(new Error("Email already registered"), { statusCode: 409 });

    const existingPhone = await User.findByPhone(normalizedPhone);
    if (existingPhone) throw Object.assign(new Error("Phone number already registered"), { statusCode: 409 });

    const id = `USR-${Date.now().toString().slice(-6)}`;
    const password_hash = await hashPassword(password);

    const user = await User.create({
      id,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash,
      role: "customer",
      city: city?.trim() || null,
      status: "Active",
      listings_count: 0
    });

    const publicUser = User.toPublic(user);
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return {
      user: publicUser,
      token,
      message: "Account created. You can now play games and receive coupons by email."
    };
  },

  async registerOwner({ name, email, phone, password, city }) {
    validatePassword(password);

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();

    if (!name?.trim()) {
      throw Object.assign(new Error("Name is required"), { statusCode: 400 });
    }
    if (!normalizedEmail) {
      throw Object.assign(new Error("Email is required"), { statusCode: 400 });
    }
    if (!normalizedPhone) {
      throw Object.assign(new Error("Phone number is required"), { statusCode: 400 });
    }

    const existingEmail = await User.findByEmail(normalizedEmail);
    if (existingEmail) throw Object.assign(new Error("Email already registered"), { statusCode: 409 });

    const existingPhone = await User.findByPhone(normalizedPhone);
    if (existingPhone) throw Object.assign(new Error("Phone number already registered"), { statusCode: 409 });

    const id = `USR-${Date.now().toString().slice(-6)}`;
    const password_hash = await hashPassword(password);

    const user = await User.create({
      id,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash,
      role: "business_owner",
      city: city?.trim() || null,
      status: "Pending KYC",
      listings_count: 0
    });

    const publicUser = User.toPublic(user);
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return {
      user: publicUser,
      token,
      message: `Account created. Complete KYC verification in your owner dashboard to get fully activated.`
    };
  },

  async changePassword(userId, currentPassword, newPassword) {
    validatePassword(newPassword);
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) throw Object.assign(new Error("Current password is incorrect"), { statusCode: 400 });
    const password_hash = await hashPassword(newPassword);
    await User.update(userId, { password_hash });
    return { ok: true };
  },

  async updateProfile(userId, payload) {
    return userService.updateProfile(userId, payload);
  }
};

module.exports = authService;
