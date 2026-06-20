import { badgeClass, escapeHTML, html, truncate } from "../../../shared/utils.js";

export function renderDocuments(state, user) {
  const isCandidate = user?.role === "candidate";

  let rows;
  if (isCandidate) {
    const myCandidateIds = new Set(
      state.candidates.filter((c) => c.userId === user.id).map((c) => c.id)
    );
    rows = state.applications
      .filter((app) => myCandidateIds.has(app.candidateId))
      .map((app) => {
        const opportunity = state.opportunities.find((o) => o.id === app.opportunityId);
        const candidate = state.candidates.find((c) => c.id === app.candidateId);
        return { app, candidate, opportunity, doc: (app.documents || [])[0] || app.resume || null };
      });
  } else {
    rows = state.applications.map((app) => {
      const candidate = state.candidates.find((c) => c.id === app.candidateId);
      const opportunity = state.opportunities.find((o) => o.id === app.opportunityId);
      return { app, candidate, opportunity, doc: (app.documents || [])[0] || app.resume || null };
    });
  }

  return html`
    <section class="documents-page ${isCandidate ? "candidate-documents-page" : ""}">
      <div class="documents-hero panel">
        <div>
          <span class="hero-pill">${isCandidate ? "My Documents" : "Document Vault"}</span>
          <h2>${isCandidate ? "Documents attached to your pitches" : "Candidate documents with AI context"}</h2>
          <p>${
            isCandidate
              ? "Each card shows the company opportunity, your pitch summary, the exact file attached, and how BridgeX AI interpreted the evidence."
              : "Review each candidate's submitted file together with the company requirement, AI scan, interview status, and proposal context."
          }</p>
        </div>
        <div class="documents-stats">
          <span><b>${rows.length}</b> applications</span>
          <span><b>${rows.filter((row) => row.doc).length}</b> files</span>
          <span><b>${rows.filter((row) => row.app.interview).length}</b> interviews</span>
        </div>
      </div>
      ${
        rows.length === 0
          ? `<div class="empty"><p>${
              isCandidate
                ? "No documents yet. Apply to a posting and attach one file to see it here."
                : "No candidate documents yet."
            }</p></div>`
          : html`
              <div class="document-card-grid ${isCandidate ? "candidate-document-card-grid" : ""}">
                ${rows
                  .map(
                    ({ app, candidate, opportunity, doc }) => {
                      const score = app.interview?.summary?.score ?? app.analysis?.score ?? 0;
                      const statusBadge = app.interview ? `<span class="badge good">AI interview complete</span>` : app.invitedToInterview ? `<span class="badge warn">AI interview pending</span>` : `<span class="badge">Not invited</span>`;
                      const documentDetails = html`
                        <div class="document-detail-head">
                          <div class="company-dot">${escapeHTML((candidate?.company || opportunity?.title || "?").slice(0, 1))}</div>
                          <div>
                            <h3>${escapeHTML(opportunity?.title || "Unknown posting")}</h3>
                            <p>${escapeHTML(candidate?.company || "Unknown company")} · ${escapeHTML(candidate?.name || "Unknown pitcher")} · ${escapeHTML(candidate?.role || "Partner lead")}</p>
                          </div>
                          <span class="badge ${badgeClass(score)}">
                            ${app.interview?.summary?.score ?? app.analysis?.score ?? "—"}${app.analysis || app.interview ? "% fit" : ""}
                          </span>
                        </div>

                        <div class="document-context">
                          <div>
                            <b>Company need</b>
                            <p>${escapeHTML(truncate(opportunity?.description || "No description available.", 220))}</p>
                          </div>
                          <div>
                            <b>Must-haves</b>
                            <div class="post-tags">
                              ${(opportunity?.mustHaves || "No must-haves listed")
                                .split(",")
                                .slice(0, 5)
                                .map((item) => `<span>${escapeHTML(item.trim())}</span>`)
                                .join("")}
                            </div>
                          </div>
                          <div>
                            <b>${isCandidate ? "Your pitch" : "Candidate pitch"}</b>
                            <p>${escapeHTML(truncate(app.proposalText || app.whyApply || "No pitch text submitted.", 260))}</p>
                          </div>
                        </div>

                        <div class="submitted-file-row">
                          <span class="file-icon">${escapeHTML((doc?.name || "DOC").split(".").pop()?.slice(0, 3).toUpperCase() || "DOC")}</span>
                          <div class="file-info">
                            <b>${doc ? escapeHTML(doc.name) : "No file attached"}</b>
                            <small>${doc ? escapeHTML(doc.kind || "Submitted document") : "The pitcher did not attach a document."}</small>
                          </div>
                          <span class="badge">${escapeHTML(app.status)}</span>
                        </div>

                        ${app.analysis?.documentScan ? html`
                          <div class="document-ai-summary">
                            <b>AI document scan</b>
                            <p>${app.analysis.documentScan.confidence}/100 evidence confidence — ${escapeHTML(app.analysis.documentScan.summary)}</p>
                            <div class="scan-keypoints">
                              ${app.analysis.documentScan.keyPoints.slice(0, 2).map((point) => html`
                                <div>
                                  <b>${escapeHTML(point.label)}</b>
                                  <span>${escapeHTML(point.value)}</span>
                                </div>
                              `).join("")}
                            </div>
                          </div>
                        ` : ""}

                        <div class="document-detail-actions">
                          ${!isCandidate ? `<button class="primary" data-action="view-candidate" data-app="${app.id}">Open Candidate</button>` : `<button class="ghost" data-route="dashboard">Back to Dashboard</button>`}
                          ${statusBadge}
                        </div>
                      `;

                      if (isCandidate) {
                        return html`
                          <details class="document-bubble-card">
                            <summary>
                              <div class="document-bubble-main">
                                <div class="company-dot">${escapeHTML((opportunity?.title || "?").slice(0, 1))}</div>
                                <div>
                                  <h3>${escapeHTML(opportunity?.title || "Unknown posting")}</h3>
                                  <p>${escapeHTML(opportunity?.company || "Company")} · ${doc ? escapeHTML(doc.name) : "No file attached"}</p>
                                </div>
                              </div>
                              <div class="document-bubble-meta">
                                <span class="badge ${badgeClass(score)}">${score || "—"}${score ? "% fit" : ""}</span>
                                ${statusBadge}
                                <span class="bubble-chevron">⌄</span>
                              </div>
                            </summary>
                            <div class="document-bubble-body">
                              ${documentDetails}
                            </div>
                          </details>
                        `;
                      }

                      return html`
                        <article class="document-detail-card">
                          ${documentDetails}
                        </article>
                      `;
                    }
                  )
                  .join("")}
              </div>
            `
      }
    </section>
  `;
}
