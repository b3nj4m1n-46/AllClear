import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Parcel {
  hash_code: string;
  account: string;
  role: string;
  owner_name: string;
  situs_address: string;
  mailing_address: string;
  acreage: number;
  year_built: number;
  land_value: number;
  imp_value: number;
  prop_class: string;
  map_taxlot: string;
  subdivision: string | null;
  build_code: number | null;
  comm_sqft: number | null;
  lot_depth: number | null;
  lot_width: number | null;
}

// Oregon standard building codes (1xx=SFR, 2xx=Manuf, 3xx=Multi, 5xx=Comm, 6xx=Ind, 9xx=Other)
// Last digit: 1=1sty, 2=1.5sty, 3=1.75sty, 4=2sty, 7=w/bsmt, 8=w/bsmt
const BUILD_CODES: Record<number, string> = {
  // Single Family Residential
  111: "SFR 1-story", 112: "SFR 1-story", 121: "SFR 1-story w/bsmt", 122: "SFR 1-story w/bsmt",
  123: "SFR 1-story", 124: "SFR 1-story", 127: "SFR 1-story w/bsmt", 128: "SFR 1-story w/bsmt",
  131: "SFR 1.5-story", 132: "SFR 1.5-story w/bsmt", 133: "SFR 1.75-story", 134: "SFR 2-story",
  137: "SFR 1.5-story w/bsmt", 138: "SFR 1.5-story w/bsmt",
  141: "SFR 2-story", 142: "SFR 2-story w/bsmt", 143: "SFR 2.5-story", 144: "SFR 2-story",
  147: "SFR 2-story w/bsmt", 148: "SFR 2-story w/bsmt",
  151: "SFR tri-level", 152: "SFR split-level", 153: "SFR split-entry", 154: "SFR multi-level",
  157: "SFR tri-level w/bsmt", 158: "SFR split w/bsmt",
  161: "SFR multi-level", 162: "SFR multi-level", 163: "SFR multi-level", 164: "SFR multi-level",
  167: "SFR multi w/bsmt", 168: "SFR multi w/bsmt",
  171: "SFR A-frame", 172: "SFR A-frame", 173: "SFR A-frame", 174: "SFR A-frame",
  181: "SFR dome/geo", 183: "SFR dome/geo", 184: "SFR dome/geo",
  // Manufactured
  231: "Manufactured 1.5-story", 232: "Manufactured 1.5-story", 233: "Manufactured 1.75-story", 234: "Manufactured 2-story",
  241: "Manufactured 2-story", 242: "Manufactured 2-story", 243: "Manufactured 2.5-story",
  // Multi-family
  300: "Multi-family", 331: "Duplex", 332: "Duplex", 333: "Duplex", 334: "Duplex",
  341: "Triplex", 342: "Triplex", 344: "Triplex", 354: "4-plex",
  431: "Apartment", 432: "Apartment", 434: "Apartment", 442: "Apartment",
  // Commercial
  500: "Commercial", 502: "Retail store", 503: "Retail", 505: "Shopping center", 506: "Restaurant",
  507: "Fast food", 508: "Bar/lounge", 509: "Commercial", 512: "Retail",
  520: "Office", 521: "Office", 523: "Office", 530: "Office", 531: "Medical office",
  532: "Medical office", 533: "Medical office", 534: "Medical office", 536: "Bank",
  539: "Office", 540: "Hotel/motel", 541: "Hotel/motel", 542: "Hotel/motel", 543: "Hotel/motel",
  550: "Service station", 551: "Service station", 553: "Auto repair", 554: "Auto sales",
  555: "Auto sales", 556: "Car wash", 560: "Warehouse", 561: "Warehouse",
  562: "Warehouse", 563: "Warehouse", 564: "Warehouse",
  571: "Funeral home", 572: "Funeral home", 574: "Veterinary",
  576: "Kennel", 580: "Theater", 581: "Theater", 582: "Recreation",
  584: "Fitness/gym", 585: "Bowling", 589: "Recreation",
  // Industrial
  600: "Industrial", 602: "Light industrial", 603: "Light industrial",
  605: "Warehouse/industrial", 610: "Heavy industrial", 611: "Manufacturing",
  612: "Manufacturing", 613: "Manufacturing", 614: "Manufacturing",
  615: "Manufacturing", 616: "Manufacturing",
  620: "Mill/plant", 621: "Mill/plant", 622: "Mill/plant", 623: "Mill/plant", 624: "Mill/plant",
  632: "Processing", 643: "Winery",
  650: "Utility", 651: "Utility", 652: "Utility", 656: "Utility",
  671: "Grain storage", 673: "Cold storage", 674: "Storage", 676: "Storage", 677: "Mini storage",
  685: "Shop/utility", 686: "Shop/utility", 687: "Shop/utility", 688: "Shop/utility",
  690: "Misc industrial", 692: "Misc industrial",
  // Institutional
  700: "Church", 703: "Church", 710: "School", 713: "School",
  751: "Hospital", 770: "Government", 780: "Lodge/club", 790: "Institutional",
  // Recreation / Agricultural
  811: "Barn", 830: "Greenhouse", 840: "Stable/arena", 841: "Stable",
  843: "Riding arena", 850: "Cabin/camp", 852: "Cabin", 860: "Mobile park",
  862: "RV park", 871: "Marina",
  // Misc structures
  940: "Misc structure", 941: "Garage", 942: "Carport", 945: "Parking",
  949: "Storage", 951: "Deck/patio", 952: "Pool", 953: "Pool",
  959: "Misc", 961: "Fence", 962: "Retaining wall", 963: "Paving",
  972: "Yard improvement", 973: "Yard improvement",
};

function decodeBuildCode(code: number | null): string {
  if (!code) return "";
  return BUILD_CODES[code] || `Code ${code}`;
}

interface ParcelsResponse {
  parcels: Parcel[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const SURVEY_BASE = window.location.origin;

export default function Database() {
  const [data, setData] = useState<ParcelsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("ASHLAND");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (city) params.set("city", city);

    fetch(`/api/parcels?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [page, search, role, city]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="db-container">
      <header className="db-header">
        <h1>Parcel Database</h1>
        <p className="subtitle">
          {data ? `${data.total.toLocaleString()} records` : "Loading..."}
          {search && ` matching "${search}"`}
        </p>
      </header>

      <div className="db-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search address, owner, account, subdivision..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            Search
          </button>
        </form>
        <div className="filter-row">
          <button
            className={`filter-btn ${role === "" ? "active" : ""}`}
            onClick={() => { setRole(""); setPage(1); }}
          >
            All
          </button>
          <button
            className={`filter-btn ${role === "owner" ? "active" : ""}`}
            onClick={() => { setRole("owner"); setPage(1); }}
          >
            Owners
          </button>
          <button
            className={`filter-btn ${role === "occupant" ? "active" : ""}`}
            onClick={() => { setRole("occupant"); setPage(1); }}
          >
            Occupants
          </button>
          <span className="filter-spacer" />
          <div
            className="toggle-switch"
            onClick={() => { setCity(city === "ASHLAND" ? "ALL" : "ASHLAND"); setPage(1); }}
          >
            <span className={`toggle-label ${city === "ASHLAND" ? "active" : ""}`}>Ashland</span>
            <div className={`toggle-track ${city === "ALL" ? "on" : ""}`}>
              <div className="toggle-thumb" />
            </div>
            <span className={`toggle-label ${city === "ALL" ? "active" : ""}`}>County</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="parcel-list">
            {data?.parcels.map((p) => (
              <div
                key={p.hash_code}
                className={`parcel-row ${expanded === p.hash_code ? "expanded" : ""}`}
                onClick={() =>
                  setExpanded(expanded === p.hash_code ? null : p.hash_code)
                }
              >
                <div className="parcel-summary">
                  <div className="parcel-main">
                    <span className="parcel-address">
                      {p.situs_address || "No situs address"}
                    </span>
                    <span className="parcel-owner">{p.owner_name}</span>
                    {p.role === "owner" &&
                      p.mailing_address &&
                      p.situs_address &&
                      !p.mailing_address
                        .toUpperCase()
                        .includes(p.situs_address.toUpperCase()) && (
                        <span className="parcel-mailing">
                          Mail to: {p.mailing_address}
                        </span>
                      )}
                  </div>
                  <div className="parcel-tags">
                    <span className={`tag tag-${p.role}`}>{p.role}</span>
                    {p.subdivision && (
                      <span className="tag tag-sub">{p.subdivision}</span>
                    )}
                  </div>
                </div>

                {expanded === p.hash_code && (
                  <div className="parcel-detail">
                    <div className="detail-qr">
                      <QRCodeSVG
                        value={`${SURVEY_BASE}/s/${p.hash_code}`}
                        size={120}
                        level="M"
                        fgColor="#c44d2a"
                        bgColor="white"
                      />
                      <a
                        href={`${SURVEY_BASE}/s/${p.hash_code}`}
                        target="_blank"
                        rel="noopener"
                        className="detail-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open Survey
                      </a>
                    </div>
                    <div className="detail-fields">
                      <div className="detail-row">
                        <span>Account</span>
                        <span>{p.account}</span>
                      </div>
                      <div className="detail-row">
                        <span>Hash</span>
                        <span>
                          <code>{p.hash_code}</code>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Mailing</span>
                        <span>{p.mailing_address}</span>
                      </div>
                      <div className="detail-row">
                        <span>Map/Taxlot</span>
                        <span>{p.map_taxlot}</span>
                      </div>
                      {p.year_built > 0 && (
                        <div className="detail-row">
                          <span>Year Built</span>
                          <span>{p.year_built}</span>
                        </div>
                      )}
                      {p.acreage > 0 && (
                        <div className="detail-row">
                          <span>Acreage</span>
                          <span>{p.acreage}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span>Value</span>
                        <span>
                          $
                          {(
                            (p.land_value || 0) + (p.imp_value || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                      {p.build_code ? (
                        <div className="detail-row">
                          <span>Building</span>
                          <span>{decodeBuildCode(p.build_code)}</span>
                        </div>
                      ) : null}
                      {p.lot_depth && p.lot_width ? (
                        <div className="detail-row">
                          <span>Lot Size</span>
                          <span>{p.lot_width} x {p.lot_depth} ft</span>
                        </div>
                      ) : null}
                      {p.comm_sqft ? (
                        <div className="detail-row">
                          <span>Comm. SqFt</span>
                          <span>{p.comm_sqft.toLocaleString()}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data && data.pages > 1 && (
            <div className="pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="page-btn"
              >
                Previous
              </button>
              <span className="page-info">
                Page {data.page} of {data.pages}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
                className="page-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
