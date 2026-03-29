import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Parcel {
  hash_code: string;
  account: string;
  role: string;
  owner_name: string;
  situs_address: string;
  mailing_address: string;
  acreage: number;
  year_built: number;
}

interface SurveyData {
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string;
  defensible_space: string;
  ember_resistant_roof: string;
  vegetation_clearance: string;
  has_fire_plan: string;
  has_go_bag: string;
  water_source: string;
  evacuation_route: string;
  hoa_name: string;
  wants_assessment: boolean;
  wants_firewise: boolean;
  wants_newsletter: boolean;
  concerns: string;
  notes: string;
}

const INITIAL_SURVEY: SurveyData = {
  respondent_name: "",
  respondent_email: "",
  respondent_phone: "",
  defensible_space: "",
  ember_resistant_roof: "",
  vegetation_clearance: "",
  has_fire_plan: "",
  has_go_bag: "",
  water_source: "",
  evacuation_route: "",
  hoa_name: "",
  wants_assessment: false,
  wants_firewise: false,
  wants_newsletter: false,
  concerns: "",
  notes: "",
};

export default function Survey() {
  const { hash } = useParams<{ hash: string }>();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SurveyData>(INITIAL_SURVEY);

  useEffect(() => {
    if (!hash) return;
    fetch(`/api/parcel/${hash}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid survey code");
        return res.json();
      })
      .then((data) => {
        setParcel(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [hash]);

  const updateField = (field: keyof SurveyData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/survey/${hash}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Failed to submit survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="survey-container">
        <div className="loading">Loading survey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-container">
        <div className="error-card">
          <h2>Survey Not Found</h2>
          <p>
            This survey link is invalid or has expired. Please check the QR code
            on your postcard.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="survey-container">
        <div className="success-card">
          <h2>Thank You!</h2>
          <p>
            Your fire preparedness survey for{" "}
            <strong>{parcel?.situs_address}</strong> has been submitted.
          </p>
          {form.wants_assessment && (
            <p>
              A fire safety assessment specialist will contact you to schedule a
              free assessment.
            </p>
          )}
          <p className="help-text">
            Together we're building a more fire-resilient community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-container">
      <header className="survey-header">
        <h1>Fire Preparedness Survey</h1>
        <p className="subtitle">Jackson County, Oregon</p>
      </header>

      <div className="property-card">
        <h3>Your Property</h3>
        <div className="property-detail">
          <span className="label">Address</span>
          <span className="value">{parcel?.situs_address}</span>
        </div>
        <div className="property-detail">
          <span className="label">Owner</span>
          <span className="value">{parcel?.owner_name}</span>
        </div>
        {parcel?.year_built ? (
          <div className="property-detail">
            <span className="label">Year Built</span>
            <span className="value">{parcel.year_built}</span>
          </div>
        ) : null}
        {parcel?.acreage ? (
          <div className="property-detail">
            <span className="label">Acreage</span>
            <span className="value">{parcel.acreage}</span>
          </div>
        ) : null}
        <div className="property-detail">
          <span className="label">Responding as</span>
          <span className="value role-badge">
            {parcel?.role === "owner" ? "Property Owner" : "Occupant/Tenant"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="form-section">
          <h3>Contact Information</h3>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={form.respondent_name}
              onChange={(e) => updateField("respondent_name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.respondent_email}
              onChange={(e) => updateField("respondent_email", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={form.respondent_phone}
              onChange={(e) => updateField("respondent_phone", e.target.value)}
            />
          </div>
        </section>

        <section className="form-section">
          <h3>Property Fire Safety</h3>

          <div className="field">
            <label>
              Do you maintain defensible space around your property?
            </label>
            <div className="radio-group">
              {["yes", "partial", "no", "unsure"].map((opt) => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name="defensible_space"
                    value={opt}
                    checked={form.defensible_space === opt}
                    onChange={() => updateField("defensible_space", opt)}
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Is your roof ember-resistant (Class A)?</label>
            <div className="radio-group">
              {["yes", "no", "unsure"].map((opt) => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name="ember_resistant_roof"
                    value={opt}
                    checked={form.ember_resistant_roof === opt}
                    onChange={() => updateField("ember_resistant_roof", opt)}
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>How far is vegetation cleared from your home?</label>
            <div className="radio-group">
              {["0-5ft", "5-30ft", "30-100ft", "none", "unsure"].map((opt) => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name="vegetation_clearance"
                    value={opt}
                    checked={form.vegetation_clearance === opt}
                    onChange={() => updateField("vegetation_clearance", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Emergency Preparedness</h3>

          <div className="field">
            <label>Do you have a household fire evacuation plan?</label>
            <div className="radio-group">
              {["yes", "no"].map((opt) => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name="has_fire_plan"
                    value={opt}
                    checked={form.has_fire_plan === opt}
                    onChange={() => updateField("has_fire_plan", opt)}
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Do you have a go-bag ready for evacuation?</label>
            <div className="radio-group">
              {["yes", "partial", "no"].map((opt) => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name="has_go_bag"
                    value={opt}
                    checked={form.has_go_bag === opt}
                    onChange={() => updateField("has_go_bag", opt)}
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="water_source">
              Water source for fire suppression (if any)
            </label>
            <input
              id="water_source"
              type="text"
              placeholder="e.g., garden hose, pond, hydrant, none"
              value={form.water_source}
              onChange={(e) => updateField("water_source", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="evacuation_route">
              Primary evacuation route from your property
            </label>
            <input
              id="evacuation_route"
              type="text"
              placeholder="e.g., Siskiyou Blvd south to I-5"
              value={form.evacuation_route}
              onChange={(e) => updateField("evacuation_route", e.target.value)}
            />
          </div>
        </section>

        <section className="form-section">
          <h3>Community</h3>

          <div className="field">
            <label htmlFor="hoa_name">
              HOA or neighborhood association (if any)
            </label>
            <input
              id="hoa_name"
              type="text"
              placeholder="e.g., Billings Ranch HOA, Mountain Meadows"
              value={form.hoa_name}
              onChange={(e) => updateField("hoa_name", e.target.value)}
            />
          </div>

          <div className="field">
            <label>I'm interested in: (check all that apply)</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.wants_assessment}
                  onChange={(e) =>
                    updateField("wants_assessment", e.target.checked)
                  }
                />
                Free fire safety assessment for my property
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.wants_firewise}
                  onChange={(e) =>
                    updateField("wants_firewise", e.target.checked)
                  }
                />
                Firewise USA community certification program
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.wants_newsletter}
                  onChange={(e) =>
                    updateField("wants_newsletter", e.target.checked)
                  }
                />
                Fire preparedness newsletter and updates
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Anything Else</h3>
          <div className="field">
            <label htmlFor="concerns">
              What are your biggest fire safety concerns?
            </label>
            <textarea
              id="concerns"
              rows={3}
              value={form.concerns}
              onChange={(e) => updateField("concerns", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Additional comments</label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </section>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Survey"}
        </button>
      </form>
    </div>
  );
}
