import { analyzeApplication, summarizeInterview } from "./features/candidate-hub/ai-analysis/analysis.js";
import { renderAuth } from "./features/portal-flow/auth/auth.js";
import { renderCandidateApply } from "./features/candidate-hub/candidates/candidates.js";
import { renderDashboard } from "./features/recruiter-hub/dashboard_rec/dashboard_rec.js";
import { renderDocuments } from "./features/recruiter-hub/documents/documents.js";
import { renderCompanyTypePicker, renderIntentPicker } from "./features/portal-flow/intent/intent.js";
import { buildInterviewQuestions } from "./features/candidate-hub/interview/interview.js";
import { renderNetworkFeed } from "./features/shared/feed/feed.js";
import { partnershipAreas } from "./features/portal-flow/partnership/areas.js";
import { renderLanding } from "./features/portal-flow/public/landing.js";
import { renderRequirements } from "./features/recruiter-hub/requirements/requirements.js";
import { renderScheduleModal } from "./features/recruiter-hub/scheduling/scheduling.js";
import { buildAiHelperReply, renderAccessPage, renderReviewPage, reviewAuthorizationLetter, verifyAccess } from "./features/portal-flow/verification/verification.js";
import { loadState, resetState, saveState, uid } from "./shared/state.js";
import { byId, escapeHTML, formData, html } from "./shared/utils.js";

let state = loadState();
let route = "home";
let activeUserId = state.users[0].id;
let modal = "";
let entryRole = "recruiter";
let verificationResult = null;
let aiHelperMessages = [];
let accessDraft = {};
let expandedComments = new Set();

const routes = [
  ["feed", "Feed"],
  ["dashboard", "Dashboard"],
  ["requirements", "Post Requirement"],
  ["apply", "Apply"],
  ["documents", "Documents"],
  ["auth", "Verify/Login"]
];

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
  return ["feed", "dashboard", "requirements", "apply", "documents", "auth"].includes(nextRoute);
}

function renderMain() {
  if (protectedRoute(route) && !currentUser().verified) {
    route = "access";
    return renderAccessPage(entryRole, verificationResult, aiHelperMessages, accessDraft);
  }
  if (route === "home") return renderLanding();
  if (route === "company-type") return renderCompanyTypePicker();
  if (route === "access") return renderAccessPage(entryRole, verificationResult, aiHelperMessages, accessDraft);
  if (route === "review") return renderReviewPage(currentUser());
  if (route === "intent") return renderIntentPicker(entryRole, partnershipAreas);
  if (route === "feed") return renderNetworkFeed(state, currentUser(), partnershipAreas, expandedComments);
  if (route === "requirements") return renderRequirements(state);
  if (route === "apply") return renderCandidateApply(state);
  if (route === "documents") return renderDocuments(state);
  if (route === "auth") return renderAuth(state, activeUserId);
  return renderDashboard(state, currentUser());
}

function appShell() {
  const user = currentUser();
  if (route === "home" || route === "access" || route === "intent" || route === "company-type") {
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
            <button class="nav-cta" data-action="enter-recruiter">For Companies</button>
          </div>
        </header>
        ${renderMain()}
      </main>
      ${modal}
    `;
  }

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
          <strong>${escapeHTML(user.name)}</strong>
          <span>${escapeHTML(user.company)} - ${escapeHTML(user.role)}</span>
          <span class="badge ${user.verified ? "good" : "warn"}">${user.verified ? "Verified" : "Pending verification"}</span>
          <button class="ghost" data-action="reset-demo">Reset demo</button>
        </div>
      </aside>
      <section class="content">
        <div class="topbar">
          <div>
            <h1>${routes.find(([id]) => id === route)?.[1] || "Dashboard"}</h1>
            <p>Verified partner discovery from requirement to introduction to meeting.</p>
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

function showCandidate(appId) {
  const { app, candidate, opportunity } = findApp(appId);
  if (!app) return;
  if (!app.analysis) analyze(app);
  const summary = app.interview?.summary;
  modal = html`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal">
        <div class="topbar">
          <div>
            <h2>${escapeHTML(candidate.company)}</h2>
            <p>${escapeHTML(candidate.name)} - ${escapeHTML(candidate.role)} - ${escapeHTML(candidate.email)}</p>
          </div>
          <button class="ghost" data-action="close-modal">Close</button>
        </div>
        <div class="grid cols-2">
          <div class="card">
            <h3>Proposal</h3>
            <p>${escapeHTML(app.proposalText)}</p>
            <h3>Documents</h3>
            ${(app.documents || []).map((doc) => `<span class="badge">${escapeHTML(doc.name)}</span>`).join(" ")}
          </div>
          <div class="card">
            <h3>Fit Review</h3>
            <p><b>${app.analysis.score}/100 - ${escapeHTML(app.analysis.recommendation)}</b></p>
            <p>${escapeHTML(app.analysis.reasoning)}</p>
            <h3>Strengths</h3>
            <p>${escapeHTML(app.analysis.strengths.join(" | "))}</p>
            <h3>Risks</h3>
            <p>${escapeHTML(app.analysis.risks.join(" | "))}</p>
          </div>
        </div>
        <div class="panel" style="margin-top: 14px">
          <h3>Pitch Summary</h3>
          ${
            summary
              ? html`
                  <p><b>${summary.score}/100 - ${escapeHTML(summary.recommendation)}</b></p>
                  <p>${escapeHTML(summary.pitchSummary)}</p>
                  <p><b>Next questions:</b> ${escapeHTML(summary.nextQuestions.join(" | "))}</p>
                `
              : "<p>No guided pitch session completed yet.</p>"
          }
          <div class="transcript">
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
              <h2>Guided Pitch Room</h2>
              <p>${escapeHTML(candidate.company)} for ${escapeHTML(opportunity.title)}</p>
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
              <textarea id="interview-answer" name="answer" placeholder="Type or dictate the answer..." required></textarea>
              <div class="actions">
                <button class="primary" type="submit">${index + 1 === questions.length ? "Finish Interview" : "Save Answer"}</button>
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
      modal = "";
      saveState(state);
      render();
      showCandidate(app.id);
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
        <form id="apply-modal-form" data-opp="${oppId}" class="form">
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
    activeUserId = target.dataset.user;
    render();
  }

  if (target.dataset.action === "reset-demo") {
    state = resetState();
    activeUserId = state.users[0].id;
    modal = "";
    route = "home";
    aiHelperMessages = [];
    accessDraft = {};
    render();
  }

  if (target.dataset.action === "enter-company") {
    activeUserId = "u_recruiter";
    entryRole = "recruiter";
    route = "company-type";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = {};
    modal = "";
    render();
  }

  if (target.dataset.action === "choose-company-type") {
    activeUserId = "u_recruiter";
    entryRole = "recruiter";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = { orgType: target.dataset.companyType || "company" };
    modal = "";
    route = "intent";
    render();
  }

  if (target.dataset.action === "enter-recruiter") {
    activeUserId = "u_recruiter";
    entryRole = "recruiter";
    route = "company-type";
    verificationResult = null;
    aiHelperMessages = [];
    accessDraft = {};
    modal = "";
    render();
  }

  if (target.dataset.action === "enter-candidate") {
    activeUserId = "u_candidate";
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
      user.email = data.email;
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

  if (target.dataset.action === "invite-interview") {
    const appId = target.dataset.app;
    const app = state.applications.find((a) => a.id === appId);
    if (app) {
      app.status = "interview-invited";
      app.invitedToInterview = true;
      saveState(state);
    }
    startInterview(appId);
  }

  if (target.dataset.action === "view-candidate") showCandidate(target.dataset.app);
  if (target.dataset.action === "start-interview") startInterview(target.dataset.app);
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

document.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !["letter", "supportDocument"].includes(input.name)) return;
  const file = input.files?.[0];
  const status = document.querySelector(`[data-upload-status="${input.name}"]`);
  if (!status) return;
  if (!file) {
    status.textContent = input.name === "letter" ? "No file selected yet" : "No supporting file selected";
    status.classList.remove("has-file");
    return;
  }
  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  status.textContent = `Uploaded: ${file.name} · ${sizeKb} KB`;
  status.classList.add("has-file");
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

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
        <section class="modal" style="max-width:440px;text-align:center">
          <div class="approved-state" style="min-height:180px">
            <b>✓</b>
            <h2>Application Submitted!</h2>
            <p>Your pitch for <b>${escapeHTML(opp?.title || "this posting")}</b> is in. The recruiter's AI will review it and may invite you to an AI mock interview.</p>
          </div>
          <button class="primary" style="width:100%;margin-top:12px" data-action="close-modal">Back to Feed</button>
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
    user.email = data.email;
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

  if (form.id === "application-form") {
    const data = formData(form);
    const candidate = {
      id: uid("cand"),
      userId: activeUserId,
      name: data.name,
      company: data.company,
      email: data.email,
      role: data.role,
      bio: data.proposalText.slice(0, 150)
    };
    const app = {
      id: uid("app"),
      opportunityId: data.opportunityId,
      candidateId: candidate.id,
      status: "submitted",
      proposalText: data.proposalText,
      documents: data.document?.name ? [{ name: data.document.name, kind: "Uploaded file" }] : [],
      analysis: null,
      interview: null,
      meeting: null
    };
    state.candidates.push(candidate);
    analyze(app);
    state.applications.push(app);
    saveState(state);
    route = "dashboard";
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
});

state.applications.forEach((app) => {
  if (!app.analysis) analyze(app);
});
saveState(state);
render();