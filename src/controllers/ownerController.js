const businessService = require("../services/businessService");
const { success, created } = require("../utils/apiResponse");

const ownerController = {
  async workspace(req, res) {
    const workspace = await businessService.getOwnerWorkspace(req.user.id, req.user.phone);
    return success(res, workspace);
  },

  async analytics(req, res) {
    const businessId = req.query.businessId;
    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }
    const analytics = await businessService.getOwnerAnalytics(req.user, businessId);
    return success(res, analytics);
  },

  async updateBusiness(req, res) {
    const business = await businessService.updateOwnerBusiness(req.params.id, req.user, req.body);
    return success(res, business);
  },

  async createOffering(req, res) {
    const offering = await businessService.createOffering(req.user, req.body);
    return created(res, offering);
  },

  async updateOffering(req, res) {
    const offering = await businessService.updateOffering(req.params.id, req.user, req.body);
    return success(res, offering);
  },

  async deleteOffering(req, res) {
    const result = await businessService.deleteOffering(req.params.id, req.user);
    return success(res, result);
  }
};

module.exports = ownerController;
