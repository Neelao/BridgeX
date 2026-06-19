import { escapeHTML, html } from "../../shared/utils.js";

export function renderIntentPicker(entryRole, partnershipAreas) {
  const isRecruiter = entryRole === "recruiter";
  return html`
    <section class="intent-page">
      <button class="mini-btn" data-action="go-home">Back</button>
      <div class="intent-head">
        <span class="eyebrow">${isRecruiter ? "Finding partners" : "Pitching your company"}</span>
        <h1>${isRecruiter ? "What kind of partner are you looking for?" : "What kind of opportunity are you pitching for?"}</h1>
        <p>
          Choose the main area first. BridgeX will shape your feed, postings, and suggested companies around this focus.
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
