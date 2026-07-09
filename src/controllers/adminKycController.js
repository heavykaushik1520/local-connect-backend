const kycService = require("../services/kycService");
const { success } = require("../utils/apiResponse");

const adminKycController = {
  async list(req, res) {
    const { status, city, q, queue } = req.query;
    const applications = await kycService.listForAdmin(req.user, {
      status: status || undefined,
      city: city || undefined,
      q: q?.trim() || undefined,
      queue: queue === "true"
    });
    return success(res, { applications });
  },

  async stats(req, res) {
    const stats = await kycService.getStats(req.user);
    return success(res, stats);
  },

  async getById(req, res) {
    const application = await kycService.getByIdForAdmin(req.user, req.params.id);
    return success(res, application);
  },

  async review(req, res) {
    const { action, notes, rejectionReason } = req.body;
    const result = await kycService.review(req.user, req.params.id, {
      action,
      notes,
      rejectionReason
    });
    return success(res, result);
  }
};

module.exports = adminKycController;
