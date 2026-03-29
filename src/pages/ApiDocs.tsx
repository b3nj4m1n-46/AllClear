export default function ApiDocs() {
  return (
    <div className="guide-container">
      <header className="guide-header">
        <h1>API Integration</h1>
        <p className="subtitle">
          Use the parcel ID system to link any community project to
          property-level data
        </p>
      </header>

      <section className="guide-section">
        <h2>The Idea</h2>
        <p>
          Every parcel in Jackson County has a unique tax account number
          assigned by the county assessor. We layer a privacy-preserving
          hash on top of it, creating a universal identifier that any
          community project can use to link data to a specific property —
          without exposing owner information in public-facing contexts.
        </p>
        <p>
          A fire preparedness survey, a defensible space audit, a tree
          canopy inventory, a neighborhood watch signup — all keyed to the
          same parcel. The parcel becomes a hub of community data.
        </p>
      </section>

      <section className="guide-section">
        <h2>Identifier System</h2>
        <div className="api-id-diagram">
          <div className="id-box">
            <span className="id-label">Tax Account</span>
            <span className="id-value">10094079</span>
            <span className="id-desc">County-assigned, stable, public record</span>
          </div>
          <span className="id-arrow">→</span>
          <div className="id-box">
            <span className="id-label">Hash Code</span>
            <span className="id-value">
              <code>DPTDmjo1</code>
            </span>
            <span className="id-desc">Privacy-preserving, URL-safe, unique per parcel+role</span>
          </div>
          <span className="id-arrow">→</span>
          <div className="id-box">
            <span className="id-label">Survey URL</span>
            <span className="id-value">/s/DPTDmjo1</span>
            <span className="id-desc">QR-scannable, auto-populates with property data</span>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h2>REST API</h2>

        <div className="api-endpoint">
          <div className="api-method get">GET</div>
          <code>/api/parcel/:hash</code>
          <p>Look up a parcel by its hash code. Returns property details.</p>
          <div className="api-example">
            <strong>Request</strong>
            <pre>GET /api/parcel/DPTDmjo1</pre>
            <strong>Response</strong>
            <pre>{`{
  "hash_code": "DPTDmjo1",
  "account": "10094079",
  "role": "owner",
  "owner_name": "SMITH JOHN R",
  "situs_address": "245 OAK ST",
  "mailing_address": "245 OAK ST, ASHLAND, OR 97520",
  "acreage": 0.18,
  "year_built": 1952,
  "land_value": 165000,
  "imp_value": 210000,
  "prop_class": "101",
  "build_code": 131,
  "evac_zone": "ASH-008",
  "city": "ASHLAND"
}`}</pre>
          </div>
        </div>

        <div className="api-endpoint">
          <div className="api-method get">GET</div>
          <code>/api/parcels?search=&city=&role=&page=&limit=</code>
          <p>
            Search and browse parcels. Supports filtering by city
            (ASHLAND, MEDFORD, etc.), role (owner/occupant), and
            free-text search across address, owner, account, and
            subdivision.
          </p>
          <div className="api-example">
            <strong>Request</strong>
            <pre>GET /api/parcels?city=ASHLAND&search=OAK&role=owner&limit=5</pre>
            <strong>Response</strong>
            <pre>{`{
  "parcels": [...],
  "page": 1,
  "limit": 5,
  "total": 47,
  "pages": 10
}`}</pre>
          </div>
        </div>

        <div className="api-endpoint">
          <div className="api-method post">POST</div>
          <code>/api/survey/:hash</code>
          <p>
            Submit survey response data linked to a parcel. Any project
            can use this pattern — the hash ties the response to the
            parcel without the submitter needing to know the account
            number.
          </p>
          <div className="api-example">
            <strong>Request</strong>
            <pre>{`POST /api/survey/DPTDmjo1
Content-Type: application/json

{
  "respondent_name": "John Smith",
  "defensible_space": "partial",
  "has_fire_plan": "yes",
  "wants_assessment": true
}`}</pre>
          </div>
        </div>

        <div className="api-endpoint">
          <div className="api-method get">GET</div>
          <code>/api/stats</code>
          <p>Dashboard statistics — total parcels, response count, response rate.</p>
        </div>
      </section>

      <section className="guide-section">
        <h2>Integration Patterns</h2>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="step-num">1</span>
            <div>
              <strong>QR-Based Field Collection</strong>
              <p>
                Print the hash as a QR code on any physical material —
                postcards, door hangers, yard signs. When scanned, your
                app receives the hash, looks up the parcel, and presents
                a form pre-filled with property data. Response auto-links
                to the parcel.
              </p>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">2</span>
            <div>
              <strong>Field Assessment Tool</strong>
              <p>
                An assessor visits a property, scans the QR code (or
                enters the address), and the app pulls the parcel record.
                They complete their assessment form — defensible space
                rating, vegetation clearance, roof type — and submit.
                The data is linked to the parcel by account number.
              </p>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">3</span>
            <div>
              <strong>Community Dashboard</strong>
              <p>
                Aggregate survey responses by evacuation zone, HOA, or
                neighborhood. Show participation rates, identify gaps in
                coverage, track improvement over time. The parcel ID is
                the join key across all data sources.
              </p>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">4</span>
            <div>
              <strong>Multi-Project Hub</strong>
              <p>
                Register additional projects that write data to the same
                parcel records. A fire survey, a tree inventory, a solar
                assessment, a neighborhood emergency contact list — all
                linked by the same account number. Each project adds its
                own data layer without duplicating the base parcel
                information.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h2>Data Coverage</h2>
        <table className="guide-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Records</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ashland parcels</td>
              <td>11,473</td>
              <td>Jackson County ArcGIS</td>
            </tr>
            <tr>
              <td>Jackson County parcels</td>
              <td>103,433</td>
              <td>Jackson County ArcGIS</td>
            </tr>
            <tr>
              <td>Evacuation zones</td>
              <td>357 zones</td>
              <td>County evac zone service</td>
            </tr>
            <tr>
              <td>HOA dossiers</td>
              <td>31 HOAs</td>
              <td>OR SOS, PDO, web research</td>
            </tr>
            <tr>
              <td>Subdivisions</td>
              <td>198</td>
              <td>Jackson County PDO</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="guide-section">
        <h2>Getting Started</h2>
        <p>
          The API is currently running locally for demonstration. To
          integrate with your project:
        </p>
        <ol className="guide-ordered-list">
          <li>Contact us to discuss your use case and get API access</li>
          <li>We provide your project with API credentials</li>
          <li>
            Use the <code>/api/parcel/:hash</code> endpoint to look up
            parcels and link your project data to the parcel account
          </li>
          <li>
            Submit data via your project-specific endpoint — we help
            you design the schema
          </li>
        </ol>
      </section>
    </div>
  );
}
