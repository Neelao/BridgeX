import { badgeClass, escapeHTML, html } from "../../../shared/utils.js";

function renderVerificationStatus(user) {
  const v = user.verification;

  if (!v || !v.checkedAt) {
    return html`
      <div class="verify-status-card pending-start">
        <div class="verify-status-head">
          <span class="verify-status-badge unsubmitted">Not submitted</span>
          <b>Complete your verification to unlock the full network</b>
        </div>
        <p>Your account needs company verification before you can access the full feed and apply to postings. It takes up to 1 week to review.</p>
        <button class="primary" data-action="go-verification">Start Verification</button>
      </div>
    `;
  }

  const submitted = new Date(v.checkedAt);
  const expectedBy = new Date(submitted);
  expectedBy.setDate(expectedBy.getDate() + 7);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const status = v.status || "pending_review";
  const isVerified = status === "verified";
  const isRejected = status === "rejected";
  const isPending = !isVerified && !isRejected;

  if (isVerified) return ""; // No banner needed for verified users

  const steps = [
    { label: "Documents submitted", done: true },
    { label: "AI pre-screening complete", done: !!v.checks },
    { label: "Manual review by BridgeX team", done: false, active: isPending },
    { label: "Final decision & account activation", done: false, active: isRejected }
  ];

  return html`
    <div class="verify-status-card ${isRejected ? "rejected" : "in-review"}">
      <div class="verify-status-head">
        <span class="verify-status-badge ${isRejected ? "badge bad" : "badge warn"}">${isRejected ? "Rejected" : "Under Review"}</span>
        <b>${isRejected ? "Verification was not approved" : "Verification in progress — up to 1 week"}</b>
      </div>
      <div class="verify-timeline">
        <span>Submitted: <b>${escapeHTML(fmt(submitted))}</b></span>
        ${isPending ? `<span>Expected by: <b>${escapeHTML(fmt(expectedBy))}</b></span>` : ""}
      </div>
      <div class="verify-steps">
        ${steps.map(({ label, done, active }) => html`
          <div class="verify-step-row ${done ? "done" : active ? "active" : "waiting"}">
            <div class="verify-step-dot">${done ? "✓" : active ? "→" : "·"}</div>
            <span>${escapeHTML(label)}</span>
          </div>
        `).join("")}
      </div>
      ${isRejected ? html`
        <button class="primary" style="margin-top:12px" data-action="resubmit-verification">Resubmit Verification</button>
      ` : `<p class="hint" style="margin-top:10px">We'll email <b>${escapeHTML(user.email)}</b> once the review is complete. No action needed from you right now.</p>`}
    </div>
  `;
}

export function renderCandidateDashboard(state, user) {
  const myCandidateIds = new Set(
    state.candidates.filter((c) => c.userId === user.id).map((c) => c.id)
  );

  const myApps = state.applications
    .filter((app) => myCandidateIds.has(app.candidateId))
    .map((app) => ({
      app,
      opportunity: state.opportunities.find((o) => o.id === app.opportunityId),
      candidate: state.candidates.find((c) => c.id === app.candidateId),
      score: app.interview?.summary?.score ?? app.analysis?.score ?? 0
    }));

  const interviewsPending = myApps.filter(({ app }) => app.invitedToInterview && !app.interview).length;
  const interviewsDone = myApps.filter(({ app }) => app.interview).length;
  const meetingsScheduled = myApps.filter(({ app }) => app.meeting).length;

  return html`
    <section class="dashboard-page">
      <div class="dashboard-hero">
        <div>
          <span class="hero-pill">Your application hub</span>
          <h2>Track your partnership pitches</h2>
          <p>Monitor your applications, respond to interview invitations, and progress from pitch to meeting.</p>
        </div>
      </div>

      ${renderVerificationStatus(user)}

      <section class="dashboard-stats" style="grid-template-columns: repeat(4, minmax(0, 1fr))">
        <div class="panel stat"><span>Applications sent</span><b>${myApps.length}</b></div>
        <div class="panel stat"><span>Interviews pending</span><b>${interviewsPending || "—"}</b></div>
        <div class="panel stat"><span>Interviews done</span><b>${interviewsDone}</b></div>
        <div class="panel stat"><span>Meetings scheduled</span><b>${meetingsScheduled}</b></div>
      </section>

      <section class="dashboard-section">
        <div class="topbar dashboard-section-head">
          <div>
            <h2>My Applications</h2>
            <p>Your pitches and their current status. Start an interview when invited.</p>
          </div>
        </div>

        ${
          myApps.length === 0
            ? `<div class="empty"><p>No applications yet. Go to the Feed, find a partnership posting, and click <b>Apply Now</b> to pitch your company.</p></div>`
            : html`
                <div class="list">
                  ${myApps
                    .map(
                      ({ app, opportunity, candidate, score }) => html`
                        <article class="card ai-summary-card">
                          <div class="ai-summary-head">
                            <div class="company-dot">${escapeHTML(opportunity?.title?.slice(0, 1) || "?")}</div>
                            <div>
                              <h3>${escapeHTML(opportunity?.title || "Unknown posting")}</h3>
                              <span>Applied as ${escapeHTML(candidate?.company || user.company)} · ${escapeHTML(candidate?.role || "")}</span>
                            </div>
                            ${score ? `<span class="badge ${badgeClass(score)}">${score}%</span>` : ""}
                            <span class="badge">${escapeHTML(app.status)}</span>
                          </div>

                          ${
                            app.analysis
                              ? html`
                                  <div class="ai-analysis">
                                    <div class="ai-analysis-header">
                                      <b>AI Fit Review</b>
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
                                  </div>
                                `
                              : ""
                          }

                          ${
                            app.invitedToInterview && !app.interview
                              ? html`
                                  <div class="interview-invite-banner">
                                    <div>
                                      <b>Interview invitation received</b>
                                      <span>You've been selected for an AI pitch interview. Answer questions about your proposal and partnership fit.</span>
                                    </div>
                                    <button class="primary invite-btn" data-action="start-interview" data-app="${app.id}">Start Interview</button>
                                  </div>
                                `
                              : ""
                          }

                          ${
                            app.interview
                              ? html`
                                  <div class="interview-done-banner">
                                    <span>✓ Interview completed${app.interview.summary?.score ? ` · Final score: ${app.interview.summary.score}/100` : ""}</span>
                                    ${app.meeting ? `<span class="badge good">Meeting scheduled</span>` : ""}
                                  </div>
                                `
                              : ""
                          }

                          ${
                            app.documents?.length
                              ? html`
                                  <div class="ai-resume">
                                    ${app.documents.map((d) => `<span class="badge">📄 ${escapeHTML(d.name)}</span>`).join("")}
                                  </div>
                                `
                              : ""
                          }
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
        }
      </section>
    </section>
  `;
}
