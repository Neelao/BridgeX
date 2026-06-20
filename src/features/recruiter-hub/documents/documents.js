import { escapeHTML, html } from "../../../shared/utils.js";

export function renderDocuments(state, user) {
  const isCandidate = user?.role === "candidate";

  let rows;
  if (isCandidate) {
    const myCandidateIds = new Set(
      state.candidates.filter((c) => c.userId === user.id).map((c) => c.id)
    );
    rows = state.applications
      .filter((app) => myCandidateIds.has(app.candidateId))
      .flatMap((app) => {
        const opportunity = state.opportunities.find((o) => o.id === app.opportunityId);
        const candidate = state.candidates.find((c) => c.id === app.candidateId);
        return (app.documents || []).map((doc) => ({ app, candidate, opportunity, doc }));
      });
  } else {
    rows = state.applications.flatMap((app) => {
      const candidate = state.candidates.find((c) => c.id === app.candidateId);
      const opportunity = state.opportunities.find((o) => o.id === app.opportunityId);
      return (app.documents || []).map((doc) => ({ app, candidate, opportunity, doc }));
    });
  }

  return html`
    <section class="panel">
      <h2>${isCandidate ? "My Uploaded Documents" : "Document Vault"}</h2>
      <p>${
        isCandidate
          ? "Documents you have attached to your applications."
          : "Review uploaded CVs, proposals, pitch decks, and authorization evidence after company verification."
      }</p>
      ${
        rows.length === 0
          ? `<div class="empty"><p>${
              isCandidate
                ? "No documents uploaded yet. Apply to a posting and attach a file to see it here."
                : "No documents uploaded yet."
            }</p></div>`
          : html`
              <div class="list">
                ${rows
                  .map(
                    ({ app, candidate, opportunity, doc }) => html`
                      <div class="row">
                        <div>
                          <h3>${escapeHTML(doc.name)}</h3>
                          <p>${
                            isCandidate
                              ? `For ${escapeHTML(opportunity?.title || "Unknown posting")}`
                              : `${escapeHTML(candidate?.company || "Unknown")} — ${escapeHTML(opportunity?.title || "Unknown posting")}`
                          }</p>
                        </div>
                        <div class="actions">
                          <span class="badge">${escapeHTML(doc.kind || "Document")}</span>
                          ${!isCandidate ? `<button class="mini-btn" data-action="view-candidate" data-app="${app.id}">Open</button>` : ""}
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
      }
    </section>
  `;
}
