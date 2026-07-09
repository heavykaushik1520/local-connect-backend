const app = require("./app");
const env = require("./config/env");
const { pool } = require("./config/db");

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("MySQL connected");
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    console.error("Check DB_* values in backend/.env and ensure MySQL is running.");
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
}

start();
