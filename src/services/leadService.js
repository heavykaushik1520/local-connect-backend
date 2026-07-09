const { createModel } = require("../models/GenericModel");

const Lead = createModel("leads");

const leadService = {
  async createLead(payload) {
    const id = `LED-${Date.now().toString().slice(-6)}`;
    const row = await Lead.create({
      id,
      business_id: payload.businessId || null,
      business_name: payload.business,
      type: payload.type,
      phone: payload.phone,
      owner_name: payload.owner,
      visitor_label: payload.visitor,
      city: payload.city,
      event_time: payload.time || new Date().toLocaleString("en-IN"),
      status: "New"
    });
    return {
      id: row.id,
      business: row.business_name,
      type: row.type,
      status: row.status
    };
  }
};

module.exports = leadService;
