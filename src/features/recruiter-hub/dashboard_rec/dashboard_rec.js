import { badgeClass, escapeHTML, html, truncate } from "../../../shared/utils.js";

function reputationScore(user, state) {
  if (!user) return 0;
  let score = user.verified ? 40 : 0;
  const myOpps = state.opportunities.filter((o) => o.ownerId === user.id).length;
  score += Math.min(myOpps * 5, 20);
  const myAppIds = new Set(
    state.opportunities.filter((o) => o.ownerId === user.id).map((o) => o.id)
  );
  const interviews = state.applications.filter((a) => myAppIds.has(a.opportunityId) && a.interview).length;
  score += Math.min(interviews * 5, 20);
  const meetings = state.applications.filter((a) => myAppIds.has(a.opportunityId) && a.meeting).length;
  score += Math.min(meetings * 10, 15);
  if (user.linkedIn) score += 5;
  return Math.min(score, 100);
}

function reputationLabel(score) {
  if (score >= 80) return { label: "Top Partner", cls: "rep-top" };
  if (score >= 60) return { label: "Trusted", cls: "rep-trusted" };
  if (score >= 35) return { label: "Active", cls: "rep-active" };
  return { label: "New Member", cls: "rep-new" };
}

export function renderDashboard(state, user, filters = {}) {
  const myOppIds = new Set(
    state.opportunities.filter((opp) => opp.ownerId === user.id).map((opp) => opp.id)
  );

  const repScore = reputationScore(user, state);
  const { label: repLabel, cls: repCls } = reputationLabel(repScore);

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
  const scores = allApps.map((app) => app.interview?.summary?.score ?? app.analysis?.score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const topScore = scores.length ? Math.max(...scores) : 0;
  const readyMeetings = allApps.filter((app) => app.interview || app.meeting).length;

  // Active filter values (passed from main.js module state)
  const searchQ = (filters.search || "").toLowerCase();
  const minScore = Number(filters.minScore || 0);
  const statusFilter = filters.status || "all";

  return html`
    <section class="dashboard-page">
      <div class="dashboard-hero">
        <div>
          <span class="hero-pill">Verified company workspace</span>
          <h2>Candidate rankings for partnership opportunities</h2>
          <p>AI-screened proposals, interview status, and connection readiness — ranked best to worst fit.</p>
        </div>
        <div class="dashboard-verify-card">
          <b>✓ Verified</b>
          <span>Access unlocked after company evidence checks</span>
          <div class="rep-display ${repCls}" data-tooltip="Reputation is computed from postings, interviews, meetings, and verification status.">
            <span class="rep-score">${repScore}</span>
            <span class="rep-label">${repLabel}</span>
          </div>
        </div>
      </div>

      <section class="dashboard-stats">
        <div class="panel stat" data-tooltip="Total open partnership postings you've published"><span>Open postings</span><b>${state.opportunities.filter((o) => myOppIds.has(o.id)).length}</b></div>
        <div class="panel stat" data-tooltip="Total applications received across all your postings"><span>Applications received</span><b>${totalApps}</b></div>
        <div class="panel stat" data-tooltip="Average AI fit score across all applications"><span>Avg fit score</span><b>${avg || "—"}${avg ? "%" : ""}</b></div>
        <div class="panel stat" data-tooltip="Highest individual fit score in your pipeline"><span>Top candidate</span><b>${topScore || "—"}${topScore ? "%" : ""}</b></div>
        <div class="panel stat" data-tooltip="Candidates who have completed interviews or have a scheduled meeting"><span>Ready for meeting</span><b>${readyMeetings}</b></div>
      </section>

      <section class="dashboard-section">
        <div class="topbar dashboard-section-head">
          <div>
            <h2>Application Pipeline</h2>
            <p>Ranked best → worst fit. Invite strong companies to a guided pitch interview.</p>
          </div>
          <button class="ghost" data-action="analyze-all" data-tooltip="Run AI scoring on any unscored applications">Re-analyze All</button>
        </div>

        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="filter-search">
            <input
              id="dash-search"
              type="search"
              placeholder="Search by company or candidate name…"
              value="${escapeHTML(filters.search || "")}"
              data-filter="search"
              autocomplete="off"
            />
          </div>
          <div class="filter-group">
            <label data-tooltip="Only show candidates with a fit score at or above this value">Min score</label>
            <select id="dash-score" data-filter="minScore">
              <option value="0" ${minScore === 0 ? "selected" : ""}>Any score</option>
              <option value="40" ${minScore === 40 ? "selected" : ""}>&ge; 40%</option>
              <option value="60" ${minScore === 60 ? "selected" : ""}>&ge; 60%</option>
              <option value="78" ${minScore === 78 ? "selected" : ""}>&ge; 78% (Strong)</option>
            </select>
          </div>
          <div class="filter-group">
            <label data-tooltip="Filter by interview or meeting status">Status</label>
            <select id="dash-status" data-filter="status">
              <option value="all" ${statusFilter === "all" ? "selected" : ""}>All statuses</option>
              <option value="submitted" ${statusFilter === "submitted" ? "selected" : ""}>Submitted</option>
              <option value="analyzed" ${statusFilter === "analyzed" ? "selected" : ""}>Analyzed</option>
              <option value="interview-invited" ${statusFilter === "interview-invited" ? "selected" : ""}>Interview invited</option>
              <option value="interview-complete" ${statusFilter === "interview-complete" ? "selected" : ""}>Interview complete</option>
              <option value="meeting-scheduled" ${statusFilter === "meeting-scheduled" ? "selected" : ""}>Meeting scheduled</option>
            </select>
          </div>
          ${searchQ || minScore > 0 || statusFilter !== "all" ? `<button class="ghost" data-action="clear-filters" style="align-self:flex-end">Clear filters</button>` : ""}
        </div>

        ${
          oppMap.size === 0
            ? `<div class="empty"><p>No applications yet. Share your postings in the feed to start receiving pitches.</p></div>`
            : [...oppMap.entries()]
                .map(([opp, appRows]) => {
                  // Apply filters
                  const filtered = appRows.filter(({ app, candidate, score }) => {
                    if (searchQ) {
                      const hay = `${candidate?.company || ""} ${candidate?.name || ""}`.toLowerCase();
                      if (!hay.includes(searchQ)) return false;
                    }
                    if (score < minScore) return false;
                    if (statusFilter !== "all" && app.status !== statusFilter) return false;
                    return true;
                  });

                  return html`
                    <div class="opp-pipeline">
                      <div class="opp-pipeline-head">
                        <h3>${escapeHTML(opp.title)}</h3>
                        <span class="badge">${filtered.length} of ${appRows.length} shown</span>
                        <span class="badge good">${escapeHTML(opp.status)}</span>
                      </div>

                      ${
                        filtered.length === 0
                          ? `<div class="empty" style="margin-bottom:16px"><p>${appRows.length ? "No matches for current filters." : "No applications yet for this posting."}</p></div>`
                          : html`
                              <div class="list">
                                ${filtered
                                  .map(
                                    ({ app, candidate, score }) => html`
                                      <article class="card ai-summary-card">
                                        <div class="ai-summary-head">
                                          <div class="company-dot" data-tooltip="${escapeHTML(candidate?.company || "Unknown")}">${escapeHTML(candidate?.company?.slice(0, 1) || "?")}</div>
                                          <div>
                                            <h3>${escapeHTML(candidate?.company || "Unknown company")}</h3>
                                            <span>${escapeHTML(candidate?.name || "")} · ${escapeHTML(candidate?.role || "")} · ${escapeHTML(candidate?.email || "")}</span>
                                          </div>
                                          <span class="badge ${badgeClass(score)}" data-tooltip="AI fit score — 0 to 100">${score || "—"}</span>
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
                                          app.resume || app.documents?.length
                                            ? html`
                                                <div class="ai-resume">
                                                  ${(app.resume ? [app.resume] : app.documents)
                                                    .map((doc) => `<span class="badge" data-tooltip="Uploaded document">📄 ${escapeHTML(doc.name)}</span>`)
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
                                                            ${app.analysis.strengths.slice(0, 3).map((s) => `<span class="ai-point good">✓ ${escapeHTML(s)}</span>`).join("")}
                                                          </div>
                                                        `
                                                      : ""
                                                  }
                                                  ${
                                                    app.analysis.risks?.length
                                                      ? html`
                                                          <div class="ai-points">
                                                            <span class="ai-label risk-label">Gaps to probe</span>
                                                            ${app.analysis.risks.slice(0, 2).map((r) => `<span class="ai-point risk">⚠ ${escapeHTML(r)}</span>`).join("")}
                                                          </div>
                                                        `
                                                      : ""
                                                  }
                                                </div>
                                              `
                                            : `<div class="hint" style="padding:8px">AI analysis pending — click Re-analyze All to generate scores.</div>`
                                        }

                                        <div class="ai-actions">
                                          <button class="mini-btn" data-action="view-candidate" data-app="${app.id}" data-tooltip="View full proposal, AI summary, and interview transcript">Full Details</button>
                                          ${
                                            app.interview
                                              ? html`
                                                  <button class="mini-btn" data-action="view-candidate" data-app="${app.id}">View Interview</button>
                                                  <button class="primary" data-action="schedule" data-app="${app.id}" data-tooltip="Pick a date and time to meet this candidate">Schedule Meeting</button>
                                                `
                                              : app.invitedToInterview
                                              ? `<span class="badge warn" data-tooltip="Waiting for the candidate to complete their interview">Interview invited — awaiting candidate</span>`
                                              : `<button class="primary invite-btn" data-action="invite-interview" data-app="${app.id}" data-tooltip="Send an AI interview invitation to this candidate">Invite to AI Interview</button>`
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
                  `;
                })
                .join("")
        }
      </section>
    </section>
  `;
}
