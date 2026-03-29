import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-container">
      <header className="home-hero">
        <h1>AllClear</h1>
        <p className="hero-subtitle">
          Your neighborhood isn't AllClear until you are.
        </p>
      </header>

      <section className="home-section">
        <h2>The Problem</h2>
        <p>
          Southern Oregon faces escalating wildfire risk, but fire preparedness
          efforts are fragmented. County agencies don't know which properties
          have defensible space. HOAs lack standardized tools. Homeowners don't
          know where to start. And when fire comes, there's no parcel-level
          data connecting preparedness to outcomes.
        </p>
        <p>
          The result: 104,000+ parcels across Jackson County with no unified
          picture of community fire readiness.
        </p>
      </section>

      <section className="home-section">
        <h2>What We Built</h2>
        <p>
          AllClear connects every tax parcel in Jackson County to a
          personalized fire preparedness survey via QR-coded postcards.
          Every property gets a unique code. Scan it, and the survey
          auto-populates with your property data — no manual entry, instant
          association to your tax lot.
        </p>

        <div className="home-stats">
          <div className="stat-card">
            <span className="stat-number">11,473</span>
            <span className="stat-label">Ashland parcels</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">17,032</span>
            <span className="stat-label">Postcards to mail</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">31</span>
            <span className="stat-label">HOAs identified</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">104,617</span>
            <span className="stat-label">County-wide parcels</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2>How It Works</h2>
        <div className="home-steps">
          <div className="step">
            <span className="step-num">1</span>
            <div>
              <strong>Postcard arrives</strong>
              <p>
                Each property owner receives a postcard with a unique QR code.
                If the owner lives off-site, a second card goes to the
                occupant addressed to "Current Resident."
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div>
              <strong>Scan and respond</strong>
              <p>
                The QR links to a survey pre-filled with the property address,
                owner name, and building data. The respondent answers questions
                about defensible space, roof type, evacuation plans, and more.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div>
              <strong>Data flows to the parcel</strong>
              <p>
                Every response is linked to the tax lot account number.
                Aggregate by HOA, neighborhood, fire district, or evacuation
                zone for community-level insight.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <div>
              <strong>Action at every level</strong>
              <p>
                Homeowners get free assessments. HOAs get community scorecards.
                Fire districts see which areas need outreach. Everyone benefits
                from a shared, parcel-level picture of readiness.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2>Data Sources</h2>
        <ul className="home-sources">
          <li>
            <strong>Jackson County ArcGIS</strong> — 104,617 parcels with
            owner, address, building type, assessed value, and tax lot ID
          </li>
          <li>
            <strong>Jackson County PDO</strong> — Subdivision plat data
            linking parcels to platted communities
          </li>
          <li>
            <strong>Oregon Secretary of State</strong> — HOA nonprofit
            registrations and registered agents
          </li>
          <li>
            <strong>HOA websites and public records</strong> — Board contacts,
            CC&Rs, Firewise certifications, meeting schedules
          </li>
        </ul>
      </section>

      <section className="home-section home-cta">
        <h2>See It In Action</h2>
        <div className="cta-buttons">
          <Link to="/postcard" className="cta-btn primary">
            View Postcard Demo
          </Link>
          <Link to="/database" className="cta-btn secondary">
            Browse Parcel Database
          </Link>
        </div>
      </section>
    </div>
  );
}
