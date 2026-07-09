const leadService = require("../services/leadService");
const { created } = require("../utils/apiResponse");

const leadController = {
  async create(req, res) {
    const lead = await leadService.createLead(req.body);
    return created(res, lead);
  }
};

module.exports = leadController;
