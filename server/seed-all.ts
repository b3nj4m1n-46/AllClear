/**
 * Seed the database with both Ashland and county data.
 * Adds a 'city' field based on the source CSV.
 *
 * Usage: npx tsx server/seed-all.ts
 */
import fs from "fs";
import path from "path";
import db from "./db.js";

const PDO_DIR = path.join(import.meta.dirname, "..", "..", "pdo-scraper");
const ASHLAND_CSV = path.join(PDO_DIR, "ashland_hash_lookup.csv");
const COUNTY_CSV = path.join(PDO_DIR, "jackson_county_hash_lookup.csv");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function loadCSV(csvPath: string): Record<string, string>[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function inferCity(mailingAddress: string): string {
  // Parse city from mailing address like "123 MAIN ST, ASHLAND, OR 97520"
  const parts = mailingAddress.split(",").map(s => s.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2].replace(/\s+(OR|CA|WA)\s+\d+$/, "").trim();
  }
  return "";
}

const insert = db.prepare(`
  INSERT OR REPLACE INTO parcels (
    hash_code, account, role, owner_name, situs_address,
    mailing_address, acreage, year_built, land_value,
    imp_value, prop_class, map_taxlot, subdivision,
    build_code, comm_sqft, lot_depth, lot_width, city
  ) VALUES (
    @hash_code, @account, @role, @owner_name, @situs_address,
    @mailing_address, @acreage, @year_built, @land_value,
    @imp_value, @prop_class, @map_taxlot, @subdivision,
    @build_code, @comm_sqft, @lot_depth, @lot_width, @city
  )
`);

const insertMany = db.transaction((rows: Record<string, string>[], defaultCity: string) => {
  for (const row of rows) {
    const city = defaultCity || inferCity(row.mailing_address || "");
    insert.run({
      hash_code: row.hash_code,
      account: row.account,
      role: row.role,
      owner_name: row.owner_name || null,
      situs_address: row.situs_address || null,
      mailing_address: row.mailing_address || null,
      acreage: row.acreage ? parseFloat(row.acreage) : null,
      year_built: row.year_built ? parseInt(row.year_built) : null,
      land_value: row.land_value ? parseInt(row.land_value) : null,
      imp_value: row.imp_value ? parseInt(row.imp_value) : null,
      prop_class: row.prop_class || null,
      map_taxlot: row.map_taxlot || null,
      subdivision: row.subdivision || null,
      build_code: row.build_code ? parseInt(row.build_code) : null,
      comm_sqft: row.comm_sqft ? parseInt(row.comm_sqft) : null,
      lot_depth: row.lot_depth ? parseInt(row.lot_depth) : null,
      lot_width: row.lot_width ? parseInt(row.lot_width) : null,
      city: city,
    });
  }
});

// Clear existing data
db.exec("DELETE FROM survey_responses");
db.exec("DELETE FROM parcels");
console.log("seed: cleared existing data");

// Seed county data first (Ashland records will be overwritten with Ashland-specific data)
if (fs.existsSync(COUNTY_CSV)) {
  const allCountyRows = loadCSV(COUNTY_CSV);
  // Exclude Ashland — those come from the Ashland-specific CSV with better data
  const countyRows = allCountyRows.filter(r => {
    const city = inferCity(r.mailing_address || "");
    return city.toUpperCase() !== "ASHLAND";
  });
  console.log(`seed: loading ${countyRows.length} county records (${allCountyRows.length - countyRows.length} Ashland excluded)...`);
  for (let i = 0; i < countyRows.length; i += 5000) {
    const chunk = countyRows.slice(i, i + 5000);
    insertMany(chunk, "");
    console.log(`  ${Math.min(i + 5000, countyRows.length)}/${countyRows.length}`);
  }
}

// Seed Ashland data (overwrites county Ashland records with Ashland-specific hashes)
if (fs.existsSync(ASHLAND_CSV)) {
  const ashlandRows = loadCSV(ASHLAND_CSV);
  console.log(`seed: loading ${ashlandRows.length} Ashland records...`);
  insertMany(ashlandRows, "ASHLAND");
}

// Stats
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT account) as unique_parcels,
    COUNT(CASE WHEN city = 'ASHLAND' THEN 1 END) as ashland,
    COUNT(DISTINCT city) as cities
  FROM parcels
`).get() as { total: number; unique_parcels: number; ashland: number; cities: number };

console.log(`\nseed: complete`);
console.log(`  total records:   ${stats.total}`);
console.log(`  unique parcels:  ${stats.unique_parcels}`);
console.log(`  ashland records: ${stats.ashland}`);
console.log(`  cities:          ${stats.cities}`);

// City breakdown
const cityBreakdown = db.prepare(
  "SELECT city, COUNT(*) as count FROM parcels WHERE city != '' GROUP BY city ORDER BY count DESC LIMIT 10"
).all() as { city: string; count: number }[];
console.log(`\n  Top cities:`);
for (const { city, count } of cityBreakdown) {
  console.log(`    ${city.padEnd(20)} ${count}`);
}
