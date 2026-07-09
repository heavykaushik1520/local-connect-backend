const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../../.env")
});

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ilc_db"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "ilc-dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  get clientUrl() {
    const production = this.clientUrls.find((url) => !/localhost|127\.0\.0\.1/i.test(url));
    return production || this.clientUrls[0];
  },
  adminEmail: process.env.ADMIN_EMAIL || "admin@indialocalconnect.local",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123",
  smtp: {
    enabled: process.env.SMTP_ENABLED === "true",
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@indialocalconnect.local"
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || ""
  }
};
