const communityService = require("../services/communityService");
const { success, created } = require("../utils/apiResponse");

const communityController = {
  async list(req, res) {
    const { city, category, q } = req.query;
    const data = await communityService.getCommunities({ city, category, q });
    return success(res, data);
  },

  async getById(req, res) {
    const data = await communityService.getCommunityById(req.params.id, req.user || null);
    return success(res, data);
  },

  async join(req, res) {
    const member = await communityService.joinCommunity(req.body, req.user || null);
    return created(res, member);
  },

  async createPost(req, res) {
    const post = await communityService.createPost(req.body, req.user || null);
    return created(res, post);
  }
};

module.exports = communityController;
