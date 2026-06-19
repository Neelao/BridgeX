import { escapeHTML, html } from "../../../shared/utils.js";

export function renderCompanyTypePicker() {
  return html`
    <section class="intent-page">
      <button class="mini-btn" data-action="go-home">Back</button>
      <div class="intent-head">
        <span class="eyebrow">Company access</span>
        <h1>Which kind of organization are you registering?</h1>
        <p>
          BridgeX adjusts the verification form depending on whether this is an established company account or a startup team.
        </p>
      </div>
      <div class="company-type-grid">
        <button class="company-type-card" data-action="choose-company-type" data-company-type="company">
          <b>Company</b>
          <span>Register an established organization. You only enter company details and an authorized admin contact.</span>
        </button>
        <button class="company-type-card" data-action="choose-company-type" data-company-type="startup">
          <b>Startup</b>
          <span>Register a startup team. You enter your personal details plus company verification.</span>
        </button>
      </div>
    </section>
  `;
}

export function renderIntentPicker(entryRole, partnershipAreas) {
  const isRecruiter = entryRole === "recruiter";
  return html`
    <section class="intent-page">
      <button class="mini-btn" data-action="go-home">Back</button>
      <div class="intent-head">
        <span class="eyebrow">${isRecruiter ? "Partner specifications" : "Pitch specifications"}</span>
        <h1>${isRecruiter ? "What are you looking for?" : "What kind of collaboration are you pitching for?"}</h1>
        <p>
          Choose the main area first. BridgeX uses this to shape the onboarding, posting prompts, and AI matching.
        </p>
      </div>
      <div class="assistant-banner">
        <b>BridgeX Assistant</b>
        <span>${isRecruiter ? "I will turn this focus into better posting prompts, suggested partners, and ranking criteria." : "I will use this focus to recommend relevant openings and prepare your pitch questions."}</span>
      </div>
      <div class="area-grid">
        ${partnershipAreas
          .map(
            (area) => html`
              <button class="area-card" data-action="choose-area" data-area="${area.id}">
                <strong>${escapeHTML(area.title)}</strong>
                <span>${escapeHTML(area.text)}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
