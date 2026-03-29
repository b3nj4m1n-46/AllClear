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
  subdivision: string | null;
  evac_zone: string | null;
}

const SURVEY_BASE = window.location.origin;

export default function PostcardPreview() {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRandom = () => {
    setLoading(true);
    fetch("/api/random-parcel")
      .then((r) => r.json())
      .then((data) => {
        setParcel(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRandom();
  }, []);

  if (loading || !parcel) {
    return (
      <div className="demo-container">
        <div className="loading">Loading postcard...</div>
      </div>
    );
  }

  const surveyUrl = `${SURVEY_BASE}/s/${parcel.hash_code}`;
  const mailingParts = parcel.mailing_address.split(",").map((s) => s.trim());
  // Parse: "253 N 3RD ST, ASHLAND, OR 97520" -> street, city+state+zip
  const street = mailingParts[0] || "";
  const cityStateZip = mailingParts.slice(1).join(", ");

  return (
    <div className="demo-container">
      <header className="demo-header">
        <h1>Postcard Preview</h1>
        <p className="subtitle">
          Scan the QR code below to test the survey flow
        </p>
        <button className="shuffle-btn" onClick={loadRandom}>
          Shuffle Property
        </button>
      </header>

      <div className="postcard-label">FRONT</div>
      <div className="postcard front">
        <div className="front-bg" />
        <div className="front-content">
          <div className="front-top-bar">ALLCLEAR — JACKSON COUNTY FIRE PREPAREDNESS</div>
          <div className="front-headline">
            <span className="front-big">YOUR HOME.</span>
            <span className="front-big">YOUR NEIGHBORHOOD.</span>
            <span className="front-big accent">YOUR MOVE.</span>
          </div>
          <div className="front-stat-row">
            <div className="front-stat">
              <span className="front-stat-num">48%</span>
              <span className="front-stat-label">of Ashland homes lack defensible space</span>
            </div>
            <div className="front-divider" />
            <div className="front-stat">
              <span className="front-stat-num">2 min</span>
              <span className="front-stat-label">is all it takes to complete your survey</span>
            </div>
          </div>
          <div className="front-bottom-bar">
            <span>FLIP OVER</span>
            <span className="front-arrow">→</span>
            <span>SCAN QR</span>
            <span className="front-arrow">→</span>
            <span>PROTECT YOUR HOME</span>
          </div>
        </div>
      </div>

      <div className="postcard-label">BACK (mailing side)</div>
      <div className="postcard back">
        <div className="back-left">
          <div className="qr-wrapper">
            <QRCodeSVG
              value={surveyUrl}
              size={140}
              level="M"
              fgColor="#c44d2a"
              bgColor="white"
            />
          </div>
          <p className="qr-tagline">
            <strong>Your neighbors are in.</strong>
            <br />
            <strong>Are you?</strong>
          </p>
          <p className="qr-cta">
            Scan to do your part for
            <br />
            our fire-safe community.
          </p>
          {parcel.evac_zone && (
            <p className="qr-zone">
              <strong>Know your zone.</strong>
              <br />
              You are in evacuation zone
              <br />
              <strong>{parcel.evac_zone}</strong>
            </p>
          )}
        </div>
        <div className="back-divider" />
        <div className="back-right">
          <div className="stamp-box">STAMP</div>
          <div className="address-block">
            <div className="address-name">{parcel.owner_name}</div>
            <div className="address-line">{street}</div>
            <div className="address-line">{cityStateZip}</div>
          </div>
        </div>
      </div>

      <div className="postcard-meta">
        <table>
          <tbody>
            <tr>
              <td>Owner</td>
              <td>{parcel.owner_name}</td>
            </tr>
            <tr>
              <td>Property Address</td>
              <td>{parcel.situs_address}</td>
            </tr>
            <tr>
              <td>Mailing Address</td>
              <td>{parcel.mailing_address}</td>
            </tr>
            <tr>
              <td>Account</td>
              <td>{parcel.account}</td>
            </tr>
            <tr>
              <td>Survey Link</td>
              <td>
                <a href={surveyUrl} target="_blank" rel="noopener">
                  {surveyUrl}
                </a>
              </td>
            </tr>
            <tr>
              <td>Recipient</td>
              <td>{parcel.role === "owner" ? "Property Owner" : "Current Resident"}</td>
            </tr>
            {parcel.subdivision && (
              <tr>
                <td>Subdivision</td>
                <td>{parcel.subdivision}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
