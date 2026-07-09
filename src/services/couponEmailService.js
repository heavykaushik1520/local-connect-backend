const env = require("../config/env");
const emailService = require("./emailService");

function couponEmailHtml({ heading, intro, offer, business, customerName, gameLabel }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
      <h2 style="color:#0d9488">${heading}</h2>
      <p>${intro}</p>
      <div style="border:1px dashed #0d9488;border-radius:12px;padding:16px;margin:16px 0;background:#f0fdfa">
        <p style="margin:0 0 8px"><strong>Business:</strong> ${business.name}</p>
        <p style="margin:0 0 8px"><strong>Offer:</strong> ${offer.title}</p>
        <p style="margin:0 0 8px"><strong>Discount:</strong> ${offer.discount}</p>
        <p style="margin:0 0 8px;font-size:20px;font-weight:bold;letter-spacing:1px">Code: ${offer.couponCode}</p>
        ${offer.validUntil ? `<p style="margin:0"><strong>Valid until:</strong> ${offer.validUntil}</p>` : ""}
      </div>
      ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ""}
      ${gameLabel ? `<p style="color:#64748b;font-size:14px">Won via ${gameLabel} on India Local Connect.</p>` : ""}
      <p style="color:#64748b;font-size:14px">Visit <a href="${env.clientUrl}">${env.clientUrl}</a></p>
    </div>
  `;
}

const couponEmailService = {
  async sendCouponClaimedEmails({ customer, owner, business, offer, gameType }) {
    const gameLabel =
      gameType === "spin" ? "Spin wheel" : gameType === "memory" ? "Memory match" : "Tap & win";

    const results = { customer: null, owner: null };

    if (customer?.email) {
      results.customer = await emailService.sendMail({
        to: customer.email,
        subject: `Your ${offer.discount} coupon for ${business.name}`,
        html: couponEmailHtml({
          heading: "Your discount coupon is ready!",
          intro: `Hi ${customer.name}, you unlocked a coupon for <strong>${business.name}</strong>. Show this code at the shop or mention it on WhatsApp.`,
          offer,
          business,
          customerName: customer.name,
          gameLabel
        })
      });
    }

    if (owner?.email) {
      results.owner = await emailService.sendMail({
        to: owner.email,
        subject: `Customer won a coupon for ${business.name}`,
        html: couponEmailHtml({
          heading: "A customer unlocked your game coupon",
          intro: `Hi ${owner.name}, a customer played your Deal Quest game and received the coupon below. Please honour it when they visit or contact you.`,
          offer,
          business,
          customerName: customer?.name || "A customer",
          gameLabel
        })
      });
    } else if (!owner?.email) {
      console.warn(`[coupon-email] No owner email for business ${business.id}`);
      results.owner = { ok: false, skipped: true, reason: "owner_missing_email" };
    }

    return results;
  }
};

module.exports = couponEmailService;
