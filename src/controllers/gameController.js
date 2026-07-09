const gameService = require("../services/gameService");
const { success, created, error } = require("../utils/apiResponse");

const gameController = {
  async hub(req, res) {
    const businessId = req.query.businessId || req.query.business || "";
    const data = await gameService.getHub(req.user || null, businessId || null);
    return success(res, data);
  },

  async claim(req, res) {
    if (!req.user) {
      return error(res, "Login required to claim coupons", 401);
    }
    const { gameType, businessId } = req.body;
    if (!gameType || !businessId) {
      return error(res, "gameType and businessId are required", 400);
    }
    const offer = await gameService.claimReward(req.user, gameType, businessId);
    return created(res, { offer });
  }
};

module.exports = gameController;
