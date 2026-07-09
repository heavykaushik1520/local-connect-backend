const userService = require("../services/userService");
const { success, created, error } = require("../utils/apiResponse");

const userController = {
  async list(req, res) {
    const users = await userService.list({
      role: req.query.role,
      status: req.query.status,
      q: req.query.q
    });
    return success(res, { users });
  },

  async getById(req, res) {
    const user = await userService.getById(req.params.id);
    return success(res, { user });
  },

  async create(req, res) {
    const { name, email, phone, password, role, city, status } = req.body;
    if (!name || !password) {
      return error(res, "Name and password are required");
    }
    const user = await userService.create(req.user, { name, email, phone, password, role, city, status });
    return created(res, { user });
  },

  async update(req, res) {
    const user = await userService.update(req.user, req.params.id, req.body);
    return success(res, { user });
  },

  async remove(req, res) {
    const result = await userService.remove(req.user, req.params.id);
    return success(res, result);
  },

  async resetPassword(req, res) {
    const { newPassword } = req.body;
    if (!newPassword) return error(res, "New password is required");
    const result = await userService.resetPassword(req.user, req.params.id, newPassword);
    return success(res, result);
  }
};

module.exports = userController;
