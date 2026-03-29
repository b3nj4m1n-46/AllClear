/**
 * Seed the database from the hash_lookup CSV.
 *
 * Usage: npx tsx server/seed.ts [path-to-hash-lookup.csv]
 */
import fs from "fs";
import path from "path";
import db from "./db.js";

const csvPath =
  process.argv[2] ||
  path.join(
    import.meta.dirname,
    "..",
    "..",
    "pdo-scraper",
    "ashland_hash_lookup.csv"
  );

if (!fs.existsSync(csvPath)) {
  console.error(`error: ${csvPath} not found`);
  process.exit(1);
}

const content = fs.readFileSync(csvPath, "utf-8");
const lines = content.trim().split("\n");
const headers = lines[0].split(",");

const insert = db.prepare(`
  INSERT OR REPLACE INTO parcels (
    hash_code, account, role, owner_name, situs_address,
    mailing_address, acreage, year_built, land_value,
    imp_value, prop_class, map_taxlot, subdivision,
    build_code, comm_sqft, lot_depth, lot_width
  ) VALUES (
    @hash_code, @account, @role, @owner_name, @situs_address,
    @mailing_address, @acreage, @year_built, @land_value,
    @imp_value, @prop_class, @map_taxlot, @subdivision,
    @build_code, @comm_sqft, @lot_depth, @lot_width
  )
`);

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

const insertMany = db.transaction((rows: Record<string, string>[]) => {
  for (const row of rows) {
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
    });
  }
});

const rows: Record<string, string>[] = [];
for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  const row: Record<string, string> = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx] || "";
  });
  rows.push(row);
}

insertMany(rows);
console.log(`seed: inserted ${rows.length} parcels into fireready.db`);

// Quick stats
const stats = db
  .prepare(
    `
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN role = 'owner' THEN 1 END) as owners,
    COUNT(CASE WHEN role = 'occupant' THEN 1 END) as occupants,
    COUNT(DISTINCT account) as unique_parcels
  FROM parcels
`
  )
  .get() as { total: number; owners: number; occupants: number; unique_parcels: number };

console.log(`  total records:   ${stats.total}`);
console.log(`  owner records:   ${stats.owners}`);
console.log(`  occupant records:${stats.occupants}`);
console.log(`  unique parcels:  ${stats.unique_parcels}`);
