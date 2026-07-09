const adminService = require("../services/adminService");
const { createModel } = require("../models/GenericModel");
const communityService = require("../services/communityService");
const adService = require("../services/adService");
const businessService = require("../services/businessService");
const { success, created } = require("../utils/apiResponse");

const Testimonial = createModel("testimonials");
const Offering = createModel("business_offerings");

const adminController = {
  async dashboard(req, res) {
    const data = await adminService.getDashboardData();
    return success(res, data);
  },

  async patch(req, res) {
    const result = await adminService.patchEntity(req.params.table, req.params.id, req.body);
    return success(res, result);
  },

  async remove(req, res) {
    const result = await adminService.deleteEntity(req.params.table, req.params.id);
    return success(res, result);
  },

  async createTestimonial(req, res) {
    const id = `TST-${Date.now().toString().slice(-6)}`;
    const row = await Testimonial.create({
      id,
      name: req.body.name,
      city: req.body.city,
      quote: req.body.quote,
      status: "Published"
    });
    return created(res, row);
  },

  async createCommunity(req, res) {
    const row = await communityService.createCommunity(req.body);
    return created(res, row);
  },

  async createAd(req, res) {
    const row = await adService.createAd(req.body);
    return created(res, row);
  },

  async createOffering(req, res) {
    const id = `OFR-${Date.now().toString().slice(-6)}`;
    const row = await Offering.create({
      id,
      business_id: req.body.businessId,
      business_name: req.body.business,
      type: req.body.type || "Service",
      title: req.body.title,
      price: req.body.price,
      discount: req.body.discount,
      coupon_code: req.body.couponCode,
      valid_until: req.body.validUntil,
      description: req.body.description,
      status: "Active"
    });
    return created(res, row);
  }
};

module.exports = adminController;
