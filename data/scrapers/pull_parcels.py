"""
Pull all parcels from Jackson County ArcGIS REST API.

Usage:
  python pull_parcels.py                    # Ashland only (default)
  python pull_parcels.py --all              # Entire Jackson County
  python pull_parcels.py --city MEDFORD     # Specific city
"""

import argparse
import csv
import json
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = (
    "https://spatial.jacksoncountyor.gov/arcgis/rest/services"
    "/OpenData/ReferenceData/MapServer/3/query"
)

FIELDS = [
    "OBJECTID",
    "FEEOWNER",
    "CONTRACT",
    "INCAREOF",
    "SITEADD",
    "ADDRESSNUM",
    "STREETNAME",
    "CITY",
    "STATE",
    "ZIPCODE",
    "ADDRESS1",
    "ADDRESS2",
    "ACCOUNT",
    "MAPNUMBER",
    "MAPLOT",
    "TM_MAPLOT",
    "TAXLOT",
    "LOTTYPE",
    "ACREAGE",
    "IMPVALUE",
    "LANDVALUE",
    "YEARBLT",
    "PROPCLASS",
    "TAXCODE",
    "COMMSQFT",
    "LOTDEPTH",
    "LOTWIDTH",
    "BUILDCODE",
    "ASSESSIMP",
    "ASSESSLAND",
    "NEIGHBORHO",
    "SCHEDULECO",
]

PAGE_SIZE = 1000
RETRY_DELAY = 2
MAX_RETRIES = 3


def query_count(where: str) -> int:
    params = urllib.parse.urlencode({
        "where": where,
        "returnCountOnly": "true",
        "f": "json",
    })
    url = f"{BASE_URL}?{params}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.loads(resp.read())
    return data["count"]


def query_page(where: str, offset: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "where": where,
        "outFields": ",".join(FIELDS),
        "resultOffset": str(offset),
        "resultRecordCount": str(PAGE_SIZE),
        "orderByFields": "OBJECTID ASC",
        "returnGeometry": "false",
        "f": "json",
    })
    url = f"{BASE_URL}?{params}"

    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                data = json.loads(resp.read())
            if "error" in data:
                raise RuntimeError(f"API error: {data['error']}")
            return [f["attributes"] for f in data.get("features", [])]
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                print(f"  retry {attempt + 1}/{MAX_RETRIES}: {e}")
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                raise


def pull_all(where: str, output_path: Path):
    total = query_count(where)
    print(f"parcel-pull: {total} parcels match: {where}")

    all_records = []
    offset = 0

    while offset < total:
        page = query_page(where, offset)
        if not page:
            break
        all_records.extend(page)
        offset += len(page)
        pct = min(100, offset * 100 // total)
        print(f"  [{pct:3d}%] {offset}/{total} records")

    # Write CSV
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for rec in all_records:
            writer.writerow(rec)

    print(f"parcel-pull: wrote {len(all_records)} records to {output_path}")
    return all_records


def main():
    parser = argparse.ArgumentParser(
        description="Pull parcel data from Jackson County ArcGIS"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Pull entire county (104k+ parcels)"
    )
    parser.add_argument(
        "--city", type=str, default=None,
        help="Filter by city name (e.g. ASHLAND, MEDFORD)"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output CSV path"
    )
    args = parser.parse_args()

    if args.all:
        where = "1=1"
        default_output = "jackson_county_parcels.csv"
    elif args.city:
        city = args.city.upper()
        where = f"CITY = '{city}'"
        default_output = f"{city.lower()}_parcels.csv"
    else:
        where = "CITY = 'ASHLAND'"
        default_output = "ashland_parcels.csv"

    output_path = Path(args.output or default_output)
    pull_all(where, output_path)


if __name__ == "__main__":
    main()
