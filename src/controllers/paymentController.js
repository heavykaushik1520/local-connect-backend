const paymentService = require("../services/paymentService");
const { success, created } = require("../utils/apiResponse");

const paymentController = {
  async createOrder(req, res) {
    const result = await paymentService.createOrder(req.body, req.user);
    return created(res, result);
  },

  async verify(req, res) {
    const result = await paymentService.verifyPayment(req.body, req.user);
    return success(res, result);
  },

  async listForBusiness(req, res) {
    const rows = await paymentService.getBusinessSubscriptions(req.params.businessId, req.user);
    return success(res, rows);
  }
};

module.exports = paymentController;
