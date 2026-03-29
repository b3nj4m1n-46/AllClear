/**
 * Seed evacuation zone data from the lookup CSV into the database.
 */
import fs from "fs";
import path from "path";
import db from "./db.js";

const csvPath = path.join(
  import.meta.dirname, "..", "..", "pdo-scraper", "ashland_evac_zones_by_account.csv"
);

if (!fs.existsSync(csvPath)) {
  console.error(`error: ${csvPath} not found`);
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, "utf-8");
const lines = csv.trim().split("\n");

const update = db.prepare(
  "UPDATE parcels SET evac_zone = ?, evac_city = ? WHERE account = ?"
);

let updated = 0;
const tx = db.transaction(() => {
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const account = parts[0];
    const evac_zone = parts[2];
    const evac_city = parts[3];
    if (account && evac_zone) {
      const r = update.run(evac_zone, evac_city, account);
      updated += r.changes;
    }
  }
});
tx();

const withZone = db.prepare(
  "SELECT COUNT(*) as c FROM parcels WHERE evac_zone IS NOT NULL AND evac_zone != ''"
).get() as { c: number };

console.log(`seed-evac: updated ${updated} records with evac zones`);
console.log(`  total with evac_zone: ${withZone.c}`);
