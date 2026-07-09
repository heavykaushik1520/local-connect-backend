const express = require("express");
const cors = require("cors");
const path = require("path");
const env = require("./config/env");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.clientUrls.includes(origin)) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", apiRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "India Local Connect API", version: "2.0.0" });
});

app.use(errorHandler);

module.exports = app;
