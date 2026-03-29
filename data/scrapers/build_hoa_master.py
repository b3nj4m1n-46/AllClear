"""
Build a master CSV of Ashland, Oregon HOAs by merging:
1. PDO subdivision scraper results (ashland_subdivisions.csv)
2. Oregon State HOA dataset (HOA_Oregon_20260328.csv)
3. Hardcoded web research findings
4. Hardcoded web search verification results
"""

import csv
import re
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PDO_CSV = SCRIPT_DIR / "ashland_subdivisions.csv"
STATE_HOA_CSV = Path(r"C:\Users\bd\Downloads\HOA_Oregon_20260328.csv")
OUTPUT_CSV = SCRIPT_DIR / "ashland_hoa_master.csv"


# ---------------------------------------------------------------------------
# 1. Read & aggregate PDO subdivisions to subdivision level
# ---------------------------------------------------------------------------

def read_pdo_subdivisions():
    """Aggregate parcel-level PDO data to subdivision level."""
    subs = defaultdict(lambda: {"parcels": 0, "streets": set()})
    with open(PDO_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["subdivision"].strip()
            subs[name]["parcels"] += 1
            addr = row.get("situs_address", "").strip()
            if addr:
                # Extract street name: drop leading house number
                street = re.sub(r"^\d+\s+", "", addr).strip()
                if street:
                    subs[name]["streets"].add(street)
    return {k: {"parcels": v["parcels"], "streets": sorted(v["streets"])}
            for k, v in subs.items()}


# ---------------------------------------------------------------------------
# 2. Read Oregon State HOA dataset, filter to Ashland / 97520
# ---------------------------------------------------------------------------

def read_state_hoa():
    """Read state HOA CSV and return dict keyed by registry number."""
    hoas = {}
    with open(STATE_HOA_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            city = row.get("City", "").strip().upper()
            zipcode = row.get("Zip Code", "").strip()
            if city != "ASHLAND" and not zipcode.startswith("97520"):
                continue
            reg = row["Registry Number"].strip()
            if reg not in hoas:
                hoas[reg] = {
                    "name": row["Business Name"].strip(),
                    "registry_num": reg,
                    "registry_date": row.get("Registry Date", "").strip().split(" ")[0],
                    "address": "",
                    "president": "",
                }
            # Grab mailing address
            assoc_type = row.get("Associated Name Type", "").strip().upper()
            if assoc_type == "MAILING ADDRESS":
                addr_parts = [
                    row.get("Address ", "").strip(),  # note trailing space in header
                    row.get("Address Continued", "").strip(),
                ]
                city_state = f"{row.get('City','').strip()}, {row.get('State','').strip()} {row.get('Zip Code','').strip()}"
                full = ", ".join(p for p in addr_parts if p) + ", " + city_state
                hoas[reg]["address"] = full
            elif assoc_type == "PRESIDENT":
                first = row.get("First Name", "").strip()
                last = row.get("Last Name", "").strip()
                hoas[reg]["president"] = f"{first} {last}".strip()
    return hoas


# ---------------------------------------------------------------------------
# 3. Hardcoded web research data
# ---------------------------------------------------------------------------

WEB_RESEARCH = [
    {
        "name": "Meadowbrook Park Estates HOA",
        "website": "https://www.meadowbrookparkestates.com/",
        "address": "Ashland, OR",
        "notes": "59 homes, est. 1997",
        "source": "web",
    },
    {
        "name": "Meadowbrook Park II North Mountain HOA",
        "website": "https://www.meadowbrookparkashlandor.com/",
        "address": "Ashland, OR",
        "notes": "",
        "source": "web",
    },
    {
        "name": "Mountain Meadows Owners Association",
        "website": "https://mountainmeadowsashland.com/mmoa/",
        "address": "855 Mountain Meadows Dr, Ashland, OR 97520",
        "notes": "226 properties, 27 acres",
        "source": "web",
    },
    {
        "name": "Mountain Ranch Property Owners Association (MRPOA)",
        "website": "https://mrpoa-ashland.com/",
        "address": "1467 Siskiyou Blvd #341, Ashland, OR 97520",
        "notes": "74 homes, 26 acres, est. late 1970s",
        "source": "web",
    },
    {
        "name": "Ashland Conservancy HOA",
        "website": "https://ashlandconservancy.com/",
        "address": "Ashland, OR",
        "notes": "Monthly board meetings",
        "source": "web",
    },
    {
        "name": "Clay Creek Gardens HOA",
        "website": "https://ashlandia.wixsite.com/claycreekhoa",
        "address": "Ashland, OR",
        "notes": "",
        "source": "web",
    },
    {
        "name": "Chautauqua Trace HOA",
        "website": "https://chautauquatracehoa.communitysite.com/",
        "address": "Ashland, OR",
        "notes": "",
        "source": "web",
    },
    {
        "name": "East Village HOA",
        "website": "https://eastvillagehoaashland.com/",
        "address": "Ashland, OR",
        "notes": "",
        "source": "web",
    },
    {
        "name": "Oak Knoll Meadows Homeowners Association",
        "website": "",
        "address": "241 Maple St Ste 100, Ashland, OR 97520",
        "notes": "Registry 17301110, est. 1983",
        "source": "SOS registry",
        "registry_num": "17301110",
    },
    {
        "name": "Rosskeen Subdivision HOA",
        "website": "",
        "address": "356 Otis St, Ashland, OR 97520",
        "notes": "Registry 39279781",
        "source": "SOS registry",
        "registry_num": "39279781",
    },
    {
        "name": "Vander Lind HOA",
        "website": "",
        "address": "410 Guthrie St, Ashland, OR 97520",
        "notes": "Registry 99789498",
        "source": "SOS registry",
        "registry_num": "99789498",
    },
    {
        "name": "Chelsea Oaks Condominium Association",
        "website": "",
        "address": "854 Twin Pines Cir, Ashland, OR 97520",
        "notes": "Est. 2014",
        "source": "SOS registry",
    },
    {
        "name": "Fallen Leaf Tract Association",
        "website": "",
        "address": "580 Elkader St, Ashland, OR 97520",
        "notes": "Social Welfare Org, est. 2013",
        "source": "IRS 501c",
    },
]


# ---------------------------------------------------------------------------
# 4. Web search verification: PDO subdivision -> HOA mapping
# ---------------------------------------------------------------------------

PDO_VERIFICATION = {
    # subdivision_name -> dict with hoa info
    "Billings Ranch Subdivision A P. C.": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Billings Ranch HOA, Inc.",
        "website": "https://www.billingsranchhoa.com/",
        "notes": "Active website, CC&Rs, board",
    },
    "River Walk Subdivision, A P.C.": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Riverwalk Homeowners Association",
        "website": "https://riverwalkofashland.org/",
        "notes": "175+ homes, 241 Maple St",
    },
    "Bud's Dairy A P.C.": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Bud's Dairy Homeowners Association",
        "website": "",
        "notes": "D&B listing, founded 2010",
    },
    "Pavilion Condominium, The": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Pavilion Condominium Association",
        "website": "",
        "notes": "CC&Rs via Mountain Meadows mgmt",
    },
    "Creekside Cottages Condominium": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Creekside Cottages Condominium Association",
        "website": "",
        "notes": "OR SOS registry 13485396",
        "registry_num": "13485396",
    },
    "Five Turret Townhouses A P.C.": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Five Turret Townhouses HOA",
        "website": "",
        "notes": "TransparencyHOA listing",
    },
    "Deerfield Estates Subdivision": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Deerfield Estates HOA",
        "website": "https://sites.google.com/site/dehapublic/docs",
        "notes": "Google Sites with docs",
    },
    "Hamilton Place Subdivision": {
        "hoa_confirmed": "confirmed",
        "hoa_name": "Hamilton Place HOA",
        "website": "",
        "notes": "955 Drew Lane",
        "phone": "(541) 488-6965",
    },
    "Strawberry Meadows Subdivision A P.C.": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No web presence",
    },
    "Quinn Subdivision A P.C.": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No web presence",
    },
    "Park Ridge Subdivision, Phase 2 A P.U.D.": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No web presence",
    },
    "Park Place Condominiums": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No Ashland-specific result",
    },
    "Clear Creek Village, Phase 2 A P.C.": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "Possibly related to East Village HOA",
    },
    "Shelterwood Condominium Supp Plat No I": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No web presence",
    },
    "Siskiyou Springs Condominium": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No web presence",
    },
    "Jasmine Building Condominium": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "Likely commercial",
    },
    "Alida Blaine Condominium": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "No results",
    },
    "Ashland East Main Street Condominium": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "No results",
    },
    "Ashland Medical Center A P.C.": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "Commercial/medical",
    },
    "Larkin Lane Condominium": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "No results",
    },
    "Replat Of Lots 9,10,12,13, & Common Area Of Washington Professional Plaza, A P.C.": {
        "hoa_confirmed": "likely_not_hoa",
        "hoa_name": "",
        "website": "",
        "notes": "Commercial office",
    },
    "Gould Townhouses, A P.C.": {
        "hoa_confirmed": "uncertain",
        "hoa_name": "",
        "website": "",
        "notes": "No results",
    },
}


# ---------------------------------------------------------------------------
# 5. Build the master list
# ---------------------------------------------------------------------------

def normalize(s):
    """Lowercase, strip common suffixes for fuzzy matching."""
    s = s.lower().strip()
    for term in [", inc.", " inc.", " inc", ", a p.c.", " a p.c.",
                 ", a p.u.d.", " a p.u.d.", " a p. c.", ", a p. c.",
                 " hoa", " homeowners association", " owners association",
                 " property owners association", " condominium association",
                 " association", " subdivision", ", the"]:
        s = s.replace(term, "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_master():
    pdo_data = read_pdo_subdivisions()
    state_hoas = read_state_hoa()

    # Build output rows. Track which entries we've already added by a
    # normalized key to avoid duplicates.
    master = {}  # norm_key -> row dict

    # --- Process PDO subdivisions with verification data ---
    for sub_name, sub_info in pdo_data.items():
        verif = PDO_VERIFICATION.get(sub_name, {})
        status = verif.get("hoa_confirmed", "uncertain")
        hoa_name = verif.get("hoa_name", "") or sub_name
        key = normalize(hoa_name)

        row = {
            "hoa_name": hoa_name,
            "subdivision_name": sub_name,
            "status": status,
            "pdo_parcel_count": sub_info["parcels"],
            "pdo_streets": "; ".join(sub_info["streets"]),
            "state_registry_num": verif.get("registry_num", ""),
            "state_registry_date": "",
            "website": verif.get("website", ""),
            "address": "",
            "phone": verif.get("phone", ""),
            "notes": verif.get("notes", ""),
            "data_sources": "pdo",
        }
        if verif:
            row["data_sources"] = "pdo;web_search"
        master[key] = row

    # --- Merge state HOA data ---
    for reg, info in state_hoas.items():
        key = normalize(info["name"])
        if key in master:
            # Merge into existing
            master[key]["state_registry_num"] = info["registry_num"]
            master[key]["state_registry_date"] = info["registry_date"]
            if not master[key]["address"]:
                master[key]["address"] = info["address"]
            sources = master[key]["data_sources"].split(";")
            if "state_hoa" not in sources:
                sources.append("state_hoa")
            master[key]["data_sources"] = ";".join(sources)
            if info.get("president"):
                existing_notes = master[key]["notes"]
                pres_note = f"President: {info['president']}"
                if pres_note not in existing_notes:
                    master[key]["notes"] = f"{existing_notes}; {pres_note}" if existing_notes else pres_note
        else:
            # New entry from state data
            master[key] = {
                "hoa_name": info["name"],
                "subdivision_name": "",
                "status": "confirmed",
                "pdo_parcel_count": 0,
                "pdo_streets": "",
                "state_registry_num": info["registry_num"],
                "state_registry_date": info["registry_date"],
                "website": "",
                "address": info["address"],
                "phone": "",
                "notes": f"President: {info['president']}" if info.get("president") else "",
                "data_sources": "state_hoa",
            }

    # --- Merge web research data ---
    for entry in WEB_RESEARCH:
        key = normalize(entry["name"])
        if key in master:
            # Merge
            if entry.get("website") and not master[key]["website"]:
                master[key]["website"] = entry["website"]
            if entry.get("address") and not master[key]["address"]:
                master[key]["address"] = entry["address"]
            if entry.get("registry_num") and not master[key]["state_registry_num"]:
                master[key]["state_registry_num"] = entry["registry_num"]
            sources = master[key]["data_sources"].split(";")
            if "web" not in sources:
                sources.append("web")
            master[key]["data_sources"] = ";".join(sources)
            # Merge notes
            if entry.get("notes"):
                existing = master[key]["notes"]
                if entry["notes"] not in existing:
                    master[key]["notes"] = f"{existing}; {entry['notes']}" if existing else entry["notes"]
        else:
            master[key] = {
                "hoa_name": entry["name"],
                "subdivision_name": "",
                "status": "confirmed",
                "pdo_parcel_count": 0,
                "pdo_streets": "",
                "state_registry_num": entry.get("registry_num", ""),
                "state_registry_date": "",
                "website": entry.get("website", ""),
                "address": entry.get("address", ""),
                "phone": "",
                "notes": entry.get("notes", ""),
                "data_sources": entry.get("source", "web"),
            }

    # --- Sort: confirmed first, then uncertain, then likely_not_hoa;
    #     within each group, by parcel count descending ---
    status_order = {"confirmed": 0, "uncertain": 1, "likely_not_hoa": 2}
    rows = sorted(
        master.values(),
        key=lambda r: (status_order.get(r["status"], 9), -r["pdo_parcel_count"], r["hoa_name"]),
    )

    return rows


# ---------------------------------------------------------------------------
# 6. Write output & print summary
# ---------------------------------------------------------------------------

COLUMNS = [
    "hoa_name", "subdivision_name", "status", "pdo_parcel_count",
    "pdo_streets", "state_registry_num", "state_registry_date",
    "website", "address", "phone", "notes", "data_sources",
]


def main():
    rows = build_master()

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    # Summary
    total = len(rows)
    confirmed = sum(1 for r in rows if r["status"] == "confirmed")
    uncertain = sum(1 for r in rows if r["status"] == "uncertain")
    likely_not = sum(1 for r in rows if r["status"] == "likely_not_hoa")
    with_pdo = sum(1 for r in rows if r["pdo_parcel_count"] > 0)
    with_registry = sum(1 for r in rows if r["state_registry_num"])
    with_website = sum(1 for r in rows if r["website"])
    total_parcels = sum(r["pdo_parcel_count"] for r in rows)

    print(f"=== Ashland HOA Master CSV ===")
    print(f"Output: {OUTPUT_CSV}")
    print(f"Total entries:        {total}")
    print(f"  Confirmed HOAs:     {confirmed}")
    print(f"  Uncertain:          {uncertain}")
    print(f"  Likely not HOA:     {likely_not}")
    print(f"  With PDO data:      {with_pdo} ({total_parcels} total parcels)")
    print(f"  With state registry:{with_registry}")
    print(f"  With website:       {with_website}")
    print()
    print("Confirmed HOAs:")
    for r in rows:
        if r["status"] == "confirmed":
            parcels = f" ({r['pdo_parcel_count']} parcels)" if r["pdo_parcel_count"] else ""
            sources = f" [{r['data_sources']}]"
            print(f"  - {r['hoa_name']}{parcels}{sources}")
    print()
    print("Uncertain:")
    for r in rows:
        if r["status"] == "uncertain":
            parcels = f" ({r['pdo_parcel_count']} parcels)" if r["pdo_parcel_count"] else ""
            print(f"  ? {r['hoa_name']}{parcels}")
    print()
    print("Likely not HOA:")
    for r in rows:
        if r["status"] == "likely_not_hoa":
            parcels = f" ({r['pdo_parcel_count']} parcels)" if r["pdo_parcel_count"] else ""
            print(f"  x {r['hoa_name']}{parcels}")


if __name__ == "__main__":
    main()
