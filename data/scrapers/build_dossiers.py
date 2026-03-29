"""
Build HOA dossiers for Ashland, Oregon HOAs.

For each confirmed/uncertain HOA, searches the web for:
- Contact info (address, phone, email)
- Board members / decision makers
- Meeting schedule
- Website & social media
- CC&Rs and governing documents
- Community size (homes, acres)
- Management company
- Fire/emergency preparedness info
- Any other relevant details

Outputs:
- dossiers/<hoa-slug>.md  (one per HOA, readable format)
- ashland_hoa_dossiers.csv (all HOAs, flat format)
"""

import csv
import json
import re
import sys
import time
from dataclasses import dataclass, field, fields, asdict
from pathlib import Path
from textwrap import dedent


# Dossier schema
@dataclass
class HOADossier:
    # Identity
    hoa_name: str = ""
    aka: str = ""  # alternate names
    subdivision_name: str = ""
    status: str = ""  # confirmed, uncertain

    # Size & scope
    num_homes: str = ""
    num_acres: str = ""
    year_established: str = ""
    property_types: str = ""  # single family, townhome, condo, mixed

    # Contact
    mailing_address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""

    # Leadership & governance
    president: str = ""
    board_members: str = ""  # semicolon-separated
    management_company: str = ""
    management_contact: str = ""

    # Meetings
    meeting_schedule: str = ""  # e.g. "Monthly, 3rd Tuesday 6:30pm"
    meeting_location: str = ""
    annual_meeting: str = ""

    # Documents
    ccr_url: str = ""
    bylaws_url: str = ""
    rules_url: str = ""
    other_docs: str = ""  # semicolon-separated URLs or descriptions

    # Financial
    hoa_dues: str = ""  # monthly/annual amount if found
    budget_url: str = ""

    # Fire preparedness (key for our use case)
    firewise_certified: str = ""  # yes/no/unknown
    fire_plan: str = ""
    emergency_contacts: str = ""
    fire_related_notes: str = ""

    # Registration
    state_registry_num: str = ""
    ein: str = ""  # IRS EIN if found
    nonprofit_type: str = ""

    # Meta
    pdo_parcel_count: str = ""
    pdo_streets: str = ""
    data_sources: str = ""
    last_updated: str = ""
    notes: str = ""
    source_urls: str = ""  # semicolon-separated URLs consulted


def load_master_csv(path: Path) -> list[dict]:
    """Load the master HOA CSV, return confirmed + uncertain entries."""
    with open(path) as f:
        reader = csv.DictReader(f)
        return [
            row for row in reader
            if row["status"] in ("confirmed", "uncertain")
        ]


def slug(name: str) -> str:
    """Convert HOA name to filesystem-safe slug."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def write_markdown(dossier: HOADossier, output_dir: Path):
    """Write a single dossier as a markdown file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{slug(dossier.hoa_name)}.md"

    sections = []

    # Header
    sections.append(f"# {dossier.hoa_name}")
    if dossier.aka:
        sections.append(f"**Also known as:** {dossier.aka}")
    if dossier.subdivision_name:
        sections.append(f"**Subdivision:** {dossier.subdivision_name}")
    sections.append(f"**Status:** {dossier.status}")
    sections.append("")

    # Overview
    overview_lines = []
    if dossier.num_homes:
        overview_lines.append(f"- **Homes:** {dossier.num_homes}")
    if dossier.num_acres:
        overview_lines.append(f"- **Acres:** {dossier.num_acres}")
    if dossier.year_established:
        overview_lines.append(f"- **Established:** {dossier.year_established}")
    if dossier.property_types:
        overview_lines.append(f"- **Property types:** {dossier.property_types}")
    if dossier.pdo_parcel_count and dossier.pdo_parcel_count != "0":
        overview_lines.append(
            f"- **PDO parcels:** {dossier.pdo_parcel_count}"
        )
    if dossier.pdo_streets:
        overview_lines.append(f"- **Streets:** {dossier.pdo_streets}")
    if overview_lines:
        sections.append("## Overview")
        sections.extend(overview_lines)
        sections.append("")

    # Contact
    contact_lines = []
    if dossier.mailing_address:
        contact_lines.append(f"- **Address:** {dossier.mailing_address}")
    if dossier.phone:
        contact_lines.append(f"- **Phone:** {dossier.phone}")
    if dossier.email:
        contact_lines.append(f"- **Email:** {dossier.email}")
    if dossier.website:
        contact_lines.append(f"- **Website:** [{dossier.website}]({dossier.website})")
    if contact_lines:
        sections.append("## Contact")
        sections.extend(contact_lines)
        sections.append("")

    # Leadership
    leadership_lines = []
    if dossier.president:
        leadership_lines.append(f"- **President:** {dossier.president}")
    if dossier.board_members:
        leadership_lines.append(f"- **Board:** {dossier.board_members}")
    if dossier.management_company:
        leadership_lines.append(
            f"- **Management company:** {dossier.management_company}"
        )
    if dossier.management_contact:
        leadership_lines.append(
            f"- **Management contact:** {dossier.management_contact}"
        )
    if leadership_lines:
        sections.append("## Leadership & Governance")
        sections.extend(leadership_lines)
        sections.append("")

    # Meetings
    meeting_lines = []
    if dossier.meeting_schedule:
        meeting_lines.append(f"- **Schedule:** {dossier.meeting_schedule}")
    if dossier.meeting_location:
        meeting_lines.append(f"- **Location:** {dossier.meeting_location}")
    if dossier.annual_meeting:
        meeting_lines.append(f"- **Annual meeting:** {dossier.annual_meeting}")
    if meeting_lines:
        sections.append("## Meetings")
        sections.extend(meeting_lines)
        sections.append("")

    # Documents
    doc_lines = []
    if dossier.ccr_url:
        doc_lines.append(f"- **CC&Rs:** [{dossier.ccr_url}]({dossier.ccr_url})")
    if dossier.bylaws_url:
        doc_lines.append(
            f"- **Bylaws:** [{dossier.bylaws_url}]({dossier.bylaws_url})"
        )
    if dossier.rules_url:
        doc_lines.append(
            f"- **Rules:** [{dossier.rules_url}]({dossier.rules_url})"
        )
    if dossier.other_docs:
        doc_lines.append(f"- **Other:** {dossier.other_docs}")
    if doc_lines:
        sections.append("## Governing Documents")
        sections.extend(doc_lines)
        sections.append("")

    # Financial
    fin_lines = []
    if dossier.hoa_dues:
        fin_lines.append(f"- **Dues:** {dossier.hoa_dues}")
    if dossier.budget_url:
        fin_lines.append(
            f"- **Budget:** [{dossier.budget_url}]({dossier.budget_url})"
        )
    if fin_lines:
        sections.append("## Financial")
        sections.extend(fin_lines)
        sections.append("")

    # Fire preparedness
    fire_lines = []
    if dossier.firewise_certified:
        fire_lines.append(
            f"- **Firewise certified:** {dossier.firewise_certified}"
        )
    if dossier.fire_plan:
        fire_lines.append(f"- **Fire plan:** {dossier.fire_plan}")
    if dossier.emergency_contacts:
        fire_lines.append(
            f"- **Emergency contacts:** {dossier.emergency_contacts}"
        )
    if dossier.fire_related_notes:
        fire_lines.append(f"- **Notes:** {dossier.fire_related_notes}")
    if fire_lines:
        sections.append("## Fire Preparedness")
        sections.extend(fire_lines)
        sections.append("")

    # Registration
    reg_lines = []
    if dossier.state_registry_num:
        reg_lines.append(
            f"- **OR SOS Registry:** {dossier.state_registry_num}"
        )
    if dossier.ein:
        reg_lines.append(f"- **EIN:** {dossier.ein}")
    if dossier.nonprofit_type:
        reg_lines.append(f"- **Nonprofit type:** {dossier.nonprofit_type}")
    if reg_lines:
        sections.append("## Registration")
        sections.extend(reg_lines)
        sections.append("")

    # Notes
    if dossier.notes:
        sections.append("## Notes")
        sections.append(dossier.notes)
        sections.append("")

    # Sources
    if dossier.source_urls:
        sections.append("## Sources")
        for url in dossier.source_urls.split(";"):
            url = url.strip()
            if url:
                sections.append(f"- [{url}]({url})")
        sections.append("")

    path.write_text("\n".join(sections), encoding="utf-8")
    return path


def write_csv(dossiers: list[HOADossier], output_path: Path):
    """Write all dossiers to a single CSV."""
    fieldnames = [f.name for f in fields(HOADossier)]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for d in dossiers:
            writer.writerow(asdict(d))


def seed_from_master(master_row: dict) -> HOADossier:
    """Create initial dossier from master CSV row."""
    d = HOADossier()
    d.hoa_name = master_row.get("hoa_name", "")
    d.subdivision_name = master_row.get("subdivision_name", "")
    d.status = master_row.get("status", "")
    d.pdo_parcel_count = master_row.get("pdo_parcel_count", "")
    d.pdo_streets = master_row.get("pdo_streets", "")
    d.state_registry_num = master_row.get("state_registry_num", "")
    d.website = master_row.get("website", "")
    d.mailing_address = master_row.get("address", "")
    d.phone = master_row.get("phone", "")
    d.notes = master_row.get("notes", "")
    d.data_sources = master_row.get("data_sources", "")
    return d


def get_enrichment_data() -> dict[str, dict]:
    """Web research findings, keyed by HOA name."""
    return {
        "Billings Ranch HOA, Inc.": {
            "num_homes": "71 lots",
            "year_established": "2008",
            "property_types": "Single family, row houses",
            "mailing_address": "P.O. Box 1259, Ashland, OR 97520",
            "president": "Vicki G",
            "board_members": "Vicki G; Dave K; Ty A; MaryJane I; Gary D.",
            "meeting_schedule": "Regular board meetings (see website for dates)",
            "annual_meeting": "May (historically first Tuesday)",
            "ccr_url": "https://www.billingsranchhoa.com/ccrs-and-bylaws.html",
            "other_docs": "ARC applications; Board minutes 2009-2026",
            "source_urls": "https://www.billingsranchhoa.com/",
        },
        "Riverwalk Homeowners Association": {
            "aka": "Riverwalk of Ashland",
            "num_homes": "175+",
            "property_types": "Single family (each uniquely designed)",
            "mailing_address": "241 Maple St Ste 100, Ashland, OR 97520",
            "state_registry_num": "55075890",
            "ccr_url": "https://riverwalkofashland.org/hoa-governing-documents",
            "rules_url": "https://riverwalkofashland.org/hoa-rules-and-regulations",
            "other_docs": "Emergency info page; Architectural/landscape request form",
            "notes": "Uses HOA Start platform. Has emergency info page at /emergency-information",
            "source_urls": "https://riverwalkofashland.org/; https://riverwalkofashland.org/hoa-governing-documents",
        },
        "Bud's Dairy Homeowners Association": {
            "year_established": "2010",
            "property_types": "Single family",
            "source_urls": "https://www.dandb.com/businessdirectory/budsdairyhomeownersassociation-ashland-or-12637479.html",
        },
        "Pavilion Condominium Association": {
            "property_types": "Condominium",
            "management_company": "Mountain Meadows management",
            "ccr_url": "https://mountainmeadowsashland.com/wp-content/uploads/2021/07/CCRs_Amendments.pdf",
            "notes": "Part of Mountain Meadows community. CC&Rs and bylaws available via Mountain Meadows website.",
            "source_urls": "https://mountainmeadowsashland.com/mmoa/",
        },
        "Creekside Cottages Condominium Association": {
            "property_types": "Condominium",
            "state_registry_num": "13485396",
            "source_urls": "https://www.oregondb.com/company/13485396/creekside-cottages-condominium-association",
        },
        "Five Turret Townhouses HOA": {
            "property_types": "Townhouse",
            "source_urls": "https://www.transparencyhoa.org/associations-preview/or/ashland/five-turret-townhouses-homeowners-association",
        },
        "Deerfield Estates HOA": {
            "property_types": "Single family",
            "other_docs": "Governing documents on Google Sites (login may be required)",
            "source_urls": "https://sites.google.com/site/dehapublic/docs",
        },
        "Hamilton Place HOA": {
            "property_types": "Single family",
            "mailing_address": "955 Drew Lane, Ashland, OR 97520",
            "phone": "(541) 488-6965",
        },
        "Ashland Conservancy HOA": {
            "management_company": "FS Residential",
            "management_contact": "Jeffry.Gardunio@fsresidential.com; Help desk: 1-800-870-0010",
            "meeting_schedule": "Monthly, 3rd Wednesday at 6:30 PM at Community Clubhouse",
            "notes": "Architectural Review Committee meets 1st Wednesday monthly. Resident portal: https://ashlandconservancy.connectresident.com/",
            "source_urls": "https://ashlandconservancy.com/",
        },
        "Chautauqua Trace HOA": {
            "property_types": "PUD (Planned Unit Development)",
            "management_company": "CPM Real Estate Services",
            "management_contact": "CPM 718 Black Oak Dr., Ste A., Medford, OR 97504",
            "meeting_schedule": "Monthly board meetings",
            "firewise_certified": "Yes (since 2016)",
            "fire_related_notes": "Firewise USA certified community since 2016",
            "notes": "Website being phased out; may be migrating to new platform",
            "source_urls": "https://chautauquatracehoa.communitysite.com/",
        },
        "Clay Creek Gardens HOA": {
            "property_types": "Single family",
            "notes": "Wix-based website with limited public info",
            "source_urls": "https://ashlandia.wixsite.com/claycreekhoa",
        },
        "East Village HOA": {
            "mailing_address": "258 A St., Ste. 1, PMB 59, Ashland, OR 97520",
            "president": "Judy Butler",
            "email": "jleesbutler@charter.net",
            "board_members": "Judy Butler (President); Fred Stapenhorst (Treasurer, fandbinhawaii@charter.net)",
            "meeting_schedule": "Quarterly (Jan, Apr, Jul, Oct) at 6:00 PM",
            "meeting_location": "Reid, Hanna, Johnson Company, 1101 Siskiyou Blvd., Ashland",
            "annual_meeting": "October",
            "notes": "Historical blog at eastvillagehoa.wordpress.com",
            "source_urls": "https://eastvillagehoaashland.com/",
        },
        "Meadowbrook Park Estates HOA": {
            "num_homes": "59",
            "year_established": "1997",
            "property_types": "Single family (planned community)",
            "meeting_schedule": "Annual meeting Q1 each year; board meetings per calendar",
            "other_docs": "Financial statements 2012-2025; Reserve study; Insurance policies; ARC request forms; Board minutes 2010-2025; OR Revised Statutes HOA guide PDF",
            "notes": "Contact form on website (7+ day response). Management company not identified publicly.",
            "source_urls": "https://www.meadowbrookparkestates.com/",
        },
        "Meadowbrook Park II North Mountain HOA": {
            "property_types": "Single family",
            "notes": "Wix-based website; limited public info available",
            "source_urls": "https://www.meadowbrookparkashlandor.com/",
        },
        "Mountain Meadows Owners Association": {
            "aka": "MMOA",
            "num_homes": "226",
            "num_acres": "27",
            "year_established": "1996",
            "property_types": "Mixed (single family, condos, townhomes)",
            "mailing_address": "855 Mountain Meadows Dr., Ashland, OR 97520",
            "phone": "541-482-1806",
            "ccr_url": "https://mountainmeadowsashland.com/wp-content/uploads/2021/07/CCRs_Amendments.pdf",
            "bylaws_url": "https://mountainmeadowsashland.com/wp-content/uploads/2020/07/2016-MMOA-Amend-Restate-Bylaws-Complete.pdf",
            "rules_url": "https://mountainmeadowsashland.com/wp-content/uploads/2021/07/MMOA-Rules-and-Regulations-revision7.14.21-4.pdf",
            "notes": "Includes sub-associations: Pavilion Condo, Parkside Condo, Hillside, Plum Ridge. Board of 7 directors, elections in January.",
            "source_urls": "https://mountainmeadowsashland.com/mmoa/",
        },
        "Mountain Ranch Property Owners Association (MRPOA)": {
            "num_homes": "74",
            "num_acres": "26",
            "year_established": "Late 1970s",
            "property_types": "Single family",
            "mailing_address": "1467 Siskiyou Blvd #341, Ashland, OR 97520",
            "email": "mrpoa.board@gmail.com",
            "president": "Trina Sanford",
            "board_members": "Trina Sanford (President); Christine Kiekhaefer (VP); Jennifer Reiber Kyle (Secretary); Nathan Sanford (Treasurer); Kerry Metlen; Steve Lambert",
            "ccr_url": "https://mrpoa-ashland.com/AMENDED-and-RESTATED-CCRs.pdf",
            "bylaws_url": "https://mrpoa-ashland.com/AMENDED-and-RESTATED-BYLAWS.pdf",
            "other_docs": "Articles of Incorporation; ORS 94 reference; Property info update form; Common area access form; Work request form",
            "hoa_dues": "$150 transfer fee for new owners (enacted 2020); Operating fund + reserve fund",
            "fire_related_notes": "Free Firewise assessment available through Ashland Fire & Rescue's Fire Adapted Communities program. Firewise page on website.",
            "notes": "South end of Ashland, below Oredson-Todd Trailhead. Access via Tolman Creek Rd at Green Meadows Way and Siskiyou Blvd at Bellview Ave. Central park and greenway trails.",
            "source_urls": "https://mrpoa-ashland.com/; https://mrpoa-ashland.com/governance/; https://mrpoa-ashland.com/firewise/",
        },
        "Fallen Leaf Tract Association": {
            "mailing_address": "580 Elkader St, Ashland, OR 97520",
            "nonprofit_type": "Social Welfare Organization (Housing Owners, Renters)",
            "year_established": "2013",
        },
        "HERSEY HEIGHTS PLANNED UNIT DEVELOPMENT HOA": {
            "property_types": "PUD (Planned Unit Development)",
            "mailing_address": "161 E Hersey St, Ashland, OR 97520",
            "president": "Joan Reichert",
            "board_members": "Joan Reichert (President); Gayle K Frye (Registered Agent); Chella Thomas (Secretary)",
            "state_registry_num": "115906794",
            "nonprofit_type": "Mutual Benefit with Members",
        },
        "KESTREL PARK COTTAGES PHASE II HOA": {
            "year_established": "2023",
            "mailing_address": "444 Nandina St, Ashland, OR 97520",
            "president": "Cass Larkin",
            "board_members": "Cass Larkin (President); Janis Kenny (Secretary)",
            "state_registry_num": "220612691",
            "nonprofit_type": "Public Benefit with Members",
        },
        "Oak Knoll Meadows Homeowners Association": {
            "mailing_address": "241 Maple St Ste 100, Ashland, OR 97520",
            "state_registry_num": "17301110",
            "year_established": "1983",
        },
        "Rosskeen Subdivision HOA": {
            "mailing_address": "356 Otis St, Ashland, OR 97520",
            "state_registry_num": "39279781",
        },
        "Vander Lind HOA": {
            "mailing_address": "410 Guthrie St, Ashland, OR 97520",
            "state_registry_num": "99789498",
        },
        "Chelsea Oaks Condominium Association": {
            "property_types": "Condominium",
            "mailing_address": "854 Twin Pines Cir, Ashland, OR 97520",
            "year_established": "2014",
        },
    }


def enrich_dossier(dossier: HOADossier, data: dict):
    """Apply enrichment data to a dossier, not overwriting existing values."""
    for key, value in data.items():
        if value and hasattr(dossier, key):
            current = getattr(dossier, key)
            if not current:  # only fill empty fields
                setattr(dossier, key, value)
            elif key == "source_urls" and value not in current:
                # Append source URLs
                setattr(dossier, key, f"{current}; {value}")
            elif key == "notes" and value not in current:
                setattr(dossier, key, f"{current}. {value}")


def main():
    master_path = Path("ashland_hoa_master.csv")
    if not master_path.exists():
        print("error: ashland_hoa_master.csv not found")
        sys.exit(1)

    entries = load_master_csv(master_path)
    print(f"dossier-builder: loaded {len(entries)} HOAs from master CSV")

    enrichment = get_enrichment_data()

    dossiers = []
    for entry in entries:
        d = seed_from_master(entry)
        # Apply enrichment if available
        if d.hoa_name in enrichment:
            enrich_dossier(d, enrichment[d.hoa_name])
        d.last_updated = "2026-03-28"
        dossiers.append(d)

    # Write dossiers
    dossier_dir = Path("dossiers")
    csv_path = Path("ashland_hoa_dossiers.csv")

    for d in dossiers:
        md_path = write_markdown(d, dossier_dir)

    write_csv(dossiers, csv_path)

    # Summary
    enriched = sum(1 for d in dossiers if d.hoa_name in enrichment)
    with_website = sum(1 for d in dossiers if d.website)
    with_ccr = sum(1 for d in dossiers if d.ccr_url)
    with_board = sum(1 for d in dossiers if d.board_members)
    with_fire = sum(1 for d in dossiers if d.firewise_certified or d.fire_related_notes)

    print(f"dossier-builder: wrote {len(dossiers)} dossiers")
    print(f"  markdown: {dossier_dir}/")
    print(f"  csv: {csv_path}")
    print()
    print(f"  enriched:      {enriched}/{len(dossiers)}")
    print(f"  with website:  {with_website}")
    print(f"  with CC&Rs:    {with_ccr}")
    print(f"  with board:    {with_board}")
    print(f"  with fire info:{with_fire}")
    print()
    for d in dossiers:
        flags = []
        if d.website: flags.append("web")
        if d.ccr_url: flags.append("ccr")
        if d.board_members: flags.append("board")
        if d.firewise_certified or d.fire_related_notes: flags.append("fire")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        print(f"  {d.hoa_name}{flag_str}")


if __name__ == "__main__":
    main()
