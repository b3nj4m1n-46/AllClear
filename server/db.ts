import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(import.meta.dirname, "..", "data", "fireready.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS parcels (
    hash_code    TEXT PRIMARY KEY,
    account      TEXT NOT NULL,
    role         TEXT NOT NULL CHECK(role IN ('owner', 'occupant')),
    owner_name   TEXT,
    situs_address TEXT,
    mailing_address TEXT,
    acreage      REAL,
    year_built   INTEGER,
    land_value   INTEGER,
    imp_value    INTEGER,
    prop_class   TEXT,
    map_taxlot   TEXT,
    subdivision  TEXT,
    build_code   INTEGER,
    comm_sqft    INTEGER,
    lot_depth    INTEGER,
    lot_width    INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_parcels_account ON parcels(account);

  CREATE TABLE IF NOT EXISTS survey_responses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    hash_code    TEXT NOT NULL REFERENCES parcels(hash_code),
    responded_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Contact
    respondent_name  TEXT,
    respondent_email TEXT,
    respondent_phone TEXT,

    -- Fire preparedness questions
    defensible_space     TEXT CHECK(defensible_space IN ('yes', 'no', 'partial', 'unsure')),
    ember_resistant_roof TEXT CHECK(ember_resistant_roof IN ('yes', 'no', 'unsure')),
    vegetation_clearance TEXT CHECK(vegetation_clearance IN ('0-5ft', '5-30ft', '30-100ft', 'none', 'unsure')),
    has_fire_plan        TEXT CHECK(has_fire_plan IN ('yes', 'no')),
    has_go_bag           TEXT CHECK(has_go_bag IN ('yes', 'no', 'partial')),
    water_source         TEXT,
    evacuation_route     TEXT,
    hoa_name             TEXT,

    -- Interest in programs
    wants_assessment     INTEGER DEFAULT 0,
    wants_firewise       INTEGER DEFAULT 0,
    wants_newsletter     INTEGER DEFAULT 0,

    -- Open-ended
    concerns             TEXT,
    notes                TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_responses_hash ON survey_responses(hash_code);
  CREATE INDEX IF NOT EXISTS idx_responses_time ON survey_responses(responded_at);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nurseries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    business_type TEXT,
    company_type TEXT,
    ships_to     TEXT,
    address      TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    phone        TEXT,
    fax          TEXT,
    email        TEXT,
    website      TEXT,
    description  TEXT,
    supply_categories TEXT,
    slug         TEXT,
    lat          REAL,
    lon          REAL
  );

  CREATE INDEX IF NOT EXISTS idx_nurseries_state ON nurseries(state);
  CREATE INDEX IF NOT EXISTS idx_nurseries_zip ON nurseries(zip);
`);

// Add new columns if they don't exist (migration-safe)
const cols = db.prepare("PRAGMA table_info(parcels)").all().map((c: any) => c.name);
for (const [col, type] of [["build_code", "INTEGER"], ["comm_sqft", "INTEGER"], ["lot_depth", "INTEGER"], ["lot_width", "INTEGER"], ["evac_zone", "TEXT"], ["evac_city", "TEXT"], ["city", "TEXT"]]) {
  if (!cols.includes(col)) {
    db.exec(`ALTER TABLE parcels ADD COLUMN ${col} ${type}`);
  }
}

export default db;
