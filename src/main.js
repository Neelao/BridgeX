import { analyzeApplication, summarizeInterview } from "./features/candidate-hub/ai-analysis/analysis.js";
import { renderAuth } from "./features/portal-flow/auth/auth.js";
import { renderCandidateApply } from "./features/candidate-hub/candidates/candidates.js";
import { renderCandidateDashboard } from "./features/candidate-hub/dashboard_candidate/dashboard_candidate.js";
import { renderDashboard } from "./features/recruiter-hub/dashboard_rec/dashboard_rec.js";
import { renderDocuments } from "./features/recruiter-hub/documents/documents.js";
import { renderCompanyTypePicker, renderIntentPicker } from "./features/portal-flow/intent/intent.js";
import { buildInterviewQuestions } from "./features/candidate-hub/interview/interview.js";
import { renderNetworkFeed } from "./features/shared/feed/feed.js";
import { renderNetwork } from "./features/shared/network/referral.js";
import { partnershipAreas } from "./features/portal-flow/partnership/areas.js";
import { renderLanding } from "./features/portal-flow/public/landing.js";
import { renderRequirements } from "./features/recruiter-hub/requirements/requirements.js";
import { renderAnalytics } from "./features/recruiter-hub/analytics/analytics.js";
import { renderScheduleModal } from "./features/recruiter-hub/scheduling/scheduling.js";
import { buildAiHelperReply, renderAccessPage, renderReviewPage, reviewAuthorizationLetter, verifyAccess } from "./features/portal-flow/verification/verification.js";
import { renderLogin } from "./features/portal-flow/login/login.js";
import { loadState, resetState, saveState, uid } from "./shared/state.js";
import { apiLogout, apiUploadFile, hasSession } from "./shared/api.js";
import { byId, escapeHTML, formData, html } from "./shared/utils.js";

let state = loadState();
let route = "home";

const SESSION_USER_KEY = "bridgex_active_user";
let activeUserId = (() => {
  const saved = localStorage.getItem(SESSION_USER_KEY);
  return saved && state.users.find((u) => u.id === saved) ? saved : state.users[0].id;
})();

function setActiveUser(id) {
  activeUserId = id;
  if (id) localStorage.setItem(SESSION_USER_KEY, id);
  else localStorage.removeItem(SESSION_USER_KEY);
}

let modal = "";
let entryRole = "recruiter";
let verificationResult = null;
let aiHelperMessages = [];
let accessDraft = {};
let expandedComments = new Set();
let loginError = "";
let dashFilters = { search: "", minScore: 0, status: "all" };

// ── Role-based navigation ──────────────────────────────────────────────────────

const recruiterRoutes = [
  ["feed", "Feed"],
  ["dashboard", "Dashboard"],
  ["requirements", "Post Requirement"],
  ["analytics", "Business Analytics"],
  ["network", "Partner Network"]
];

const candidateRoutes = [
  ["feed", "Feed"],
  ["apply", "Apply Jobs"],
  ["documents", "My Documents"],
  ["dashboard", "My Dashboard"],
  ["network", "Partner Network"]
];

function isCandidate() {
  return currentUser().role === "candidate";
}

function getRoutes() {
  return isCandidate() ? candidateRoutes : recruiterRoutes;
}

function getRouteLabel(id) {
  return getRoutes().find(([r]) => r === id)?.[1] || "Dashboard";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentUser() {
  return state.users.find((user) => user.id === activeUserId) || state.users[0];
}

function findApp(appId) {
  const app = state.applications.find((item) => item.id === appId);
  return {
    app,
    candidate: state.candidates.find((item) => item.id === app?.candidateId),
    opportunity: state.opportunities.find((item) => item.id === app?.opportunityId)
  };
}

function analyze(app) {
  const opportunity = state.opportunities.find((item) => item.id === app.opportunityId);
  app.analysis = analyzeApplication(opportunity, app);
  app.status = app.status === "submitted" ? "analyzed" : app.status;
}

function askAiHelper(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  aiHelperMessages.push({ role: "user", text: cleanQuestion });
  aiHelperMessages.push({
    role: "assistant",
    text: buildAiHelperReply(cleanQuestion, {
      entryRole,
      verificationResult,
      user: currentUser()
    })
  });
  aiHelperMessages = aiHelperMessages.slice(-8);
}

function updateAccessDraft(data) {
  accessDraft = {
    name: data.name || "",
    company: data.company || "",
    email: data.email || "",
    hrEmail: data.hrEmail || "",
    roleTitle: data.roleTitle || "",
    businessCode: data.businessCode || "",
    linkedIn: data.linkedIn || "",
    password: data.password || "",
    authorizedBy: data.authorizedBy || "",
    letterPurpose: data.letterPurpose || "",
    supportPurpose: data.supportPurpose || "",
    orgType: data.orgType || accessDraft.orgType || "",
    preference: data.preference || accessDraft.preference || ""
  };
}

function protectedRoute(nextRoute) {
  return ["feed", "dashboard", "requirements", "apply", "documents", "analytics", "auth", "network"].includes(nextRoute);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderMain() {
  const user = currentUser();
  if (protectedRoute(route) && !user.verified) {
    route = "access";
    return renderAccessPage(entryRole, verificationResult, aiHelperMessages, accessDraft);
  }
  if (route === "home") return renderLanding();
  if (route === "login") return renderLogin(loginError);
  if (route === "company-type") return renderCompanyTypePicker();
  if (route === "access") return renderAccessPage(entryRole, verificationResult, aiHelperMessages, accessDraft);
  if (route === "review") return renderReviewPage(user);
  if (route === "intent") return renderIntentPicker(entryRole, partnershipAreas);
  if (route === "feed") return renderNetworkFeed(state, user, partnershipAreas, expandedComments);
  if (route === "requirements") return renderRequirements(state);
  if (route === "analytics") return renderAnalytics(state, user);
  if (route === "apply") return renderCandidateApply(state, user);
  if (route === "documents") return renderDocuments(state, user);
  if (route === "auth") return renderAuth(state, activeUserId);
  if (route === "network") return renderNetwork(state, user);
  // dashboard — role-aware
  return isCandidate() ? renderCandidateDashboard(state, user) : renderDashboard(state, user, dashFilters);
}

function appShell() {
  const user = currentUser();
  if (route === "home" || route === "access" || route === "intent" || route === "company-type" || route === "login") {
    return html`
      <main class="public-shell">
        <header class="public-nav">
          <div class="brand">
            <div class="mark">BX</div>
            <div>
              <strong>BridgeX</strong>
              <span>Company partnership network</span>
            </div>
          </div>
          <div class="actions">
            <button class="nav-link" data-action="enter-candidate">For Candidates</button>
            <button class="nav-link" data-action="go-login">Sign In</button>
            <button class="nav-cta" data-action="enter-recruiter">For Companies</button>
          </div>
        </header>
        ${renderMain()}
      </main>
      ${modal}
    `;
  }

  const routes = getRoutes();

  return html`
    <main class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">BX</div>
          <div>
            <strong>BridgeX</strong>
            <span>Company partnership network</span>
          </div>
        </div>
        <nav class="nav">
          ${routes
            .map(
              ([id, label]) => html`
                <button class="${route === id ? "active" : ""}" data-route="${id}">${label}</button>
              `
            )
            .join("")}
        </nav>
        <div class="user-panel">
          <strong>${escapeHTML(user.name || "New account")}</strong>
          ${user.email ? `<span class="hint user-email">${escapeHTML(user.email)}</span>` : ""}
          <span>${escapeHTML(user.company || "")}${user.company ? " · " : ""}${escapeHTML(isCandidate() ? "Candidate" : "Company")}</span>
          <span class="badge ${user.verified ? "good" : "warn"}">${user.verified ? "Verified" : "Pending"}</span>
          <button class="logout-btn" data-action="logout">Log out</button>
          <button class="ghost reset-link" data-action="reset-demo" data-tooltip="Clear all demo data and return to start">Reset demo</button>
        </div>
      </aside>
      <section class="content">
        <div class="topbar">
          <div>
            <h1>${getRouteLabel(route)}</h1>
            <p>${isCandidate() ? "Verified candidate workspace — pitch, track, and grow partnerships." : "Verified partner discovery from requirement to introduction to meeting."}</p>
          </div>
          <div class="actions">
            <span class="badge good">MVP ready</span>
            <span class="badge">Prototype data</span>
          </div>
        </div>
        ${renderMain()}
      </section>
    </main>
    ${modal}
  `;
}

function render() {
  document.querySelector("#app").innerHTML = appShell();
}

// ── Modal helpers ──────────────────────────────────────────────────────────────

function showCandidate(appId) {
  const { app, candidate } = findApp(appId);
  if (!app) return;
  if (!app.analysis) analyze(app);
  const summary = app.interview?.summary;
  modal = html`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal">
        <div class="topbar">
          <div>
            <h2>${escapeHTML(candidate.company)}</h2>
            <p>${escapeHTML(candidate.name)} — ${escapeHTML(candidate.role)} — ${escapeHTML(candidate.email)}</p>
          </div>
          <button class="ghost" data-action="close-modal">Close</button>
        </div>
        <div class="grid cols-2">
          <div class="card">
            <h3>Proposal</h3>
            <p>${escapeHTML(app.proposalText)}</p>
            <h3>Documents</h3>
            ${(app.documents || []).map((doc) => `<span class="badge">📄 ${escapeHTML(doc.name)}</span>`).join(" ")}
          </div>
          <div class="card">
            <h3>Fit Review</h3>
            <p><b>${app.analysis.score}/100 — ${escapeHTML(app.analysis.recommendation)}</b></p>
            <p>${escapeHTML(app.analysis.reasoning)}</p>
            <h3>Strengths</h3>
            <p>${escapeHTML(app.analysis.strengths.join(" | "))}</p>
            <h3>Risks</h3>
            <p>${escapeHTML(app.analysis.risks.join(" | "))}</p>
          </div>
        </div>
        <div class="panel" style="margin-top: 14px">
          <h3>Pitch Interview</h3>
          ${
            summary
              ? html`
                  <p><b>${summary.score}/100 — ${escapeHTML(summary.recommendation)}</b></p>
                  <p>${escapeHTML(summary.pitchSummary)}</p>
                  <p><b>Follow-up questions:</b> ${escapeHTML(summary.nextQuestions.join(" | "))}</p>
                `
              : "<p>No AI interview completed yet.</p>"
          }
          ${
            app.interview?.recording
              ? html`
                  <div class="interview-video-preview">
                    <span>🎥 Interview recording: <b>${escapeHTML(app.interview.recording)}</b></span>
                    <span class="hint">Video stored for review — playback available in full version.</span>
                  </div>
                `
              : ""
          }
          <div class="transcript" style="margin-top: 12px">
            ${(app.interview?.answers || [])
              .map(
                (item) => html`
                  <div class="qa">
                    <strong>${escapeHTML(item.question)}</strong>
                    <span>${escapeHTML(item.answer)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
    </div>
  `;
  saveState(state);
  render();
}

function startInterview(appId) {
  const { app, candidate, opportunity } = findApp(appId);
  if (!app.analysis) analyze(app);
  const questions = buildInterviewQuestions(opportunity, app);
  let index = 0;
  const answers = [];

  function screen() {
    modal = html`
      <div class="modal-backdrop">
        <section class="modal">
          <div class="topbar">
            <div>
              <h2>AI Pitch Interview</h2>
              <p>${escapeHTML(candidate.company)} pitching for ${escapeHTML(opportunity.title)}</p>
            </div>
            <span class="rec">Recording transcript</span>
          </div>
          <div class="tabs">
            <button class="tab-btn active" type="button">Text</button>
            <button class="tab-btn" type="button" data-action="voice-answer">Voice</button>
            <button class="tab-btn" type="button" data-action="start-camera">Video</button>
          </div>
          <div class="split" style="margin-top: 14px">
            <div class="video-box" id="video-box">Camera preview appears here in video mode</div>
            <form class="form" id="interview-form">
              <span class="badge">Question ${index + 1} of ${questions.length}</span>
              <h2>${escapeHTML(questions[index])}</h2>
              <textarea id="interview-answer" name="answer" placeholder="Type or dictate your answer…" required></textarea>
              <div class="actions">
                <button class="primary" type="submit">${index + 1 === questions.length ? "Finish Interview" : "Save & Continue"}</button>
                <button class="ghost" type="button" data-action="close-modal">Exit</button>
              </div>
            </form>
          </div>
          <div class="transcript" style="margin-top: 14px">
            ${answers
              .map(
                (item) => html`
                  <div class="qa">
                    <strong>${escapeHTML(item.question)}</strong>
                    <span>${escapeHTML(item.answer)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
    render();
  }

  window.__bridgeXInterviewNext = (answer) => {
    answers.push({ question: questions[index], answer });
    index += 1;
    if (index >= questions.length) {
      app.interview = {
        mode: "text/voice/video",
        recording: `recording-${app.id}.webm`,
        completedAt: new Date().toISOString(),
        answers
      };
      app.interview.summary = summarizeInterview(opportunity, app, app.interview);
      app.status = "interview-complete";
      saveState(state);
      modal = html`
        <div class="modal-backdrop" data-action="close-modal">
          <section class="modal" style="max-width:480px;text-align:center">
            <div class="approved-state" style="min-height:200px">
              <b>✓</b>
              <h2>Interview Complete!</h2>
              <p>Your pitch interview for <b>${escapeHTML(opportunity.title)}</b> is done. The recruiter will review your answers and may schedule a follow-up meeting.</p>
              <p><b>Final score: ${app.interview.summary?.score ?? 0}/100</b></p>
            </div>
            <button class="primary" style="width:100%;margin-top:12px" data-action="close-modal">Back to Dashboard</button>
          </section>
        </div>
      `;
      render();
      return;
    }
    screen();
  };

  screen();
}

function schedule(appId) {
  const { app, candidate } = findApp(appId);
  modal = renderScheduleModal(app, candidate);
  render();
}

// ── Consent modal (gating for interview recording) ─────────────────────────────

function showConsentModal(appId) {
  const { opportunity } = findApp(appId);
  modal = html`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal consent-modal" style="max-width:500px">
        <div class="consent-header">
          <div class="consent-icon">🔒</div>
          <h2>Recording consent required</h2>
          <p>This interview session will be <b>recorded</b>. The recording is stored securely and reviewed only by the recruiter for <b>${escapeHTML(opportunity?.title || "this posting")}</b>.</p>
        </div>
        <ul class="consent-points">
          <li>Your answers are transcribed and stored against your application.</li>
          <li>The video/audio is retained for a maximum of 90 days.</li>
          <li>Only the posting recruiter has access to the recording.</li>
          <li>You can request deletion via the BridgeX support email.</li>
        </ul>
        <label class="check-row consent-check-label">
          <input type="checkbox" id="consent-check" />
          <span>I understand and consent to this interview being recorded and reviewed by the recruiter.</span>
        </label>
        <div class="actions" style="margin-top:16px">
          <button class="primary" data-action="consent-and-start" data-app="${appId}">Start Interview</button>
          <button class="ghost" data-action="close-modal">Cancel</button>
        </div>
        <div class="consent-modes" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
          <span class="hint" style="display:block;margin-bottom:8px">Choose interview format after consenting:</span>
          <button class="mini-btn" data-action="consent-and-start" data-app="${appId}" data-mode="text">Text only</button>
          <button class="mini-btn" data-action="start-avatar-interview" data-app="${appId}">AI Video Avatar (Tavus)</button>
        </div>
      </section>
    </div>
  `;
  render();
}

// ── Tavus-style video avatar interview ─────────────────────────────────────────

function startAvatarInterview(appId) {
  const { app, opportunity } = findApp(appId);
  if (!app.analysis) analyze(app);
  const questions = buildInterviewQuestions(opportunity, app);
  let index = 0;
  const answers = [];

  // Log consent
  if (!state.consentLogs) state.consentLogs = [];
  state.consentLogs.push({ appId, userId: activeUserId, type: "interview_recording", acceptedAt: new Date().toISOString() });

  function avatarScreen() {
    modal = html`
      <div class="modal-backdrop tavus-backdrop">
        <section class="tavus-interview">
          <div class="tavus-header">
            <span class="tavus-logo">BX AI</span>
            <span class="tavus-title">AI Video Interview — ${escapeHTML(opportunity?.title || "Partnership")}</span>
            <div class="tavus-rec-dot" data-tooltip="Recording in progress"></div>
          </div>
          <div class="tavus-stage">
            <div class="tavus-avatar-area">
              <canvas id="avatar-canvas" width="360" height="280"></canvas>
              <div class="tavus-avatar-name">
                <span>Alex</span>
                <span class="hint">BridgeX AI Interviewer · Powered by Tavus CVI</span>
              </div>
              <div class="tavus-question-bubble">
                <span class="question-counter">Question ${index + 1} of ${questions.length}</span>
                <p>${escapeHTML(questions[index])}</p>
              </div>
            </div>
            <div class="tavus-answer-area">
              <div class="tavus-transcript">
                ${answers.map((a) => html`
                  <div class="tavus-qa">
                    <b>Q: ${escapeHTML(a.question)}</b>
                    <span>A: ${escapeHTML(a.answer)}</span>
                  </div>
                `).join("")}
              </div>
              <form id="interview-form" class="tavus-form">
                <textarea id="interview-answer" name="answer" placeholder="Type your answer or use Voice mode…" required></textarea>
                <div class="tavus-controls">
                  <button class="tab-btn" type="button" data-action="voice-answer" data-tooltip="Use your microphone to answer">🎙 Voice</button>
                  <button class="primary" type="submit">${index + 1 === questions.length ? "Finish" : "Next"}</button>
                  <button class="ghost" type="button" data-action="close-modal">Exit</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    `;
    render();
    // Animate the avatar canvas
    animateAvatar("avatar-canvas");
  }

  window.__bridgeXInterviewNext = (answer) => {
    answers.push({ question: questions[index], answer });
    index += 1;
    if (index >= questions.length) {
      app.interview = {
        mode: "video-avatar",
        recording: `recording-${app.id}.webm`,
        completedAt: new Date().toISOString(),
        answers
      };
      app.interview.summary = summarizeInterview(opportunity, app, app.interview);
      app.status = "interview-complete";
      saveState(state);
      modal = html`
        <div class="modal-backdrop" data-action="close-modal">
          <section class="modal" style="max-width:480px;text-align:center">
            <div class="approved-state" style="min-height:200px">
              <b>✓</b>
              <h2>Interview Complete!</h2>
              <p>Your AI Avatar interview for <b>${escapeHTML(opportunity?.title || "this posting")}</b> is done.</p>
              <p><b>Final score: ${app.interview.summary?.score ?? 0}/100</b></p>
            </div>
            <button class="primary" style="width:100%;margin-top:12px" data-action="close-modal">Back to Dashboard</button>
          </section>
        </div>
      `;
      render();
      return;
    }
    avatarScreen();
  };

  avatarScreen();
}

function animateAvatar(canvasId) {
  const canvas = byId(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let frame = 0;
  const colors = { bg: "#0f1117", face: "#2a7be4", pulse: "#4ade80" };

  function draw() {
    if (!byId(canvasId)) return; // modal closed
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing ring
    const t = Date.now() / 1000;
    const glow = 0.5 + 0.5 * Math.sin(t * 2);
    const grad = ctx.createRadialGradient(180, 140, 60, 180, 140, 100 + glow * 10);
    grad.addColorStop(0, `rgba(42,123,228,${0.3 + glow * 0.2})`);
    grad.addColorStop(1, "rgba(42,123,228,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Face circle
    ctx.beginPath();
    ctx.arc(180, 130, 72, 0, Math.PI * 2);
    ctx.fillStyle = "#1a2440";
    ctx.fill();
    ctx.strokeStyle = "#2a7be4";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Eyes
    [145, 215].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 115, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#4ade80";
      ctx.fill();
    });

    // Mouth (animate if speaking)
    const mouthOpen = 4 + 8 * Math.abs(Math.sin(t * 6));
    ctx.beginPath();
    ctx.ellipse(180, 155, 22, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2a7be4";
    ctx.fill();

    // Audio wave lines at bottom
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = 90 + i * 18;
      const h = 6 + 14 * Math.abs(Math.sin(t * 5 + i * 0.6));
      ctx.beginPath();
      ctx.moveTo(x, 225 - h);
      ctx.lineTo(x, 225 + h);
      ctx.stroke();
    }

    // "TAVUS CVI" label
    ctx.fillStyle = "#4ade8066";
    ctx.font = "10px monospace";
    ctx.fillText("TAVUS CVI · LIVE", 120, 270);

    frame++;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function showApplyModal(oppId) {
  const opp = state.opportunities.find((o) => o.id === oppId);
  if (!opp) return;
  const user = currentUser();
  modal = html`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal apply-modal">
        <div class="topbar">
          <div>
            <h2>Apply to partnership</h2>
            <p>${escapeHTML(opp.title)}</p>
          </div>
          <button class="ghost" data-action="close-modal">Close</button>
        </div>
        <div class="apply-requirements">
          <div class="req-group">
            <span class="req-label must">Must-haves</span>
            <div class="post-tags">
              ${(opp.mustHaves || "").split(",").map((t) => `<span>${escapeHTML(t.trim())}</span>`).join("")}
            </div>
          </div>
          ${opp.niceToHaves ? html`
            <div class="req-group">
              <span class="req-label nice">Nice-to-haves</span>
              <div class="post-tags nice">
                ${(opp.niceToHaves || "").split(",").map((t) => `<span>${escapeHTML(t.trim())}</span>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>
        <form id="apply-modal-form" data-opp="${escapeHTML(oppId)}" class="form">
          <div class="grid cols-2">
            <div class="field">
              <label>Full Name</label>
              <input name="name" value="${escapeHTML(user.name || "")}" required />
            </div>
            <div class="field">
              <label>Company</label>
              <input name="company" value="${escapeHTML(user.company || "")}" required />
            </div>
          </div>
          <div class="grid cols-2">
            <div class="field">
              <label>Company Email</label>
              <input name="email" type="email" value="${escapeHTML(user.email || "")}" required />
            </div>
            <div class="field">
              <label>Your Role</label>
              <input name="role" placeholder="Founder / Partnership Lead" required />
            </div>
          </div>
          <div class="field">
            <label>Why are you a great fit for this partnership?</label>
            <textarea name="whyApply" placeholder="Describe how your company addresses the must-haves, relevant experience, and the value you bring to this collaboration…" required></textarea>
          </div>
          <div class="field">
            <label>Resume / CV / Pitch Deck</label>
            <input name="resume" type="file" accept=".pdf,.doc,.docx,.txt,.pptx" />
          </div>
          <button class="primary" type="submit" style="width:100%">Submit Application</button>
        </form>
      </section>
    </div>
  `;
  render();
}

// ── Click handler ──────────────────────────────────────────────────────────────

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, .modal-backdrop");
  if (!target) return;

  if (target.dataset.route) {
    route = protectedRoute(target.dataset.route) && !currentUser().verified ? "access" : target.dataset.route;
    modal = "";
    render();
  }

  if (target.dataset.action === "close-modal" && (event.target === target || target.tagName === "BUTTON")) {
    modal = "";
    render();
  }

  if (target.dataset.action === "switch-user") {
    setActiveUser(target.dataset.user);
    render();
  }

  if (target.dataset.action === "reset-demo") {
    state = resetState();
    setActiveUser(state.users[0].id);
    apiLogout().catch(() => {});
    modal = "";
    route = "home";
    aiHelperMessages = [];
    accessDraft = {};
    render();
  }

  if (target.dataset.action === "logout") {
    setActiveUser(null);
    apiLogout().catch(() => {});
    modal = "";
    route = "home";
    render();
  }

  if (target.dataset.action === "go-home") {
    route = "home";
    modal = "";
    render();
  }

  if (target.dataset.action === "enter-company") {
    const newId = uid("u");
    state.users.push({ id: newId, role: "recruiter", verified: false, name: "", company: "", email: "" });
    saveState(state);
    setActiveUser(newId);
    entryRole = "recruiter";
    route = "company-type";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = {};
    modal = "";
    render();
  }

  if (target.dataset.action === "choose-company-type") {
    // Keep whichever user was created by enter-recruiter/enter-company
    entryRole = "recruiter";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = { orgType: target.dataset.companyType || "company" };
    modal = "";
    route = "intent";
    render();
  }

  if (target.dataset.action === "enter-recruiter") {
    const newId = uid("u");
    state.users.push({ id: newId, role: "recruiter", verified: false, name: "", company: "", email: "" });
    saveState(state);
    setActiveUser(newId);
    entryRole = "recruiter";
    route = "company-type";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = {};
    modal = "";
    render();
  }

  if (target.dataset.action === "enter-candidate") {
    const newId = uid("u");
    state.users.push({ id: newId, role: "candidate", verified: false, name: "", company: "", email: "" });
    saveState(state);
    setActiveUser(newId);
    entryRole = "candidate";
    route = "intent";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = { orgType: "pitcher" };
    modal = "";
    render();
  }

  if (target.dataset.action === "go-home") {
    route = "home";
    modal = "";
    render();
  }

  if (target.dataset.action === "go-login") {
    loginError = "";
    route = "login";
    modal = "";
    render();
  }

  if (target.dataset.action === "go-verification") {
    route = "access";
    modal = "";
    render();
  }

  if (target.dataset.action === "ask-ai-prompt") {
    askAiHelper(target.dataset.question || "");
    render();
  }

  if (target.dataset.action === "continue-details") {
    const form = document.getElementById("entry-access-form");
    if (!form) return;
    const data = formData(form);
    updateAccessDraft(data);
    const missing = [];
    const establishedCompany = entryRole === "recruiter" && (data.orgType || accessDraft.orgType) === "company";
    if (!establishedCompany && !data.name?.trim()) missing.push("full name");
    if (!data.company?.trim()) missing.push("company name");
    if (!data.email?.trim()) missing.push("company email");
    if (!data.hrEmail?.trim()) missing.push(entryRole === "candidate" ? "HR representative email" : "company admin email");
    if (!data.roleTitle?.trim()) missing.push("role");
    if (!data.businessCode?.trim()) missing.push("business registration code");
    if (!data.password?.trim()) missing.push("password");
    if (missing.length) {
      aiHelperMessages.push({
        role: "assistant",
        text: `Before upload, please complete: ${missing.join(", ")}. LinkedIn is optional, so you can skip it for the demo.`
      });
      aiHelperMessages = aiHelperMessages.slice(-8);
      render();
      return;
    }
    const next = document.getElementById("portal-step-2");
    if (next) next.checked = true;
  }

  if (target.dataset.action === "open-linkedin-connect") {
    const form = document.getElementById("entry-access-form");
    if (form) updateAccessDraft(formData(form));
    const suggestedCompany = accessDraft.company || (entryRole === "recruiter" ? "northstar-ventures" : "greengrid-analytics");
    modal = html`
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal linkedin-modal">
          <div class="topbar">
            <div>
              <h2>Connect LinkedIn</h2>
              <p>BridgeX uses this as a trust signal for the company or representative profile.</p>
            </div>
            <button class="ghost" data-action="close-modal">Close</button>
          </div>
          <div class="linkedin-preview">
            <div class="ai-orb">in</div>
            <div>
              <b>LinkedIn authorization</b>
              <span>Review basic profile and company page link</span>
            </div>
          </div>
          <div class="field">
            <label>LinkedIn profile or company page</label>
            <input id="linkedin-modal-url" type="url" value="https://www.linkedin.com/company/${escapeHTML(String(suggestedCompany).toLowerCase().replaceAll(" ", "-"))}" />
          </div>
          <button class="primary" style="width:100%" data-action="complete-linkedin-connect">Connect LinkedIn</button>
        </section>
      </div>
    `;
    render();
  }

  if (target.dataset.action === "complete-linkedin-connect") {
    const value = byId("linkedin-modal-url")?.value.trim() || "";
    if (!/^https:\/\/(www\.)?linkedin\.com\/(company|in)\//i.test(value)) {
      alert("Please use a LinkedIn company page or profile URL.");
      return;
    }
    accessDraft.linkedIn = value;
    modal = "";
    route = "access";
    render();
  }

  if (target.dataset.action === "run-document-review") {
    const form = document.getElementById("entry-access-form");
    if (!form) return;
    const data = formData(form);
    updateAccessDraft(data);
    modal = html`
      <div class="modal-backdrop ai-review-backdrop">
        <section class="modal ai-review-card">
          <div class="ai-review-loader"></div>
          <h2>AI helper is reviewing your upload...</h2>
          <p>Checking file type, size, company domain, ${entryRole === "candidate" ? "HR approval email" : "company admin email"}, registration code, optional LinkedIn signal, and signature confirmation.</p>
        </section>
      </div>
    `;
    render();
    setTimeout(() => {
      verificationResult = reviewAuthorizationLetter(data);
      const user = currentUser();
      user.name = data.name || data.company;
      user.company = data.company;
      user.email = (data.email || "").trim();
      const savedPw = data.password || accessDraft.password;
      if (savedPw) user.password = savedPw;
      user.verified = false;
      user.verification = {
        ...(user.verification || {}),
        hrEmail: data.hrEmail,
        authorizedBy: data.authorizedBy,
        businessCode: verificationResult.registration,
        linkedIn: verificationResult.linkedIn,
        letterName: verificationResult.letterName,
        letterSize: verificationResult.letterSize,
        supportName: verificationResult.supportName,
        supportSize: verificationResult.supportSize,
        letterPurpose: verificationResult.letterPurpose,
        supportPurpose: verificationResult.supportPurpose,
        signed: Boolean(data.signed),
        score: verificationResult.score,
        status: verificationResult.status,
        checks: verificationResult.checks,
        checkedAt: new Date().toISOString(),
        codeDelivery: verificationResult.status === "document_verified" ? (entryRole === "candidate" ? "sent_to_candidate_and_hr" : "not_required_for_recruiter") : "not_sent"
      };
      if (entryRole === "recruiter" && verificationResult.status === "document_verified") {
        user.verified = true;
        user.verification.status = "verified";
        user.verification.verifiedAt = new Date().toISOString();
        saveState(state);
        modal = html`
          <div class="modal-backdrop verified-transfer">
            <section class="modal transfer-card">
              <div class="approved-state">
                <b>✓</b>
                <h2>Verified! Bringing you to the dashboard...</h2>
                <p>${escapeHTML(user.company)} passed the company email, admin contact, business code, authorization letter, and signature checks.</p>
              </div>
            </section>
          </div>
        `;
        render();
        setTimeout(() => {
          modal = "";
          route = "dashboard";
          verificationResult = null;
          render();
        }, 1200);
        return;
      }
      saveState(state);
      aiHelperMessages.push({
        role: "assistant",
        text:
          verificationResult.status === "document_verified"
            ? `I reviewed ${verificationResult.letterName} and the evidence packet passed. I sent verification code 123456 to ${entryRole === "candidate" ? "the candidate and HR emails" : "the requester and company admin emails"}. Type it in the code field to continue.`
            : `I reviewed the uploaded evidence and found issues. ${buildAiHelperReply("Why did verification fail?", { verificationResult })}`
      });
      aiHelperMessages = aiHelperMessages.slice(-8);
      modal = "";
      render();
    }, 950);
  }

  if (target.dataset.action === "review-approved") {
    const user = currentUser();
    user.verified = true;
    user.verification = {
      ...(user.verification || {}),
      status: "verified",
      reviewedAt: new Date().toISOString(),
      emailNotice: "approved"
    };
    saveState(state);
    route = "review";
    render();
  }

  if (target.dataset.action === "review-rejected") {
    const user = currentUser();
    user.verified = false;
    user.verification = {
      ...(user.verification || {}),
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      emailNotice: "rejected"
    };
    saveState(state);
    route = "review";
    render();
  }

  if (target.dataset.action === "resubmit-verification") {
    const user = currentUser();
    user.verified = false;
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = {};
    route = "access";
    saveState(state);
    render();
  }

  if (target.dataset.action === "continue-after-approval") {
    route = "feed";
    render();
  }

  if (target.dataset.action === "choose-area") {
    const user = currentUser();
    user.preference = target.dataset.area;
    accessDraft.preference = target.dataset.area;
    saveState(state);
    route = "access";
    render();
  }

  if (target.dataset.action === "analyze-all") {
    state.applications.forEach(analyze);
    saveState(state);
    render();
  }

  if (target.dataset.action === "clear-filters") {
    dashFilters = { search: "", minScore: 0, status: "all" };
    render();
  }

  if (target.dataset.action === "copy-referral-code") {
    const code = target.dataset.code || "";
    navigator.clipboard?.writeText(code).then(() => {
      target.textContent = "Copied!";
      setTimeout(() => { target.textContent = "Copy code"; }, 1800);
    }).catch(() => {
      target.textContent = "Copy code";
    });
  }

  // Candidate: click posting in apply page to pre-select it
  if (target.closest?.(".opportunity-preview-card")) {
    const oppId = target.closest(".opportunity-preview-card")?.dataset.oppId;
    if (oppId) {
      const sel = document.querySelector('select[name="opportunityId"]');
      if (sel) sel.value = oppId;
    }
  }

  // Consent modal → start interview
  if (target.dataset.action === "consent-and-start") {
    const check = byId("consent-check");
    if (!check?.checked) {
      const label = document.querySelector(".consent-check-label");
      if (label) label.classList.add("shake");
      return;
    }
    const appId = target.dataset.app;
    modal = "";
    startInterview(appId);
  }

  // Tavus avatar interview mode
  if (target.dataset.action === "start-avatar-interview") {
    startAvatarInterview(target.dataset.app);
  }

  if (target.dataset.action === "like-post") {
    const opp = state.opportunities.find((o) => o.id === target.dataset.opp);
    if (!opp) return;
    if (!opp.likes) opp.likes = [];
    const idx = opp.likes.indexOf(activeUserId);
    if (idx === -1) opp.likes.push(activeUserId);
    else opp.likes.splice(idx, 1);
    saveState(state);
    render();
  }

  if (target.dataset.action === "toggle-comments") {
    const oppId = target.dataset.opp;
    if (expandedComments.has(oppId)) expandedComments.delete(oppId);
    else expandedComments.add(oppId);
    render();
  }

  if (target.dataset.action === "apply-post") {
    showApplyModal(target.dataset.opp);
  }

  // Recruiter: invite candidate to interview (does NOT start the interview)
  if (target.dataset.action === "invite-interview") {
    const appId = target.dataset.app;
    const { app, candidate } = findApp(appId);
    if (app) {
      app.status = "interview-invited";
      app.invitedToInterview = true;
      saveState(state);
      modal = html`
        <div class="modal-backdrop" data-action="close-modal">
          <section class="modal" style="max-width:460px;text-align:center">
            <div class="approved-state" style="min-height:180px">
              <b>✉</b>
              <h2>Invitation Sent!</h2>
              <p><b>${escapeHTML(candidate?.company || "The candidate")}</b> has been invited to complete an AI pitch interview. They'll see the prompt in their dashboard.</p>
            </div>
            <button class="primary" style="width:100%;margin-top:12px" data-action="close-modal">Got it</button>
          </section>
        </div>
      `;
      render();
    }
  }

  // Candidate: view full details modal (for their own application — read-only, no schedule)
  if (target.dataset.action === "view-candidate") showCandidate(target.dataset.app);

  // Candidate: start their own interview — gate on consent first
  if (target.dataset.action === "start-interview") showConsentModal(target.dataset.app);

  // Recruiter: schedule meeting
  if (target.dataset.action === "schedule") schedule(target.dataset.app);

  if (target.dataset.action === "voice-answer") {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const answer = byId("interview-answer");
    if (!SpeechRecognition || !answer) {
      alert("Speech recognition is not available in this browser, so type mode is ready.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (result) => {
      answer.value = result.results[0][0].transcript;
    };
    recognition.start();
  }

  if (target.dataset.action === "start-camera") {
    const box = byId("video-box");
    if (!box) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      box.innerHTML = '<video autoplay muted playsinline></video>';
      box.querySelector("video").srcObject = stream;
    } catch {
      box.textContent = "Camera permission blocked. Transcript recording continues.";
    }
  }
});

// ── Change handler ─────────────────────────────────────────────────────────────

const UPLOAD_FIELDS = ["letter", "supportDocument", "document", "resume"];

document.addEventListener("change", async (event) => {
  const input = event.target;

  // Dashboard filter dropdowns / search — live update without re-render delay
  if (input.dataset?.filter) {
    const val = input.value;
    if (input.dataset.filter === "search") dashFilters.search = val;
    else if (input.dataset.filter === "minScore") dashFilters.minScore = Number(val);
    else if (input.dataset.filter === "status") dashFilters.status = val;
    render();
    // Restore focus to the input after re-render
    const refocusId = input.id;
    if (refocusId) setTimeout(() => { byId(refocusId)?.focus(); }, 0);
    return;
  }

  if (!(input instanceof HTMLInputElement) || !UPLOAD_FIELDS.includes(input.name)) return;
  const file = input.files?.[0];
  const status = document.querySelector(`[data-upload-status="${input.name}"]`);

  if (!file) {
    if (status) {
      status.textContent = input.name === "letter" ? "No file selected yet" : input.name === "supportDocument" ? "No supporting file selected" : "No file selected yet";
      status.classList.remove("has-file");
    }
    return;
  }

  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  if (status) {
    status.textContent = `Uploading ${file.name}…`;
    status.classList.add("has-file");
  }

  // Upload to server (fire-and-forget; fallback: just show filename)
  try {
    const result = await apiUploadFile(file);
    if (status) status.textContent = `Uploaded: ${result.name} · ${Math.round(result.size / 1024)} KB`;
  } catch {
    if (status) status.textContent = `Ready: ${file.name} · ${sizeKb} KB`;
  }
});

// ── Submit handler ─────────────────────────────────────────────────────────────

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === "login-form") {
    const data = formData(form);
    const email = (data.email || "").trim().toLowerCase();
    const password = data.password || "";
    const found = state.users.find((u) => (u.email || "").toLowerCase() === email);
    if (!found) {
      loginError = "No account found with that email address.";
      render();
      return;
    }
    if (found.password && found.password !== password) {
      loginError = "Incorrect password. Try again.";
      render();
      return;
    }
    loginError = "";
    setActiveUser(found.id);
    entryRole = found.role === "recruiter" ? "recruiter" : "candidate";
    modal = "";
    if (found.verified) {
      route = "dashboard";
    } else {
      // Pre-fill access draft so they can pick up where they left off
      accessDraft = { email: found.email, company: found.company || "", name: found.name || "" };
      route = "access";
    }
    render();
    return;
  }

  if (form.id === "ai-helper-form") {
    const data = formData(form);
    askAiHelper(data.question || "");
    form.reset();
    render();
    return;
  }

  if (form.dataset.action === "add-comment") {
    const data = formData(form);
    if (!data.comment?.trim()) return;
    const opp = state.opportunities.find((o) => o.id === form.dataset.opp);
    if (!opp) return;
    if (!opp.comments) opp.comments = [];
    const user = currentUser();
    opp.comments.push({
      id: uid("cmt"),
      userId: activeUserId,
      userName: user.name,
      company: user.company,
      text: data.comment.trim(),
      createdAt: new Date().toISOString().slice(0, 10)
    });
    saveState(state);
    render();
    return;
  }

  // Apply modal form (from feed)
  if (form.id === "apply-modal-form") {
    const data = formData(form);
    const oppId = form.dataset.opp;
    const opp = state.opportunities.find((o) => o.id === oppId);
    const resumeFile = data.resume;
    const hasResume = resumeFile && typeof resumeFile === "object" && resumeFile.name && resumeFile.size > 0;
    const candidate = {
      id: uid("cand"),
      userId: activeUserId,
      name: data.name,
      company: data.company,
      email: data.email,
      role: data.role,
      bio: (data.whyApply || "").slice(0, 150)
    };
    const app = {
      id: uid("app"),
      opportunityId: oppId,
      candidateId: candidate.id,
      status: "submitted",
      proposalText: data.whyApply,
      whyApply: data.whyApply,
      resume: hasResume ? { name: resumeFile.name, kind: "Resume/CV" } : null,
      documents: hasResume ? [{ name: resumeFile.name, kind: "Resume/CV" }] : [],
      analysis: null,
      interview: null,
      meeting: null,
      invitedToInterview: false
    };
    state.candidates.push(candidate);
    analyze(app);
    state.applications.push(app);
    saveState(state);
    modal = html`
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal" style="max-width:460px;text-align:center">
          <div class="approved-state" style="min-height:180px">
            <b>✓</b>
            <h2>Application Submitted!</h2>
            <p>Your pitch for <b>${escapeHTML(opp?.title || "this posting")}</b> has been received. If the recruiter likes your proposal, you'll receive an interview invitation in your dashboard.</p>
          </div>
          <button class="primary" style="width:100%;margin-top:12px" data-action="close-modal">Back to Feed</button>
        </section>
      </div>
    `;
    render();
    return;
  }

  // Apply page form (from apply route)
  if (form.id === "application-form") {
    const data = formData(form);
    const opp = state.opportunities.find((o) => o.id === data.opportunityId);
    const candidate = {
      id: uid("cand"),
      userId: activeUserId,
      name: data.name,
      company: data.company,
      email: data.email,
      role: data.role,
      bio: (data.proposalText || "").slice(0, 150)
    };
    const app = {
      id: uid("app"),
      opportunityId: data.opportunityId,
      candidateId: candidate.id,
      status: "submitted",
      proposalText: data.proposalText,
      whyApply: data.proposalText,
      documents: data.document?.name ? [{ name: data.document.name, kind: "Uploaded file" }] : [],
      analysis: null,
      interview: null,
      meeting: null,
      invitedToInterview: false
    };
    state.candidates.push(candidate);
    analyze(app);
    state.applications.push(app);
    saveState(state);
    modal = html`
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal" style="max-width:460px;text-align:center">
          <div class="approved-state" style="min-height:180px">
            <b>✓</b>
            <h2>Pitch Submitted!</h2>
            <p>Your application for <b>${escapeHTML(opp?.title || "this posting")}</b> is in. Head to your dashboard to track its status.</p>
          </div>
          <button class="primary" style="width:100%;margin-top:12px" data-action="go-dashboard">View My Dashboard</button>
        </section>
      </div>
    `;
    render();
    return;
  }

  if (form.id === "opportunity-form") {
    const data = formData(form);
    state.opportunities.unshift({
      id: uid("opp"),
      ownerId: activeUserId,
      title: data.title,
      description: data.description,
      mustHaves: data.mustHaves,
      niceToHaves: data.niceToHaves,
      status: "open",
      createdAt: new Date().toISOString().slice(0, 10)
    });
    saveState(state);
    route = "dashboard";
    render();
  }

  if (form.id === "entry-access-form") {
    const data = formData(form);
    updateAccessDraft(data);
    verificationResult = verifyAccess(data, verificationResult);
    const user = currentUser();
    user.name = data.name || data.company;
    user.company = data.company;
    user.email = (data.email || "").trim();
    const savedPw = data.password || accessDraft.password;
    if (savedPw) user.password = savedPw;
    user.verified = verificationResult.status === "verified";
    user.verification = {
      hrEmail: data.hrEmail,
      authorizedBy: data.authorizedBy,
      businessCode: verificationResult.registration,
      linkedIn: verificationResult.linkedIn,
      letterName: verificationResult.letterName,
      letterSize: verificationResult.letterSize,
      supportName: verificationResult.supportName,
      supportSize: verificationResult.supportSize,
      letterPurpose: verificationResult.letterPurpose,
      supportPurpose: verificationResult.supportPurpose,
      signed: Boolean(data.signed),
      score: verificationResult.score,
      status: verificationResult.status,
      checks: verificationResult.checks,
      checkedAt: new Date().toISOString()
    };
    saveState(state);
    if (user.verified) {
      modal = html`
        <div class="modal-backdrop verified-transfer">
          <section class="modal transfer-card">
            <div class="approved-state">
              <b>✓</b>
              <h2>Verified! Bringing you to the dashboard...</h2>
              <p>${escapeHTML(user.company)} passed the company email, ${entryRole === "candidate" ? "HR approval" : "company admin approval"}, business code, authorization letter, signature, and code checks.</p>
            </div>
          </section>
        </div>
      `;
      render();
      setTimeout(() => {
        modal = "";
        route = "dashboard";
        verificationResult = null;
        render();
      }, 1200);
      return;
    }
    render();
  }

  if (form.id === "interview-form") {
    const answer = byId("interview-answer").value.trim();
    if (answer) window.__bridgeXInterviewNext(answer);
  }

  if (form.id === "meeting-form") {
    const data = formData(form);
    const { app, candidate } = findApp(form.dataset.app);
    const meeting = {
      id: uid("meet"),
      applicationId: app.id,
      candidateCompany: candidate.company,
      ...data,
      status: "confirmed"
    };
    app.meeting = meeting;
    app.status = "meeting-scheduled";
    state.meetings.push(meeting);
    modal = "";
    saveState(state);
    render();
  }

  if (form.id === "company-verification-form") {
    const user = currentUser();
    user.verified = false;
    user.verification = {
      ...(user.verification || {}),
      status: "pending_review",
      checkedAt: new Date().toISOString()
    };
    saveState(state);
    alert("Verification submitted for review. Network and dashboard remain locked until final approval.");
    render();
  }

  if (form.id === "referral-invite-form") {
    event.preventDefault();
    const data = formData(form);
    const email = (data.referredEmail || "").trim().toLowerCase();
    if (!email) return;
    // Store referral locally in state
    if (!state.referrals) state.referrals = [];
    const existing = state.referrals.find((r) => r.referredEmail === email);
    if (existing) {
      byId("referral-invite-status").textContent = `${email} has already been referred.`;
      return;
    }
    state.referrals.push({
      id: uid("ref"),
      referrerId: activeUserId,
      referredEmail: email,
      type: data.type || "company",
      status: "pending",
      createdAt: new Date().toISOString()
    });
    saveState(state);
    form.reset();
    const status = byId("referral-invite-status");
    if (status) {
      status.textContent = `Invite logged for ${email}. They'll appear here once they join BridgeX.`;
      status.className = "referral-invite-confirm";
    }
    render();
  }
});

// Handle "View My Dashboard" button in apply-page success modal
document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (target?.dataset.action === "go-dashboard") {
    modal = "";
    route = "dashboard";
    render();
  }
}, true);

// ── Drag & drop upload zones ───────────────────────────────────────────────────

document.addEventListener("dragover", (e) => {
  const zone = e.target.closest("[data-dropzone]");
  if (!zone) return;
  e.preventDefault();
  zone.classList.add("drag-over");
});

document.addEventListener("dragleave", (e) => {
  const zone = e.target.closest("[data-dropzone]");
  if (!zone || zone.contains(e.relatedTarget)) return;
  zone.classList.remove("drag-over");
});

document.addEventListener("drop", (e) => {
  const zone = e.target.closest("[data-dropzone]");
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove("drag-over");
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const inputName = zone.dataset.dropzone;
  const input = zone.querySelector(`input[name="${inputName}"]`) || document.querySelector(`input[name="${inputName}"]`);
  if (!input) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

// ── Tab autocomplete for key textareas ────────────────────────────────────────

const SUGGESTIONS = {
  proposalText: [
    "We are a sustainability-focused company with proven experience in ESG reporting, document screening, and APAC enterprise deployments. Our team of {X} professionals has delivered {capability} for clients including {client}.",
    "Our company specialises in {domain} with a track record of delivering {outcome} for enterprise clients across {region}. We address the must-haves through our {solution}.",
    "As a certified partner in {area}, we bring deep expertise in {skill} combined with a scalable, secure infrastructure that meets enterprise compliance standards."
  ],
  description: [
    "We are looking for a verified partner to help our enterprise clients with {capability}. The ideal partner brings hands-on experience in {domain}, a proven delivery track record, and the ability to scale across {region}.",
    "This partnership opportunity is focused on {area}. We need a company that can demonstrate {requirement} and integrate with our existing {stack}."
  ],
  mustHaves: [
    "ESG reporting experience, document screening, secure enterprise data handling, APAC deployment experience",
    "API integration capability, ISO 27001 certification, enterprise SLA track record, GDPR compliance",
    "Proven B2B partnership history, scalable infrastructure, dedicated account management, industry certifications"
  ],
  whyApply: [
    "We are a strong fit for this partnership because our company has direct experience in {must-have}, including {specific example}. We have delivered similar outcomes for {client type} clients across {region}.",
    "Our proposal addresses each must-have requirement: {list}. We bring a team of {size} specialists and a delivery timeline of {timeline}."
  ]
};

document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const el = e.target;
  if (!el.matches("textarea[data-suggest], input[data-suggest]")) return;
  const field = el.dataset.suggest;
  const list = SUGGESTIONS[field];
  if (!list) return;
  const current = el.value;
  // Find a suggestion that starts with what's already typed, or use the first
  const suggestion = list.find((s) => current.length > 0 && s.toLowerCase().startsWith(current.toLowerCase())) || (current.length === 0 ? list[0] : null);
  if (suggestion && suggestion !== current) {
    e.preventDefault();
    el.value = suggestion;
    el.selectionStart = current.length;
    el.selectionEnd = suggestion.length;
  }
});

// ── Boot (async — tries to hydrate from server if session exists) ─────────────

(async () => {
  if (hasSession()) {
    try {
      const res = await fetch("/api/state", {
        headers: { Authorization: `Bearer ${localStorage.getItem("bridgex_token")}` }
      });
      if (res.ok) {
        const serverState = await res.json();
        if (serverState && serverState.users) {
          state = serverState;
          localStorage.setItem("bridgex_state_v17", JSON.stringify(serverState));
        }
      }
    } catch { /* use localStorage fallback */ }
  }

  // Validate that the stored activeUserId still exists in state (handles resets/state changes)
  if (!state.users.find((u) => u.id === activeUserId)) {
    setActiveUser(state.users[0].id);
  }

  // If there's a saved session and a verified user, go straight to dashboard
  const saved = localStorage.getItem(SESSION_USER_KEY);
  if (saved && route === "home") {
    const u = state.users.find((u) => u.id === saved);
    if (u && u.verified) route = "dashboard";
  }

  state.applications.forEach((app) => {
    if (!app.analysis) analyze(app);
  });
  saveState(state);
  render();
})();
