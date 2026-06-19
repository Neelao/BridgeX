import { badgeClass, escapeHTML, html, truncate } from "../../shared/utils.js";

export function renderDashboard(state, user) {
  const myOppIds = new Set(
    state.opportunities.filter((opp) => opp.ownerId === user.id).map((opp) => opp.id)
  );

  const oppMap = new Map();
  state.opportunities
    .filter((opp) => myOppIds.has(opp.id))
    .forEach((opp) => {
      const apps = state.applications
        .filter((app) => app.opportunityId === opp.id)
        .map((app) => ({
          app,
          candidate: state.candidates.find((c) => c.id === app.candidateId),
          score: app.interview?.summary?.score ?? app.analysis?.score ?? 0
        }))
        .sort((a, b) => b.score - a.score);
      oppMap.set(opp, apps);
    });

  const allApps = state.applications.filter((app) => myOppIds.has(app.opportunityId));
  const totalApps = allApps.length;
  const complete = allApps.filter((app) => app.interview).length;
  const scores = allApps.map((app) => app.interview?.summary?.score ?? app.analysis?.score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const topScore = scores.length ? Math.max(...scores) : 0;
  const readyMeetings = allApps.filter((app) => app.interview || app.meeting).length;

  return html`
    <section class="dashboard-page">
      <div class="dashboard-hero">
        <div>
          <span class="hero-pill">Verified company workspace</span>
          <h2>Candidate rankings for partnership opportunities</h2>
          <p>AI-screened proposals, interview status, and connection readiness in one clean recruiter view.</p>
        </div>
        <div class="dashboard-verify-card">
          <b>✓ Verified</b>
          <span>Access unlocked after company evidence checks</span>
        </div>
      </div>

      <section class="dashboard-stats">
        <div class="panel stat"><span>Open postings</span><b>${state.opportunities.filter((o) => myOppIds.has(o.id)).length}</b></div>
        <div class="panel stat"><span>Applications received</span><b>${totalApps}</b></div>
        <div class="panel stat"><span>Avg fit score</span><b>${avg || "—"}${avg ? "%" : ""}</b></div>
        <div class="panel stat"><span>Top candidate</span><b>${topScore || "—"}${topScore ? "%" : ""}</b></div>
        <div class="panel stat"><span>Ready for meeting</span><b>${readyMeetings}</b></div>
      </section>

      <section class="dashboard-section">
        <div class="topbar dashboard-section-head">
        <div>
          <h2>Application Pipeline</h2>
          <p>Ranked applications by posting. Invite strong companies to a guided pitch interview.</p>
        </div>
        <button class="ghost" data-action="analyze-all">Re-analyze All</button>
      </div>

      ${
        oppMap.size === 0
          ? `<div class="empty"><p>No applications yet. Share your postings in the feed to start receiving pitches.</p></div>`
          : [...oppMap.entries()]
              .map(
                ([opp, appRows]) => html`
                  <div class="opp-pipeline">
                    <div class="opp-pipeline-head">
                      <h3>${escapeHTML(opp.title)}</h3>
                      <span class="badge">${appRows.length} application${appRows.length !== 1 ? "s" : ""}</span>
                      <span class="badge good">${escapeHTML(opp.status)}</span>
                    </div>

                    ${
                      appRows.length === 0
                        ? `<div class="empty" style="margin-bottom:16px"><p>No applications yet for this posting.</p></div>`
                        : html`
                            <div class="list">
                              ${appRows
                                .map(
                                  ({ app, candidate, score }) => html`
                                    <article class="card ai-summary-card">
                                      <div class="ai-summary-head">
                                        <div class="company-dot">${escapeHTML(candidate?.company?.slice(0, 1) || "?")}</div>
                                        <div>
                                          <h3>${escapeHTML(candidate?.company || "Unknown company")}</h3>
                                          <span>${escapeHTML(candidate?.name || "")} · ${escapeHTML(candidate?.role || "")} · ${escapeHTML(candidate?.email || "")}</span>
                                        </div>
                                        <span class="badge ${badgeClass(score)}">${score || "—"}</span>
                                        <span class="badge">${escapeHTML(app.status)}</span>
                                      </div>

                                      ${
                                        app.whyApply || app.proposalText
                                          ? html`
                                              <div class="ai-why-apply">
                                                <b>Why they applied</b>
                                                <p>${escapeHTML(truncate(app.whyApply || app.proposalText, 300))}</p>
                                              </div>
                                            `
                                          : ""
                                      }

                                      ${
                                        app.resume || (app.documents && app.documents.length)
                                          ? html`
                                              <div class="ai-resume">
                                                ${(app.resume ? [app.resume] : app.documents)
                                                  .map((doc) => `<span class="badge">📄 ${escapeHTML(doc.name)}</span>`)
                                                  .join("")}
                                              </div>
                                            `
                                          : ""
                                      }

                                      ${
                                        app.analysis
                                          ? html`
                                              <div class="ai-analysis">
                                                <div class="ai-analysis-header">
                                                  <b>AI Summary</b>
                                                  <span class="badge ${badgeClass(score)}">${escapeHTML(app.analysis.recommendation)}</span>
                                                </div>
                                                <div class="score-wrap">
                                                  <div class="score-line"><div class="score-fill" style="--score: ${score}%"></div></div>
                                                  <span class="hint">${score}/100 fit score</span>
                                                </div>
                                                ${
                                                  app.analysis.strengths?.length
                                                    ? html`
                                                        <div class="ai-points">
                                                          <span class="ai-label good-label">Strengths</span>
                                                          ${app.analysis.strengths
                                                            .slice(0, 3)
                                                            .map((s) => `<span class="ai-point good">✓ ${escapeHTML(s)}</span>`)
                                                            .join("")}
                                                        </div>
                                                      `
                                                    : ""
                                                }
                                                ${
                                                  app.analysis.risks?.length
                                                    ? html`
                                                        <div class="ai-points">
                                                          <span class="ai-label risk-label">Gaps to probe</span>
                                                          ${app.analysis.risks
                                                            .slice(0, 2)
                                                            .map((r) => `<span class="ai-point risk">⚠ ${escapeHTML(r)}</span>`)
                                                            .join("")}
                                                        </div>
                                                      `
                                                    : ""
                                                }
                                              </div>
                                            `
                                          : `<div class="hint" style="padding:8px">AI analysis pending — click Re-analyze All to generate scores.</div>`
                                      }

                                      <div class="ai-actions">
                                        <button class="mini-btn" data-action="view-candidate" data-app="${app.id}">Full Details</button>
                                        ${
                                          !app.interview
                                            ? `<button class="primary invite-btn" data-action="invite-interview" data-app="${app.id}">Invite to AI Interview</button>`
                                            : html`
                                                <button class="mini-btn" data-action="view-candidate" data-app="${app.id}">View Interview</button>
                                                <button class="primary" data-action="schedule" data-app="${app.id}">Schedule Meeting</button>
                                              `
                                        }
                                      </div>
                                    </article>
                                  `
                                )
                                .join("")}
                            </div>
                          `
                    }
                  </div>
                `
              )
              .join("")
      }
      </section>
    </section>
  `;
}
