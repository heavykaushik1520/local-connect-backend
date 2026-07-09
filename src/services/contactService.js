const { createModel } = require("../models/GenericModel");

const Contact = createModel("contact_messages");

const SUBJECTS = ["Listing support", "Advertisement packages", "City partnership", "General inquiry"];

const contactService = {
  SUBJECTS,

  async createMessage(payload) {
    const name = payload.name?.trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const message = payload.message?.trim();
    const subject = payload.subject?.trim() || "General inquiry";

    if (!name) throw Object.assign(new Error("Name is required"), { statusCode: 400 });
    if (!email) throw Object.assign(new Error("Email is required"), { statusCode: 400 });
    if (!message) throw Object.assign(new Error("Message is required"), { statusCode: 400 });

    const id = `CNT-${Date.now().toString().slice(-6)}`;
    const row = await Contact.create({
      id,
      name,
      email,
      phone: payload.phone?.trim() || null,
      subject,
      message,
      status: "New"
    });

    return {
      id: row.id,
      message: "Thank you! We received your message and will respond soon."
    };
  }
};

module.exports = contactService;
