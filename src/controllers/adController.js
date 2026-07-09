const adService = require("../services/adService");
const { success } = require("../utils/apiResponse");

const adController = {
  async serve(req, res) {
    const ads = await adService.getActiveAds(req.query.position, req.query.city);
    return success(res, ads);
  },

  async recordEvent(req, res) {
    const type = req.body.type === "Click" ? "Click" : "Impression";
    const result = await adService.recordEvent(req.params.id, type);
    return success(res, result);
  }
};

module.exports = adController;
