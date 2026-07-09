# India Local Connect — Backend

Node.js + Express + MySQL + JWT API (port **5000**).

## Setup

1. Create MySQL database and tables manually (see `database/schema.sql` for reference).
2. Configure credentials in `.env`:

```bash
npm install
cp .env.example .env
```

Edit `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env`.

## Run

```bash
npm run dev
```

API: http://localhost:5000/api/health

## Create admin user (manual SQL example)

After tables exist, insert an admin with a bcrypt password hash:

```sql
INSERT INTO users (id, name, email, phone, password_hash, role, city, status, listings_count, joined_at)
VALUES (
  'USR-1005',
  'Platform Owner',
  'admin@indialocalconnect.local',
  '+91 90000 00001',
  '$2a$10$5hP8ERUhb9djVLsldtEeP.g02SkqbXh6ISsp5HFMILa3WHWKQvN1G',
  'super_admin',
  'India',
  'Active',
  0,
  CURDATE()
);
```

Password for that hash: `Admin@123`

## Structure

```
src/
  config/       Environment & MySQL pool
  controllers/  Request handlers
  middleware/   JWT auth, errors
  models/       Database access
  routes/       API routes
  services/     Business logic
  utils/        JWT, passwords, helpers
database/       schema.sql (reference only)
uploads/        Local file storage
```
