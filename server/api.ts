import express from "express";
import db from "./db.js";

const app = express();
app.use(express.json());

// Lookup parcel by hash code
app.get("/api/parcel/:hash", (req, res) => {
  const parcel = db
    .prepare("SELECT * FROM parcels WHERE hash_code = ?")
    .get(req.params.hash);
  if (!parcel) return res.status(404).json({ error: "Invalid survey code" });
  res.json(parcel);
});

// Submit survey response
app.post("/api/survey/:hash", (req, res) => {
  const parcel = db
    .prepare("SELECT hash_code FROM parcels WHERE hash_code = ?")
    .get(req.params.hash);
  if (!parcel) return res.status(404).json({ error: "Invalid survey code" });

  const b = req.body;
  const result = db
    .prepare(
      `INSERT INTO survey_responses (
        hash_code, respondent_name, respondent_email, respondent_phone,
        defensible_space, ember_resistant_roof, vegetation_clearance,
        has_fire_plan, has_go_bag, water_source, evacuation_route, hoa_name,
        wants_assessment, wants_firewise, wants_newsletter, concerns, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.hash,
      b.respondent_name || null, b.respondent_email || null, b.respondent_phone || null,
      b.defensible_space || null, b.ember_resistant_roof || null, b.vegetation_clearance || null,
      b.has_fire_plan || null, b.has_go_bag || null, b.water_source || null,
      b.evacuation_route || null, b.hoa_name || null,
      b.wants_assessment ? 1 : 0, b.wants_firewise ? 1 : 0, b.wants_newsletter ? 1 : 0,
      b.concerns || null, b.notes || null
    );
  res.json({ id: result.lastInsertRowid, message: "Survey submitted" });
});

// Random parcel for postcard demo
app.get("/api/random-parcel", (_req, res) => {
  const parcel = db
    .prepare("SELECT * FROM parcels WHERE role = 'owner' AND situs_address != '' AND city = 'ASHLAND' AND evac_zone IS NOT NULL ORDER BY RANDOM() LIMIT 1")
    .get();
  res.json(parcel);
});

// Browse parcels with search + pagination
app.get("/api/parcels", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const role = (req.query.role as string) || "";

  let where = "1=1";
  const params: (string | number)[] = [];

  if (search) {
    where += " AND (situs_address LIKE ? OR owner_name LIKE ? OR account LIKE ? OR subdivision LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (role === "owner" || role === "occupant") {
    where += " AND role = ?";
    params.push(role);
  }

  const city = (req.query.city as string) || "";
  if (city === "ASHLAND") {
    where += " AND city = 'ASHLAND'";
  } else if (city && city !== "ALL") {
    where += " AND city = ?";
    params.push(city.toUpperCase());
  }

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM parcels WHERE ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(`SELECT * FROM parcels WHERE ${where} ORDER BY CASE WHEN situs_address IS NULL OR situs_address = '' THEN 1 ELSE 0 END, situs_address ASC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  res.json({ parcels: rows, page, limit, total: total.count, pages: Math.ceil(total.count / limit) });
});

// Dashboard stats
app.get("/api/stats", (_req, res) => {
  const parcels = db.prepare("SELECT COUNT(DISTINCT account) as count FROM parcels").get() as { count: number };
  const responses = db.prepare("SELECT COUNT(*) as count FROM survey_responses").get() as { count: number };
  const assessment = db.prepare("SELECT COUNT(*) as count FROM survey_responses WHERE wants_assessment = 1").get() as { count: number };
  const recent = db.prepare(
    `SELECT sr.*, p.situs_address, p.owner_name, p.role FROM survey_responses sr
     JOIN parcels p ON p.hash_code = sr.hash_code ORDER BY sr.responded_at DESC LIMIT 20`
  ).all();

  res.json({
    total_parcels: parcels.count,
    total_responses: responses.count,
    response_rate: parcels.count ? ((responses.count / parcels.count) * 100).toFixed(1) + "%" : "0%",
    wants_assessment: assessment.count,
    recent_responses: recent,
  });
});

// Nearest nurseries to a zip code
app.get("/api/nurseries/near/:zip", (req, res) => {
  const zip = req.params.zip;
  const limit = Math.min(20, parseInt(req.query.limit as string) || 5);
  const plantOnly = req.query.plants !== "false";

  // Get all nurseries, sorted by zip proximity (simple numeric distance)
  let where = "state = 'OR'";
  if (plantOnly) {
    where += ` AND (
      business_type LIKE '%Grower%' OR business_type LIKE '%Nursery%' OR business_type LIKE '%Retailer%' OR business_type LIKE '%Garden Center%'
      OR supply_categories LIKE '%Plants%' OR supply_categories LIKE '%Trees%' OR supply_categories LIKE '%Shrubs%'
      OR supply_categories LIKE '%Seeds%' OR supply_categories LIKE '%Groundcovers%' OR supply_categories LIKE '%Perennials%'
    )`;
  }

  const rows = db
    .prepare(`SELECT *, ABS(CAST(SUBSTR(zip, 1, 5) AS INTEGER) - CAST(? AS INTEGER)) as zip_dist FROM nurseries WHERE ${where} ORDER BY zip_dist ASC LIMIT ?`)
    .all(zip.substring(0, 5), limit);

  res.json(rows);
});

// All nurseries (with optional search and scope)
app.get("/api/nurseries", (req, res) => {
  const search = (req.query.search as string) || "";
  const scope = (req.query.scope as string) || "local"; // local | ships_here | all
  const limit = Math.min(200, parseInt(req.query.limit as string) || 100);

  // Southern Oregon zip prefixes for "local"
  const localZips = ['975', '976', '974', '973'];

  let where = "1=1";
  const params: (string | number)[] = [];

  if (scope === "local") {
    where += ` AND state = 'OR' AND (${localZips.map(() => "zip LIKE ?").join(" OR ")})`;
    localZips.forEach(z => params.push(`${z}%`));
  } else if (scope === "ships_here") {
    where += " AND ships_to LIKE '%Pacific Northwest%'";
  }
  // scope === "all" has no filter

  if (search) {
    where += " AND (name LIKE ? OR city LIKE ? OR supply_categories LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM nurseries WHERE ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(`SELECT * FROM nurseries WHERE ${where} ORDER BY name ASC LIMIT ?`)
    .all(...params, limit);

  res.json({ nurseries: rows, total: total.count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`allclear-api: listening on port ${PORT}`));
