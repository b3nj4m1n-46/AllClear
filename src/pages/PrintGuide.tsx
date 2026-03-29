import { useState } from "react";

export default function PrintGuide() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (type: "ashland" | "county") => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export/${type}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_mailers.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Make sure the server is running.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="guide-container">
      <header className="guide-header">
        <h1>Print Guide</h1>
        <p className="subtitle">
          Everything you need to get postcards printed and mailed
        </p>
      </header>

      <section className="guide-section">
        <h2>What You Get</h2>
        <p>
          A single CSV file containing one row per postcard. Each row includes
          the recipient name, full mailing address, and a unique survey URL
          that encodes into a QR code. The print house handles the rest.
        </p>
        <div className="guide-fields">
          <h4>CSV Columns</h4>
          <table className="guide-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>recipient_name</code></td>
                <td>Name or "CURRENT RESIDENT"</td>
                <td>SMITH JOHN R</td>
              </tr>
              <tr>
                <td><code>mail_to_line1</code></td>
                <td>Street address</td>
                <td>245 OAK ST</td>
              </tr>
              <tr>
                <td><code>mail_to_city</code></td>
                <td>City</td>
                <td>ASHLAND</td>
              </tr>
              <tr>
                <td><code>mail_to_state</code></td>
                <td>State</td>
                <td>OR</td>
              </tr>
              <tr>
                <td><code>mail_to_zip</code></td>
                <td>ZIP code</td>
                <td>97520</td>
              </tr>
              <tr>
                <td><code>survey_url</code></td>
                <td>Unique URL for QR code</td>
                <td>https://example.com/s/k7Xm2p</td>
              </tr>
              <tr>
                <td><code>role</code></td>
                <td>Owner or occupant</td>
                <td>owner</td>
              </tr>
              <tr>
                <td><code>account</code></td>
                <td>Tax lot account number</td>
                <td>10094079</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="guide-section">
        <h2>Step by Step</h2>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="step-num">1</span>
            <div>
              <strong>Download the CSV</strong>
              <p>
                Choose Ashland-only (17,032 postcards) or the full county
                (158,634 postcards). The file contains every postcard that
                needs to be printed and mailed.
              </p>
              <div className="download-btns">
                <button
                  onClick={() => handleDownload("ashland")}
                  disabled={downloading}
                  className="download-btn"
                >
                  Ashland (17,032 cards)
                </button>
                <button
                  onClick={() => handleDownload("county")}
                  disabled={downloading}
                  className="download-btn secondary"
                >
                  Full County (158,634 cards)
                </button>
              </div>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">2</span>
            <div>
              <strong>Choose a print partner</strong>
              <p>
                Any print house that supports variable data printing (VDP)
                and QR code generation can handle this. Recommended services:
              </p>
              <ul className="guide-list">
                <li>
                  <strong>Click2Mail</strong> — USPS-integrated, uploads CSV
                  directly, generates QR codes from URL column, handles
                  postage and mailing
                </li>
                <li>
                  <strong>PostcardMania</strong> — Full-service design + print
                  + mail, good for large runs with custom design
                </li>
                <li>
                  <strong>4over</strong> — Trade printer, cheaper per unit,
                  you supply the print-ready PDF template
                </li>
                <li>
                  <strong>Local print shop</strong> — Most shops with digital
                  presses can do variable data. Bring the CSV and the postcard
                  design
                </li>
              </ul>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">3</span>
            <div>
              <strong>Provide the postcard design</strong>
              <p>Standard postcard size: 6" x 4" (USPS First-Class postcard rate).</p>
              <div className="guide-layout">
                <div className="layout-card">
                  <strong>Front</strong>
                  <p>
                    Fire preparedness messaging. Use the design from the
                    Postcard Preview page or create your own. This side is
                    the same for every card.
                  </p>
                </div>
                <div className="layout-card">
                  <strong>Back</strong>
                  <p>
                    Variable data side. Tell the print house to place:
                  </p>
                  <ul>
                    <li>QR code (from <code>survey_url</code>) on the left</li>
                    <li>Recipient address block on the right</li>
                    <li>Messaging copy between QR and address</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">4</span>
            <div>
              <strong>Upload and mail</strong>
              <p>
                Upload the CSV to your print partner. Map the columns to
                their template fields. They print, apply postage, and drop
                at USPS. Most services deliver within 5-7 business days.
              </p>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">5</span>
            <div>
              <strong>Monitor responses</strong>
              <p>
                As recipients scan their QR codes and complete surveys,
                responses flow into the database linked to their parcel
                account number. Use the Database page to track response
                rates by neighborhood, HOA, or evacuation zone.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h2>Postcard Counts</h2>
        <table className="guide-table">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Parcels</th>
              <th>Owner Cards</th>
              <th>Occupant Cards</th>
              <th>Total Cards</th>
              <th>Est. Postage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ashland</td>
              <td>11,473</td>
              <td>11,473</td>
              <td>5,559</td>
              <td>17,032</td>
              <td>$9,368</td>
            </tr>
            <tr>
              <td>Jackson County</td>
              <td>103,433</td>
              <td>103,433</td>
              <td>55,201</td>
              <td>158,634</td>
              <td>$87,249</td>
            </tr>
          </tbody>
        </table>
        <p className="guide-note">
          Postage estimated at $0.55/card (USPS First-Class postcard rate).
          Print costs vary by vendor and volume — typically $0.08-0.15/card
          for large runs.
        </p>
      </section>

      <section className="guide-section">
        <h2>Why Two Cards Per Property?</h2>
        <p>
          When the property owner's mailing address differs from the property
          address, we send two postcards: one to the owner (at their mailing
          address, addressed by name) and one to the occupant (at the property,
          addressed to "CURRENT RESIDENT"). This ensures both the person
          responsible for the property and the person living there have the
          opportunity to participate.
        </p>
      </section>
    </div>
  );
}
