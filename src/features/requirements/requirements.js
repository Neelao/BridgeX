import { escapeHTML, html } from "../../shared/utils.js";

export function renderRequirements(state) {
  return html`
    <section class="split">
      <form class="panel form" id="opportunity-form">
        <h2>Post Partnership Requirement</h2>
        <div class="field">
          <label>Title</label>
          <input name="title" placeholder="Sustainability reporting partner" required />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" placeholder="Describe the bridge you want to build between companies..." required></textarea>
        </div>
        <div class="field">
          <label>Must-haves</label>
          <textarea name="mustHaves" placeholder="Comma-separated: ESG reporting, secure data handling, APAC rollout" required></textarea>
        </div>
        <div class="field">
          <label>Nice-to-haves</label>
          <textarea name="niceToHaves" placeholder="Carbon accounting, multilingual support, dashboard analytics"></textarea>
        </div>
        <button class="primary" type="submit">Create Posting</button>
      </form>

      <section class="panel">
        <h2>Open Postings</h2>
        <div class="list">
          ${state.opportunities
            .map(
              (opp) => html`
                <article class="card">
                  <div class="actions" style="justify-content: space-between">
                    <h3>${escapeHTML(opp.title)}</h3>
                    <span class="badge good">${escapeHTML(opp.status)}</span>
                  </div>
                  <p>${escapeHTML(opp.description)}</p>
                  <p><b>Must:</b> ${escapeHTML(opp.mustHaves)}</p>
                  <p><b>Nice:</b> ${escapeHTML(opp.niceToHaves || "None listed")}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}
