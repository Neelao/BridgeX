import { badgeClass, escapeHTML, html, truncate } from "../../shared/utils.js";

function appRows(state) {
  return state.applications
    .map((app) => ({
      app,
      candidate: state.candidates.find((item) => item.id === app.candidateId),
      opportunity: state.opportunities.find((item) => item.id === app.opportunityId),
      score: app.interview?.summary?.score ?? app.analysis?.score ?? 0
    }))
    .sort((a, b) => b.score - a.score);
}

export function renderDashboard(state) {
  const rows = appRows(state);
  const complete = rows.filter((row) => row.app.interview).length;
  const avg = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;

  return html`
    <section class="grid cols-3">
      <div class="panel stat"><span>Open postings</span><b>${state.opportunities.length}</b></div>
      <div class="panel stat"><span>Partner pitches</span><b>${state.applications.length}</b></div>
      <div class="panel stat"><span>Avg fit score</span><b>${avg}</b></div>
    </section>

    <section class="panel">
      <div class="topbar">
        <div>
          <h2>Partner Pipeline</h2>
          <p>${complete} guided pitch session(s) completed. Fit scores combine proposal evidence and interview answers.</p>
        </div>
        <button class="ghost" data-action="analyze-all">Review All</button>
      </div>
      <div class="list">
        ${rows
          .map(
            ({ app, candidate, opportunity, score }) => html`
              <article class="card">
                <div class="row">
                  <div>
                    <div class="actions">
                      <h3>${escapeHTML(candidate?.company || "Unknown company")}</h3>
                      <span class="badge ${badgeClass(score)}">${score || "Pending"} fit</span>
                      <span class="badge">${escapeHTML(app.status)}</span>
                    </div>
                    <p>${escapeHTML(opportunity?.title || "")}</p>
                    <p>${escapeHTML(truncate(app.interview?.summary?.pitchSummary || app.proposalText, 190))}</p>
                    <div class="score-wrap">
                      <div class="score-line"><div class="score-fill" style="--score: ${score}%"></div></div>
                    </div>
                  </div>
                  <div class="actions">
                    <button class="mini-btn" data-action="view-candidate" data-app="${app.id}">Details</button>
                    <button class="mini-btn" data-action="start-interview" data-app="${app.id}">Interview</button>
                    <button class="primary" data-action="schedule" data-app="${app.id}">Connect</button>
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
