import { escapeHTML, html, truncate } from "../../../shared/utils.js";

export function renderCandidateApply(state) {
  const opportunities = state.opportunities.filter((item) => item.status === "open");
  return html`
    <section class="split">
      <form class="panel form" id="application-form">
        <h2>Pitch Your Company</h2>
        <div class="field">
          <label>Posting</label>
          <select name="opportunityId" required>
            ${opportunities.map((opp) => `<option value="${opp.id}">${escapeHTML(opp.title)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Your name</label>
          <input name="name" placeholder="Aisha Tan" required />
        </div>
        <div class="field">
          <label>Company</label>
          <input name="company" placeholder="GreenGrid Analytics" required />
        </div>
        <div class="field">
          <label>Company email</label>
          <input name="email" type="email" placeholder="you@company.com" required />
        </div>
        <div class="field">
          <label>Role</label>
          <input name="role" placeholder="Founder / Partnership Lead" required />
        </div>
        <div class="field">
          <label>Proposal / pitch text</label>
          <textarea name="proposalText" placeholder="Paste the core proposal so the reviewer can compare it against the requirement." required></textarea>
        </div>
        <div class="field">
          <label>CV / proposal / pitch deck</label>
          <input name="document" type="file" accept=".pdf,.doc,.docx,.txt" />
        </div>
        <button class="primary" type="submit">Submit Pitch</button>
      </form>

      <section class="panel">
        <h2>Available Opportunities</h2>
        <div class="list">
          ${opportunities
            .map(
              (opp) => html`
                <article class="card">
                  <h3>${escapeHTML(opp.title)}</h3>
                  <p>${escapeHTML(truncate(opp.description, 180))}</p>
                  <span class="badge">Must-haves ready</span>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}
