import { useEffect, useState } from "react";

interface Nursery {
  id: number;
  name: string;
  business_type: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  supply_categories: string;
}

type Scope = "local" | "ships_here";

export default function Resources() {
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("local");
  const [loading, setLoading] = useState(true);

  const fetchNurseries = (s: Scope, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ scope: s, limit: "100" });
    if (q) params.set("search", q);
    fetch(`/api/nurseries?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setNurseries(data.nurseries || []);
        setTotal(data.total || 0);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNurseries(scope, search);
  }, [scope]);

  const handleSearch = () => fetchNurseries(scope, search);

  const scopeLabel = scope === "local" ? "Southern Oregon" : "Ships to Pacific NW";

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Resources</h1>
        <p className="subtitle">
          Local nurseries, fire-resistant plant suppliers, and landscaping partners
        </p>
      </header>

      <section className="content-section">
        <h2>Fire-Safe Landscaping</h2>
        <p>
          One of the most effective ways to protect your property is through
          fire-resistant landscaping and defensible space. These nurseries
          can help you find the right plants for your property.
        </p>

        <div className="resource-tips">
          <h3>Defensible Space Zones</h3>
          <div className="zone-guide">
            <div className="zone-item">
              <span className="zone-number">Zone 0</span>
              <span className="zone-range">0-5 ft</span>
              <p>Ember-resistant zone. Use hardscape, gravel, and non-combustible materials immediately around your home.</p>
            </div>
            <div className="zone-item">
              <span className="zone-number">Zone 1</span>
              <span className="zone-range">5-30 ft</span>
              <p>Lean, clean, and green. Low-growing, well-irrigated, fire-resistant plants. Remove dead vegetation.</p>
            </div>
            <div className="zone-item">
              <span className="zone-number">Zone 2</span>
              <span className="zone-range">30-100 ft</span>
              <p>Reduce fuel. Space trees and shrubs to prevent fire spread. Remove ladder fuels.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2 style={{ textAlign: "center" }}>Nurseries ({total})</h2>

        <div className="nursery-controls">
          <div className="search-bar nursery-search">
            <input
              type="text"
              placeholder="Search by name, city, or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          <div className="scope-toggle">
            <button
              className={scope === "local" ? "active" : ""}
              onClick={() => setScope("local")}
            >
              Local
            </button>
            <button
              className={scope === "ships_here" ? "active" : ""}
              onClick={() => setScope("ships_here")}
            >
              Ships Here
            </button>
          </div>

          <p className="help-text" style={{ margin: 0 }}>
            {scope === "local"
              ? "Nurseries located in southern Oregon. Visit in person or arrange local pickup."
              : "Nurseries across Oregon that ship to the Pacific Northwest region."}
          </p>
        </div>

        {loading ? (
          <p>Loading nurseries...</p>
        ) : nurseries.length === 0 ? (
          <p>No nurseries found. Try a different search or scope.</p>
        ) : (
          <div className="nursery-grid">
            {nurseries.map((n) => (
              <div key={n.id} className="nursery-resource-card">
                <div className="nursery-name">{n.name}</div>
                <div className="nursery-location">{n.city}, {n.state} {n.zip}</div>
                {n.business_type && (
                  <div className="nursery-type">{n.business_type}</div>
                )}
                {n.phone && <div className="nursery-contact">Tel: {n.phone}</div>}
                {n.email && <div className="nursery-contact">{n.email}</div>}
                {n.website && (
                  <a
                    href={n.website.startsWith("http") ? n.website : `https://${n.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nursery-link"
                  >
                    Visit Website
                  </a>
                )}
                {n.supply_categories && (
                  <div className="nursery-categories">
                    {n.supply_categories.split(";").slice(0, 5).map((c, j) => (
                      <span key={j} className="category-tag">{c.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <h2>Additional Resources</h2>
        <div className="resource-links">
          <a href="https://www.ashland.or.us/Page.asp?NavID=16709" target="_blank" rel="noopener noreferrer">
            Ashland Fire & Rescue -- Fire Adapted Communities
          </a>
          <a href="https://www.firewise.org/" target="_blank" rel="noopener noreferrer">
            Firewise USA -- National Fire Protection Association
          </a>
          <a href="https://www.readyforwildfire.org/prepare-for-wildfire/get-set/defensible-space/" target="_blank" rel="noopener noreferrer">
            CAL FIRE -- Defensible Space Guidelines
          </a>
          <a href="https://catalog.extension.oregonstate.edu/pnw590" target="_blank" rel="noopener noreferrer">
            OSU Extension -- Fire-Resistant Plants for Oregon
          </a>
        </div>
      </section>
    </div>
  );
}
