const contactService = require("../services/contactService");
const { created, error } = require("../utils/apiResponse");

const contactController = {
  async create(req, res) {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return error(res, "Name, email, and message are required");
    }
    const result = await contactService.createMessage({ name, email, phone, subject, message });
    return created(res, result);
  }
};

module.exports = contactController;
