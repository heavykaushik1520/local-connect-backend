/**
 * Seed sample communities for development/demo.
 * Usage: node scripts/seed-communities.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = require("../src/config/db");

const SAMPLES = [
  {
    id: "COM-100001",
    name: "Pune Electricians Network",
    city: "Pune",
    category: "Electricians",
    admin_name: "Rajesh Kulkarni",
    member_count: 0,
    status: "Active",
    description: "Share wiring jobs, supplier contacts, and safety tips with verified electricians across Pune."
  },
  {
    id: "COM-100002",
    name: "Mumbai Food Cart Owners",
    city: "Mumbai",
    category: "Food Carts",
    admin_name: "Priya Shah",
    member_count: 0,
    status: "Active",
    description: "Street food vendors exchanging location permits, bulk ingredient deals, and festival stall leads."
  },
  {
    id: "COM-100003",
    name: "Bengaluru Salon Professionals",
    city: "Bengaluru",
    category: "Salons",
    admin_name: "Anita Reddy",
    member_count: 0,
    status: "Active",
    description: "Salon owners and stylists collaborating on product sourcing, staffing, and bridal season bookings."
  },
  {
    id: "COM-100004",
    name: "Delhi NCR Plumbers Guild",
    city: "Delhi",
    category: "Plumbers",
    admin_name: "Vikram Singh",
    member_count: 0,
    status: "Active",
    description: "Refer overflow plumbing work, discuss fittings suppliers, and share apartment society contacts."
  },
  {
    id: "COM-100005",
    name: "Hyderabad Medical Store Alliance",
    city: "Hyderabad",
    category: "Medical Stores",
    admin_name: "Dr. Suresh Rao",
    member_count: 0,
    status: "Active",
    description: "Chemists coordinating stock alerts, distributor rates, and generic medicine availability."
  }
];

async function seed() {
  for (const row of SAMPLES) {
    const existing = await db.query("SELECT id FROM communities WHERE id = ?", [row.id]);
    if (existing.length) {
      console.log(`Skip existing: ${row.name}`);
      continue;
    }
    await db.query(
      `INSERT INTO communities (id, name, city, category, admin_name, member_count, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.name, row.city, row.category, row.admin_name, row.member_count, row.status, row.description]
    );
    console.log(`Created: ${row.name}`);
  }
  console.log("Community seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
