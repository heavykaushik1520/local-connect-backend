const kycService = require("../services/kycService");
const { success, created } = require("../utils/apiResponse");

const kycController = {
  async getMine(req, res) {
    const data = await kycService.getOwnerStatus(req.user);
    return success(res, data);
  },

  async saveDraft(req, res) {
    const data = await kycService.saveDraft(req.user, req.body);
    return success(res, data);
  },

  async submit(req, res) {
    const data = await kycService.submit(req.user, req.body);
    return created(res, data);
  }
};

module.exports = kycController;
