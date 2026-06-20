import { badgeClass, escapeHTML, html } from "../../../shared/utils.js";

function candidateInitials(user, candidate) {
  const source = candidate?.company || user.company || user.name || user.email || "BX";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BX";
}

function applicationStatus(app) {
  if (app.meeting) return "Meeting booked";
  if (app.interview) return "Interview complete";
  if (app.aiInterviewSlot) return "Interview scheduled";
  if (app.invitedToInterview) return "AI interview ready";
  if (app.analysis) return "AI scan complete";
  return "Submitted";
}

function nextCandidateAction(myApps) {
  const needsSlot = myApps.find(({ app }) => app.invitedToInterview && !app.aiInterviewSlot && !app.interview);
  if (needsSlot) {
    return {
      title: "Schedule your AI interview",
      body: `${needsSlot.opportunity?.company || "The recruiter"} invited you to interview for ${needsSlot.opportunity?.title || "this partnership"}. Pick a time and enter the camera room when ready.`,
      label: "Schedule interview",
      action: "schedule-ai-interview",
      appId: needsSlot.app.id
    };
  }

  const readyInterview = myApps.find(({ app }) => app.aiInterviewSlot && !app.interview);
  if (readyInterview) {
    return {
      title: "Join the live AI pitch room",
      body: `Your slot is set for ${readyInterview.app.aiInterviewSlot.date} at ${readyInterview.app.aiInterviewSlot.time}. The AI interviewer will listen through your microphone and capture your pitch transcript.`,
      label: "Start camera interview",
      action: "start-interview",
      appId: readyInterview.app.id
    };
  }

  const completed = myApps.find(({ app }) => app.interview);
  if (completed) {
    return {
      title: "Review your strongest pitch",
      body: `${completed.opportunity?.company || "The recruiter"} now has your AI summary, document scan, and interview transcript. Keep your documents ready for the next meeting.`,
      label: "View documents",
      action: "go-dashboard",
      appId: ""
    };
  }

  return {
    title: "Find your next opportunity",
    body: "Browse the feed, apply to a relevant partnership, and BridgeX will scan your document before the AI interview starts.",
    label: "Browse feed",
    action: "go-feed",
    appId: ""
  };
}

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
  const avgScore = myApps.length
    ? Math.round(myApps.reduce((sum, { score }) => sum + score, 0) / myApps.length)
    : 0;
  const documentCount = myApps.reduce((sum, { app }) => sum + (app.documents?.length || 0), 0);
  const topApplication = [...myApps].sort((a, b) => b.score - a.score)[0];
  const topCandidate = topApplication?.candidate || state.candidates.find((c) => c.userId === user.id);
  const nextAction = nextCandidateAction(myApps);
  const verificationLabel = user.verification?.status === "verified" ? "Verified account" : "Verification in review";

  return html`
    <section class="dashboard-page">
      <div class="candidate-dashboard-hero">
        <div>
          <span class="hero-pill">Pitcher workspace</span>
          <h2>${escapeHTML(user.company || user.name || "Your")} partnership dashboard</h2>
          <p>Track every pitch from upload to AI scan, interview, recruiter review, and meeting. Your strongest match is always surfaced first.</p>
          <div class="candidate-hero-tags">
            <span>${escapeHTML(verificationLabel)}</span>
            <span>${documentCount} document${documentCount === 1 ? "" : "s"} scanned</span>
            <span>${interviewsDone} interview${interviewsDone === 1 ? "" : "s"} completed</span>
          </div>
        </div>
        <aside class="candidate-identity-card">
          <div class="candidate-avatar-xl">${escapeHTML(candidateInitials(user, topCandidate))}</div>
          <div>
            <b>${escapeHTML(topCandidate?.company || user.company || user.name || "Pitcher profile")}</b>
            <span>${escapeHTML(topCandidate?.role || user.email || "Partnership candidate")}</span>
          </div>
          <div class="candidate-profile-meter">
            <span>Best match</span>
            <strong>${topApplication?.score || avgScore || "—"}${topApplication?.score || avgScore ? "%" : ""}</strong>
          </div>
        </aside>
      </div>

      <section class="candidate-metrics-grid">
        <div class="candidate-metric-card">
          <span>Applications sent</span>
          <b>${myApps.length}</b>
          <small>${myApps.length ? "Active in recruiter pipelines" : "Ready when you apply"}</small>
        </div>
        <div class="candidate-metric-card">
          <span>AI scans done</span>
          <b>${myApps.filter(({ app }) => app.analysis).length}</b>
          <small>${documentCount} uploaded document${documentCount === 1 ? "" : "s"}</small>
        </div>
        <div class="candidate-metric-card">
          <span>Interviews pending</span>
          <b>${interviewsPending || "—"}</b>
          <small>${interviewsPending ? "Waiting for your pitch" : "No action needed"}</small>
        </div>
        <div class="candidate-metric-card">
          <span>Avg match score</span>
          <b>${avgScore || "—"}${avgScore ? "%" : ""}</b>
          <small>${topApplication ? `Top role: ${escapeHTML(topApplication.opportunity?.title || "Partnership")}` : "Apply to generate score"}</small>
        </div>
      </section>

      ${renderVerificationStatus(user)}

      <section class="candidate-next-action panel">
        <div>
          <span class="section-kicker">Next best action</span>
          <h3>${escapeHTML(nextAction.title)}</h3>
          <p>${escapeHTML(nextAction.body)}</p>
        </div>
        <button class="primary" data-action="${escapeHTML(nextAction.action)}" ${nextAction.appId ? `data-app="${escapeHTML(nextAction.appId)}"` : ""}>${escapeHTML(nextAction.label)}</button>
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
                <div class="candidate-application-grid">
                  ${myApps
                    .map(
                      ({ app, opportunity, candidate, score }) => html`
                        <article class="pitch-card">
                          <div class="pitch-card-top">
                            <div class="pitch-brand">
                              <div class="company-dot">${escapeHTML(opportunity?.company?.slice(0, 1) || opportunity?.title?.slice(0, 1) || "?")}</div>
                              <div>
                                <span class="section-kicker">${escapeHTML(opportunity?.company || "Recruiter")}</span>
                                <h3>${escapeHTML(opportunity?.title || "Unknown posting")}</h3>
                                <p>Applied as ${escapeHTML(candidate?.company || user.company || user.name)} · ${escapeHTML(candidate?.role || "Pitcher")}</p>
                              </div>
                            </div>
                            <div>
                              ${score ? `<span class="pitch-score ${badgeClass(score)}">${score}%</span>` : `<span class="pitch-score neutral">New</span>`}
                              <small>${escapeHTML(applicationStatus(app))}</small>
                            </div>
                          </div>

                          <div class="pitch-progress">
                            <span class="${app.analysis ? "active" : ""}">Document scanned</span>
                            <span class="${app.invitedToInterview ? "active" : ""}">Interview invited</span>
                            <span class="${app.interview ? "active" : ""}">Summary ready</span>
                            <span class="${app.meeting ? "active" : ""}">Meeting booked</span>
                          </div>

                          ${
                            app.analysis
                              ? html`
                                  <div class="pitch-detail-grid">
                                    <div class="pitch-mini-panel">
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
                                    <div class="pitch-mini-panel">
                                      <b>Recruiter requirement match</b>
                                      <p>${escapeHTML(app.analysis.reasoning || "BridgeX matched your pitch against the recruiter's required expertise, delivery proof, and collaboration fit.")}</p>
                                    </div>
                                  </div>
                                `
                              : ""
                          }

                          ${
                            app.invitedToInterview && !app.interview
                              ? html`
                                  <div class="interview-invite-banner">
                                    <div>
                                      <b>${app.aiInterviewSlot ? "AI interview slot confirmed" : "AI interview ready"}</b>
                                      <span>${
                                        app.aiInterviewSlot
                                          ? `Scheduled for ${escapeHTML(app.aiInterviewSlot.date)} at ${escapeHTML(app.aiInterviewSlot.time)}. Allow camera and microphone when the interview opens.`
                                          : "Choose a date and time, then enter the live AI camera interview when you're ready."
                                      }</span>
                                    </div>
                                    ${
                                      app.aiInterviewSlot
                                        ? `<button class="primary invite-btn" data-action="start-interview" data-app="${app.id}">Start Camera Interview</button>`
                                        : `<button class="primary invite-btn" data-action="schedule-ai-interview" data-app="${app.id}">Schedule AI Interview</button>`
                                    }
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
                            app.analysis?.documentScan
                              ? html`
                                  <div class="ai-card-scan pitch-document-scan">
                                    <div>
                                      <b>Uploaded document scan</b>
                                      <span>${app.analysis.documentScan.confidence}/100 evidence confidence</span>
                                    </div>
                                    <p>${escapeHTML(app.analysis.documentScan.evidenceLine)}</p>
                                  </div>
                                `
                              : ""
                          }

                          ${
                            app.documents?.length
                              ? html`
                                  <div class="ai-resume pitch-documents">
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
