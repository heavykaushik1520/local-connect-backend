const businessService = require("../services/businessService");
const { signToken } = require("../utils/jwt");
const { success, created } = require("../utils/apiResponse");

const businessController = {
  async list(req, res) {
    const businesses = await businessService.getPublicBusinesses(req.query);
    return success(res, businesses);
  },

  async getBySlug(req, res) {
    const business = await businessService.getBusinessBySlug(req.params.slug);
    return success(res, business);
  },

  async createListing(req, res) {
    const ownerId = req.user?.role === "business_owner" ? req.user.id : null;
    const result = await businessService.createOwnerListing(req.body, ownerId);
    if (result.isNewOwner && result.user) {
      result.token = signToken({
        id: result.user.id,
        role: result.user.role,
        email: result.user.email
      });
    }
    delete result.isNewOwner;
    return created(res, result);
  }
};

module.exports = businessController;
