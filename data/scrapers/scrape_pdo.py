"""
Jackson County Property Data Online (PDO) Subdivision Scraper

Scrapes parcel records from pdo.jacksoncountyor.gov by subdivision,
identifying which subdivisions/HOAs have parcels in a given city.

Usage:
    python scrape_pdo.py                    # Ashland-only scan
    python scrape_pdo.py --all              # Full county scan
    python scrape_pdo.py --test             # Test with Billings Ranch only
    python scrape_pdo.py --subdivision "X"  # Scrape a specific subdivision
"""

import argparse
import csv
import re
import sys
import time
from dataclasses import dataclass, fields
from pathlib import Path
from urllib.parse import unquote

import requests


BASE_URL = "https://pdo.jacksoncountyor.gov/pdo"
RECORDS_PER_PAGE = 5
REQUEST_DELAY = 1.5  # seconds between requests, be polite


@dataclass
class ParcelRecord:
    subdivision: str
    lot: str
    vol_page: str
    owner: str
    account_num: str
    map_taxlot: str
    situs_address: str
    city: str
    status: str


def create_session() -> requests.Session:
    """Create a session with cookies from the PDO main page."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (PDO Subdivision Research)",
    })
    r = session.get(f"{BASE_URL}/")
    r.raise_for_status()
    return session


def fetch_subdivision_list(session: requests.Session) -> list[dict]:
    """Fetch all subdivision names and their query parameters."""
    r = session.get(f"{BASE_URL}/text.cfm?myGroup=sub_name")
    r.raise_for_status()

    match = re.search(
        r"<select[^>]*name=[\"']sub_name[\"'][^>]*>(.*?)</select>",
        r.text,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        raise RuntimeError("could not find subdivision dropdown")

    select_html = match.group(0)
    opts = re.findall(
        r'<option\s+value="([^"]*)"[^>]*>([^<]*)</option>',
        select_html,
        re.IGNORECASE,
    )

    subdivisions = []
    for url_value, name in opts:
        # Parse strSubName and strVolPg from the option value URL
        sub_match = re.search(r"strSubName=([^&]*)", url_value)
        vol_match = re.search(r"strVolPg=([^&]*)", url_value)
        if sub_match and vol_match:
            subdivisions.append({
                "name": name.strip(),
                "sub_name_encoded": sub_match.group(1),
                "sub_name": unquote(sub_match.group(1)),
                "vol_page": unquote(vol_match.group(1)),
            })

    return subdivisions


def query_subdivision(
    session: requests.Session,
    sub_name: str,
    vol_page: str,
) -> requests.Response:
    """Submit a subdivision search and return the first page of results."""
    data = {
        "frmSubName": sub_name,
        "frmVolPg": vol_page,
        "myGroup": "sub_name",
        "asmtYear": "2017",
        "sub_name": "",
        "sub_lot": "",
        "sub_blk": "",
        "GetMap": "Submit",
    }
    r = session.post(
        f"{BASE_URL}/Ora_query.cfm?bByPassCache=True",
        data=data,
    )
    r.raise_for_status()
    return r


def get_page(session: requests.Session, start_row: int) -> requests.Response:
    """Fetch a specific page of results (uses session-cached query)."""
    r = session.get(f"{BASE_URL}/Ora_query.cfm?myStartRow={start_row}")
    r.raise_for_status()
    return r


def parse_total_records(html: str) -> int:
    """Extract total record count from results page."""
    match = re.search(r"(\d+)\s+Records?\s+found", html)
    return int(match.group(1)) if match else 0


def parse_records(html: str, subdivision: str, vol_page: str) -> list[ParcelRecord]:
    """Parse parcel records from a results page HTML."""
    records = []

    # Split by record boundaries - each record has an account link
    # Pattern: showSitusTable followed by account number
    record_blocks = re.split(r"(?=<td class=\"smStandardRight\">&nbsp;\s*(?:</td>|<br>))", html)

    # Alternative: find all owner/account/situs groups
    # Extract owners
    owner_pattern = re.compile(
        r'Owner\s*</td>\s*<td[^>]*>\s*([^<]+)',
        re.DOTALL | re.IGNORECASE,
    )

    # Find account numbers
    account_pattern = re.compile(
        r'Account #.*?class="smStandard">([^<]+)',
        re.DOTALL | re.IGNORECASE,
    )

    # Find map & taxlot
    maptl_pattern = re.compile(
        r'Map & TL.*?class="smStandard">\s*([^<]+)',
        re.DOTALL | re.IGNORECASE,
    )

    # Find situs addresses
    situs_pattern = re.compile(
        r'showSitusTable\d+[^>]*>.*?<td class="smStandardBox"[^>]*>\s*([^<]+)',
        re.DOTALL,
    )

    # Find status
    status_pattern = re.compile(
        r'Status\s*</td>\s*<td[^>]*>\s*(?:<font[^>]*>)?\s*([^<]+)',
        re.DOTALL | re.IGNORECASE,
    )

    # Find subdivision lot number
    lot_pattern = re.compile(
        r'Subdivision\s*</td>\s*<td[^>]*>\s*[^<]*<br>\s*(\d+)',
        re.DOTALL | re.IGNORECASE,
    )

    # Split into individual record sections using "Record N" markers
    record_sections = re.split(r"Record\s+\d+", html)
    # First split is the header, skip it
    if len(record_sections) > 1:
        record_sections = record_sections[1:]
    else:
        # Try alternate split on the view details links
        record_sections = re.split(
            r"View Assessment &amp; Planning Details", html
        )
        if len(record_sections) > 1:
            record_sections = record_sections[1:]

    for section in record_sections:
        # Owner - may have multiple lines
        owners = []
        # First owner line has "Owner" label
        om = re.search(
            r'Owner\s*</td>\s*(?:<td[^>]*>\s*([^<]+?)\s*</td>)?',
            section,
            re.DOTALL | re.IGNORECASE,
        )
        if om and om.group(1):
            owners.append(om.group(1).strip())

        # Additional owner lines (no label, just value cells after Owner)
        # These appear as rows with empty first cell
        extra_owners = re.findall(
            r'<td class="smStandardRight"[^>]*>\s*</td>\s*<td class="smStandardBox"[^>]*>\s*([^<]+)',
            section,
            re.IGNORECASE,
        )
        for eo in extra_owners:
            cleaned = eo.strip()
            if cleaned and cleaned not in owners:
                owners.append(cleaned)

        owner_str = "; ".join(owners) if owners else ""

        # Account
        am = account_pattern.search(section)
        account = am.group(1).strip() if am else ""

        # Map & Taxlot
        mm = maptl_pattern.search(section)
        map_tl = mm.group(1).strip() if mm else ""

        # Situs address
        sm = situs_pattern.search(section)
        full_addr = sm.group(1).strip() if sm else ""
        # Normalize whitespace
        full_addr = re.sub(r"\s+", " ", full_addr)

        # Split city from address (city is last word)
        city = ""
        situs = full_addr
        if full_addr:
            # City names in the address: last word(s) after the street
            # Pattern: "619 VANSANT ST ASHLAND" or "405 NEVADA ST W ASHLAND"
            # Known cities to look for
            for city_name in [
                "ASHLAND", "MEDFORD", "CENTRAL POINT", "EAGLE POINT",
                "JACKSONVILLE", "TALENT", "PHOENIX", "WHITE CITY",
                "GOLD HILL", "ROGUE RIVER", "SHADY COVE", "BUTTE FALLS",
                "PROSPECT", "TRAIL",
            ]:
                if full_addr.upper().endswith(city_name):
                    city = city_name
                    situs = full_addr[: -len(city_name)].strip()
                    break

        # Status
        stm = status_pattern.search(section)
        status = stm.group(1).strip().replace("*", "").strip() if stm else ""

        # Lot number
        lm = lot_pattern.search(section)
        lot = lm.group(1).strip() if lm else ""

        if account:  # only add if we got a valid record
            records.append(
                ParcelRecord(
                    subdivision=subdivision,
                    lot=lot,
                    vol_page=vol_page,
                    owner=owner_str,
                    account_num=account,
                    map_taxlot=map_tl,
                    situs_address=situs,
                    city=city,
                    status=status,
                )
            )

    return records


def scrape_subdivision(
    session: requests.Session,
    sub: dict,
    city_filter: str | None = None,
) -> list[ParcelRecord]:
    """Scrape all records for a subdivision. If city_filter is set,
    only scrape fully if page 1 contains that city."""
    name = sub["name"]
    sub_name = sub["sub_name"]
    vol_page = sub["vol_page"]

    # Query page 1
    r = query_subdivision(session, sub_name, vol_page)
    total = parse_total_records(r.text)

    if total == 0:
        return []

    # Check city filter on page 1
    if city_filter:
        if city_filter.upper() not in r.text.upper():
            return []

    records = parse_records(r.text, name, vol_page)
    sys.stdout.write(
        f"  [+] {name}: {total} records"
    )
    sys.stdout.flush()

    # Paginate through remaining pages
    for start_row in range(RECORDS_PER_PAGE + 1, total + 1, RECORDS_PER_PAGE):
        time.sleep(REQUEST_DELAY)
        r = get_page(session, start_row)
        page_records = parse_records(r.text, name, vol_page)
        records.extend(page_records)

    # If city_filter, keep only matching records but report the full subdivision
    if city_filter:
        matching = [r for r in records if r.city.upper() == city_filter.upper()]
        sys.stdout.write(f" ({len(matching)} in {city_filter})\n")
        return matching
    else:
        sys.stdout.write("\n")
        return records


def write_csv(records: list[ParcelRecord], output_path: Path):
    """Write records to CSV."""
    fieldnames = [f.name for f in fields(ParcelRecord)]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow({
                fn: getattr(record, fn) for fn in fieldnames
            })


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Jackson County PDO subdivision data"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Scrape all subdivisions (full county)",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: only scrape Billings Ranch",
    )
    parser.add_argument(
        "--subdivision",
        type=str,
        help="Scrape a specific subdivision by name (partial match)",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output CSV path (default: auto-generated)",
    )
    args = parser.parse_args()

    city_filter = None if args.all else "ASHLAND"
    if args.output:
        output_path = Path(args.output)
    elif args.all:
        output_path = Path("jackson_county_subdivisions.csv")
    else:
        output_path = Path("ashland_subdivisions.csv")

    print("pdo-scraper: initializing session")
    session = create_session()

    print("pdo-scraper: fetching subdivision list")
    subdivisions = fetch_subdivision_list(session)
    print(f"pdo-scraper: found {len(subdivisions)} subdivisions")

    if args.test:
        subdivisions = [
            s for s in subdivisions if "Billings" in s["name"]
        ]
        print(f"pdo-scraper: test mode, filtered to {len(subdivisions)}")

    if args.subdivision:
        query = args.subdivision.lower()
        subdivisions = [
            s for s in subdivisions if query in s["name"].lower()
        ]
        print(
            f"pdo-scraper: filtered to {len(subdivisions)} matching "
            f"'{args.subdivision}'"
        )

    all_records: list[ParcelRecord] = []
    ashland_subdivisions: list[str] = []

    print(f"pdo-scraper: scanning {len(subdivisions)} subdivisions")
    if city_filter:
        print(f"pdo-scraper: filtering for {city_filter}")
    print()

    for i, sub in enumerate(subdivisions, 1):
        prefix = f"[{i}/{len(subdivisions)}]"
        sys.stdout.write(f"{prefix} {sub['name']}...")
        sys.stdout.flush()

        try:
            records = scrape_subdivision(session, sub, city_filter)
        except Exception as e:
            sys.stdout.write(f" [fail] {e}\n")
            continue

        if records:
            all_records.extend(records)
            ashland_subdivisions.append(sub["name"])
            # Already printed by scrape_subdivision
        else:
            sys.stdout.write(" skip\n")

        time.sleep(REQUEST_DELAY)

    print()
    print(f"pdo-scraper: complete")
    print(f"  subdivisions with {city_filter or 'any'} parcels: "
          f"{len(ashland_subdivisions)}")
    print(f"  total records: {len(all_records)}")

    if all_records:
        write_csv(all_records, output_path)
        print(f"  output: {output_path}")

        print()
        print("subdivisions found:")
        # Group by subdivision and count
        sub_counts: dict[str, int] = {}
        for r in all_records:
            sub_counts[r.subdivision] = sub_counts.get(r.subdivision, 0) + 1
        for name, count in sorted(sub_counts.items()):
            print(f"  {count:4d}  {name}")
    else:
        print("  no records found")


if __name__ == "__main__":
    main()
