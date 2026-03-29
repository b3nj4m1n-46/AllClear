import db from "./db.js";
import fs from "fs";
import path from "path";

const JSON_PATH = path.join(import.meta.dirname, "..", "data", "nurseries", "nurseries.json");

console.log("seed-nurseries: loading JSON...");
const rows: Record<string, string>[] = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
console.log(`seed-nurseries: parsed ${rows.length} nurseries`);

// Clear existing
db.exec("DELETE FROM nurseries");

const insert = db.prepare(`
  INSERT INTO nurseries (name, business_type, company_type, ships_to, address, city, state, zip, phone, fax, email, website, description, supply_categories, slug)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction(() => {
  let count = 0;
  for (const r of rows) {
    insert.run(
      r["Name"] || null,
      r["Business Type"] || null,
      r["Company Type"] || null,
      r["Ships To"] || null,
      r["Mailing Address"] || null,
      r["City"] || null,
      r["State"] || null,
      (r["Zip"] || "").substring(0, 5) || null,
      r["Phone"] || null,
      r["Fax"] || null,
      r["Email"] || null,
      r["Website"] || null,
      r["Description"] || null,
      r["Supply Categories"] || null,
      r["Slug"] || null,
    );
    count++;
  }
  return count;
});

const count = tx();
console.log(`seed-nurseries: inserted ${count} nurseries`);

const orCount = (db.prepare("SELECT COUNT(*) as c FROM nurseries WHERE state = 'OR'").get() as any).c;
const withPlants = (db.prepare("SELECT COUNT(*) as c FROM nurseries WHERE supply_categories LIKE '%Plants%' OR supply_categories LIKE '%Trees%' OR supply_categories LIKE '%Shrubs%' OR business_type LIKE '%Grower%'").get() as any).c;
console.log(`  Oregon: ${orCount}`);
console.log(`  Plant suppliers: ${withPlants}`);
