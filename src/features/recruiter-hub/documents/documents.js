import { escapeHTML, html } from "../../../shared/utils.js";

export function renderDocuments(state) {
  const rows = state.applications.flatMap((app) => {
    const candidate = state.candidates.find((item) => item.id === app.candidateId);
    const opportunity = state.opportunities.find((item) => item.id === app.opportunityId);
    return (app.documents || []).map((doc) => ({ app, candidate, opportunity, doc }));
  });

  return html`
    <section class="panel">
      <h2>Document Vault</h2>
      <p>Recruiters can review uploaded CVs, proposals, pitch decks, and authorization evidence after company verification.</p>
      <div class="list">
        ${rows
          .map(
            ({ app, candidate, opportunity, doc }) => html`
              <div class="row">
                <div>
                  <h3>${escapeHTML(doc.name)}</h3>
                  <p>${escapeHTML(candidate?.company || "Unknown")} for ${escapeHTML(opportunity?.title || "Unknown posting")}</p>
                </div>
                <div class="actions">
                  <span class="badge">${escapeHTML(doc.kind || "Document")}</span>
                  <button class="mini-btn" data-action="view-candidate" data-app="${app.id}">Open</button>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
