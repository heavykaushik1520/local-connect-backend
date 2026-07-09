const authService = require("../services/authService");
const User = require("../models/User");
const { success, created, error } = require("../utils/apiResponse");

const authController = {
  async login(req, res) {
    const { email, customerId, phone, identifier, password } = req.body;
    const loginId = identifier || email || customerId || phone;
    if (!password || !loginId) {
      return error(res, "Email, phone, or Customer ID and password are required");
    }
    const result = await authService.login({ identifier: loginId, password });
    return success(res, result);
  },

  async register(req, res) {
    const { name, email, phone, password, city } = req.body;
    if (!name || !email || !phone || !password) {
      return error(res, "Name, email, phone, and password are required");
    }
    const result = await authService.registerOwner({ name, email, phone, password, city });
    return created(res, result);
  },

  async registerCustomer(req, res) {
    const { name, email, phone, password, city } = req.body;
    if (!name || !email || !phone || !password) {
      return error(res, "Name, email, phone, and password are required");
    }
    const result = await authService.registerCustomer({ name, email, phone, password, city });
    return created(res, result);
  },

  async me(req, res) {
    const user = await User.findById(req.user.id);
    return success(res, { user: User.toPublic(user) });
  },

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return error(res, "Current and new password are required");
    }
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    return success(res, result);
  },

  async updateProfile(req, res) {
    const { name, email, phone, city } = req.body;
    const user = await authService.updateProfile(req.user.id, { name, email, phone, city });
    return success(res, { user });
  }
};

module.exports = authController;
