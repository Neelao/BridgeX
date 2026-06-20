import { ctx, currentUser, findApp, updateAccessDraft, askAiHelper, protectedRoute, analyze, setActiveUser, isCandidate } from "./ctx.js";
import { render } from "./shell.js";
import { showCandidate, startInterview, showConsentModal, startAvatarInterview, schedule, showApplyModal } from "./modals.js";
import { html, escapeHTML, byId, formData } from "../shared/utils.js";
import { saveState, resetState, uid } from "../shared/state.js";
import { verifyAccess, reviewAuthorizationLetter, buildAiHelperReply } from "../features/portal-flow/verification/verification.js";
import { apiLogout, apiUploadFile } from "../shared/api.js";

// ── Click ──────────────────────────────────────────────────────────────────────

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, .modal-backdrop");
  if (!target) return;

  if (target.dataset.route) {
    ctx.route = protectedRoute(target.dataset.route) && !currentUser().verified ? "access" : target.dataset.route;
    ctx.modal = "";
    render();
  }

  if (target.dataset.action === "close-modal" && (event.target === target || target.tagName === "BUTTON")) {
    ctx.modal = "";
    render();
  }

  if (target.dataset.action === "switch-user") { setActiveUser(target.dataset.user); render(); }
  if (target.dataset.action === "go-home") { ctx.route = "home"; ctx.modal = ""; render(); }
  if (target.dataset.action === "go-login") { ctx.loginError = ""; ctx.route = "login"; ctx.modal = ""; render(); }
  if (target.dataset.action === "go-verification") { ctx.route = "access"; ctx.modal = ""; render(); }

  if (target.dataset.action === "logout") {
    setActiveUser(null);
    apiLogout().catch(() => {});
    ctx.modal = "";
    ctx.route = "home";
    render();
  }

  if (target.dataset.action === "reset-demo") {
    ctx.state = resetState();
    setActiveUser(ctx.state.users[0].id);
    apiLogout().catch(() => {});
    ctx.modal = "";
    ctx.route = "home";
    ctx.aiHelperMessages = [];
    ctx.accessDraft = {};
    render();
  }

  if (target.dataset.action === "enter-recruiter" || target.dataset.action === "enter-company") {
    const newId = uid("u");
    ctx.state.users.push({ id: newId, role: "recruiter", verified: false, name: "", company: "", email: "" });
    saveState(ctx.state);
    setActiveUser(newId);
    ctx.entryRole = "recruiter";
    ctx.route = "company-type";
    ctx.verificationResult = null;
    ctx.aiHelperMessages = [];
    ctx.accessDraft = {};
    ctx.modal = "";
    render();
  }

  if (target.dataset.action === "enter-candidate") {
    const newId = uid("u");
    ctx.state.users.push({ id: newId, role: "candidate", verified: false, name: "", company: "", email: "" });
    saveState(ctx.state);
    setActiveUser(newId);
    ctx.entryRole = "candidate";
    ctx.route = "intent";
    ctx.verificationResult = null;
    ctx.aiHelperMessages = [];
    ctx.accessDraft = { orgType: "pitcher" };
    ctx.modal = "";
    render();
  }

  if (target.dataset.action === "choose-company-type") {
    ctx.entryRole = "recruiter";
    ctx.verificationResult = null;
    ctx.aiHelperMessages = [];
    ctx.accessDraft = { orgType: target.dataset.companyType || "company" };
    ctx.modal = "";
    ctx.route = "intent";
    render();
  }

  if (target.dataset.action === "ask-ai-prompt") { askAiHelper(target.dataset.question || ""); render(); }

  if (target.dataset.action === "continue-details") {
    const form = document.getElementById("entry-access-form");
    if (!form) return;
    const data = formData(form);
    updateAccessDraft(data);
    const missing = [];
    const establishedCompany = ctx.entryRole === "recruiter" && (data.orgType || ctx.accessDraft.orgType) === "company";
    if (!establishedCompany && !data.name?.trim()) missing.push("full name");
    if (!data.company?.trim()) missing.push("company name");
    if (!data.email?.trim()) missing.push("company email");
    if (!data.hrEmail?.trim()) missing.push(ctx.entryRole === "candidate" ? "HR representative email" : "company admin email");
    if (!data.roleTitle?.trim()) missing.push("role");
    if (!data.businessCode?.trim()) missing.push("business registration code");
    if (!data.password?.trim()) missing.push("password");
    if (missing.length) {
      ctx.aiHelperMessages.push({ role: "assistant", text: `Before upload, please complete: ${missing.join(", ")}. LinkedIn is optional, so you can skip it for the demo.` });
      ctx.aiHelperMessages = ctx.aiHelperMessages.slice(-8);
      render();
      return;
    }
    const next = document.getElementById("portal-step-2");
    if (next) next.checked = true;
  }

  if (target.dataset.action === "open-linkedin-connect") {
    const form = document.getElementById("entry-access-form");
    if (form) updateAccessDraft(formData(form));
    const suggestedCompany = ctx.accessDraft.company || (ctx.entryRole === "recruiter" ? "northstar-ventures" : "greengrid-analytics");
    ctx.modal = html`
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
    if (!/^https:\/\/(www\.)?linkedin\.com\/(company|in)\//i.test(value)) { alert("Please use a LinkedIn company page or profile URL."); return; }
    ctx.accessDraft.linkedIn = value;
    ctx.modal = "";
    ctx.route = "access";
    render();
  }

  if (target.dataset.action === "run-document-review") {
    const form = document.getElementById("entry-access-form");
    if (!form) return;
    const data = formData(form);
    updateAccessDraft(data);
    ctx.modal = html`
      <div class="modal-backdrop ai-review-backdrop">
        <section class="modal ai-review-card">
          <div class="ai-review-loader"></div>
          <h2>AI helper is reviewing your upload...</h2>
          <p>Checking file type, size, company domain, ${ctx.entryRole === "candidate" ? "HR approval email" : "company admin email"}, registration code, optional LinkedIn signal, and signature confirmation.</p>
        </section>
      </div>
    `;
    render();
    setTimeout(() => {
      ctx.verificationResult = reviewAuthorizationLetter(data);
      const user = currentUser();
      user.name = data.name || data.company;
      user.company = data.company;
      user.email = (data.email || "").trim();
      const savedPw = data.password || ctx.accessDraft.password;
      if (savedPw) user.password = savedPw;
      user.verified = false;
      user.verification = {
        ...(user.verification || {}),
        hrEmail: data.hrEmail,
        authorizedBy: data.authorizedBy,
        businessCode: ctx.verificationResult.registration,
        linkedIn: ctx.verificationResult.linkedIn,
        letterName: ctx.verificationResult.letterName,
        letterSize: ctx.verificationResult.letterSize,
        supportName: ctx.verificationResult.supportName,
        supportSize: ctx.verificationResult.supportSize,
        letterPurpose: ctx.verificationResult.letterPurpose,
        supportPurpose: ctx.verificationResult.supportPurpose,
        signed: Boolean(data.signed),
        score: ctx.verificationResult.score,
        status: ctx.verificationResult.status,
        checks: ctx.verificationResult.checks,
        checkedAt: new Date().toISOString(),
        codeDelivery: ctx.verificationResult.status === "document_verified"
          ? (ctx.entryRole === "candidate" ? "sent_to_candidate_and_hr" : "not_required_for_recruiter")
          : "not_sent"
      };
      if (ctx.entryRole === "recruiter" && ctx.verificationResult.status === "document_verified") {
        user.verified = true;
        user.verification.status = "verified";
        user.verification.verifiedAt = new Date().toISOString();
        saveState(ctx.state);
        ctx.modal = html`
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
        setTimeout(() => { ctx.modal = ""; ctx.route = "dashboard"; ctx.verificationResult = null; render(); }, 1200);
        return;
      }
      saveState(ctx.state);
      ctx.aiHelperMessages.push({
        role: "assistant",
        text: ctx.verificationResult.status === "document_verified"
          ? `I reviewed ${ctx.verificationResult.letterName} and the evidence packet passed. I sent verification code 123456 to ${ctx.entryRole === "candidate" ? "the candidate and HR emails" : "the requester and company admin emails"}. Type it in the code field to continue.`
          : `I reviewed the uploaded evidence and found issues. ${buildAiHelperReply("Why did verification fail?", { verificationResult: ctx.verificationResult })}`
      });
      ctx.aiHelperMessages = ctx.aiHelperMessages.slice(-8);
      ctx.modal = "";
      render();
    }, 950);
  }

  if (target.dataset.action === "review-approved") {
    const user = currentUser();
    user.verified = true;
    user.verification = { ...(user.verification || {}), status: "verified", reviewedAt: new Date().toISOString(), emailNotice: "approved" };
    saveState(ctx.state);
    ctx.route = "review";
    render();
  }

  if (target.dataset.action === "review-rejected") {
    const user = currentUser();
    user.verified = false;
    user.verification = { ...(user.verification || {}), status: "rejected", reviewedAt: new Date().toISOString(), emailNotice: "rejected" };
    saveState(ctx.state);
    ctx.route = "review";
    render();
  }

  if (target.dataset.action === "resubmit-verification") {
    currentUser().verified = false;
    ctx.verificationResult = null;
    ctx.aiHelperMessages = [];
    ctx.accessDraft = {};
    ctx.route = "access";
    saveState(ctx.state);
    render();
  }

  if (target.dataset.action === "continue-after-approval") { ctx.route = "feed"; render(); }

  if (target.dataset.action === "choose-area") {
    const user = currentUser();
    user.preference = target.dataset.area;
    ctx.accessDraft.preference = target.dataset.area;
    saveState(ctx.state);
    ctx.route = "access";
    render();
  }

  if (target.dataset.action === "analyze-all") { ctx.state.applications.forEach(analyze); saveState(ctx.state); render(); }
  if (target.dataset.action === "clear-filters") { ctx.dashFilters = { search: "", minScore: 0, status: "all" }; render(); }

  if (target.dataset.action === "copy-referral-code") {
    const code = target.dataset.code || "";
    navigator.clipboard?.writeText(code).then(() => {
      target.textContent = "Copied!";
      setTimeout(() => { target.textContent = "Copy code"; }, 1800);
    }).catch(() => { target.textContent = "Copy code"; });
  }

  if (target.closest?.(".opportunity-preview-card")) {
    const oppId = target.closest(".opportunity-preview-card")?.dataset.oppId;
    if (oppId) { const sel = document.querySelector('select[name="opportunityId"]'); if (sel) sel.value = oppId; }
  }

  if (target.dataset.action === "consent-and-start") {
    const check = byId("consent-check");
    if (!check?.checked) { document.querySelector(".consent-check-label")?.classList.add("shake"); return; }
    ctx.modal = "";
    startInterview(target.dataset.app);
  }

  if (target.dataset.action === "start-avatar-interview") { startAvatarInterview(target.dataset.app); }

  if (target.dataset.action === "like-post") {
    const opp = ctx.state.opportunities.find((o) => o.id === target.dataset.opp);
    if (!opp) return;
    if (!opp.likes) opp.likes = [];
    const idx = opp.likes.indexOf(ctx.activeUserId);
    if (idx === -1) opp.likes.push(ctx.activeUserId); else opp.likes.splice(idx, 1);
    saveState(ctx.state);
    render();
  }

  if (target.dataset.action === "toggle-comments") {
    const oppId = target.dataset.opp;
    if (ctx.expandedComments.has(oppId)) ctx.expandedComments.delete(oppId); else ctx.expandedComments.add(oppId);
    render();
  }

  if (target.dataset.action === "apply-post") showApplyModal(target.dataset.opp);
  if (target.dataset.action === "view-candidate") showCandidate(target.dataset.app);
  if (target.dataset.action === "start-interview") showConsentModal(target.dataset.app);
  if (target.dataset.action === "schedule") schedule(target.dataset.app);

  if (target.dataset.action === "invite-interview") {
    const appId = target.dataset.app;
    const { app, candidate } = findApp(appId);
    if (app) {
      app.status = "interview-invited";
      app.invitedToInterview = true;
      saveState(ctx.state);
      ctx.modal = html`
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

  if (target.dataset.action === "go-dashboard") { ctx.modal = ""; ctx.route = "dashboard"; render(); }

  if (target.dataset.action === "voice-answer") {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const answer = byId("interview-answer");
    if (!SpeechRecognition || !answer) { alert("Speech recognition is not available in this browser, so type mode is ready."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (result) => { answer.value = result.results[0][0].transcript; };
    recognition.start();
  }

  if (target.dataset.action === "start-camera") {
    const box = byId("video-box");
    if (!box) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      box.innerHTML = '<video autoplay muted playsinline></video>';
      box.querySelector("video").srcObject = stream;
    } catch { box.textContent = "Camera permission blocked. Transcript recording continues."; }
  }
});

// ── Change ─────────────────────────────────────────────────────────────────────

const UPLOAD_FIELDS = ["letter", "supportDocument", "document", "resume"];

document.addEventListener("change", async (event) => {
  const input = event.target;

  if (input.dataset?.filter) {
    const val = input.value;
    if (input.dataset.filter === "search") ctx.dashFilters.search = val;
    else if (input.dataset.filter === "minScore") ctx.dashFilters.minScore = Number(val);
    else if (input.dataset.filter === "status") ctx.dashFilters.status = val;
    render();
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
  if (status) { status.textContent = `Uploading ${file.name}…`; status.classList.add("has-file"); }
  try {
    const result = await apiUploadFile(file);
    if (status) status.textContent = `Uploaded: ${result.name} · ${Math.round(result.size / 1024)} KB`;
  } catch {
    if (status) status.textContent = `Ready: ${file.name} · ${sizeKb} KB`;
  }
});

// ── Submit ─────────────────────────────────────────────────────────────────────

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === "login-form") {
    const data = formData(form);
    const email = (data.email || "").trim().toLowerCase();
    const found = ctx.state.users.find((u) => (u.email || "").toLowerCase() === email);
    if (!found) { ctx.loginError = "No account found with that email address."; render(); return; }
    if (found.password && found.password !== data.password) { ctx.loginError = "Incorrect password. Try again."; render(); return; }
    ctx.loginError = "";
    setActiveUser(found.id);
    ctx.entryRole = found.role === "recruiter" ? "recruiter" : "candidate";
    ctx.modal = "";
    if (found.verified) {
      ctx.route = "dashboard";
    } else {
      ctx.accessDraft = { email: found.email, company: found.company || "", name: found.name || "" };
      ctx.route = "access";
    }
    render();
    return;
  }

  if (form.id === "ai-helper-form") {
    askAiHelper(formData(form).question || "");
    form.reset();
    render();
    return;
  }

  if (form.dataset.action === "add-comment") {
    const data = formData(form);
    if (!data.comment?.trim()) return;
    const opp = ctx.state.opportunities.find((o) => o.id === form.dataset.opp);
    if (!opp) return;
    if (!opp.comments) opp.comments = [];
    const user = currentUser();
    opp.comments.push({ id: uid("cmt"), userId: ctx.activeUserId, userName: user.name, company: user.company, text: data.comment.trim(), createdAt: new Date().toISOString().slice(0, 10) });
    saveState(ctx.state);
    render();
    return;
  }

  if (form.id === "apply-modal-form") {
    const data = formData(form);
    const oppId = form.dataset.opp;
    const opp = ctx.state.opportunities.find((o) => o.id === oppId);
    const resumeFile = data.resume;
    const hasResume = resumeFile && typeof resumeFile === "object" && resumeFile.name && resumeFile.size > 0;
    const candidate = { id: uid("cand"), userId: ctx.activeUserId, name: data.name, company: data.company, email: data.email, role: data.role, bio: (data.whyApply || "").slice(0, 150) };
    const app = { id: uid("app"), opportunityId: oppId, candidateId: candidate.id, status: "submitted", proposalText: data.whyApply, whyApply: data.whyApply, resume: hasResume ? { name: resumeFile.name, kind: "Resume/CV" } : null, documents: hasResume ? [{ name: resumeFile.name, kind: "Resume/CV" }] : [], analysis: null, interview: null, meeting: null, invitedToInterview: false };
    ctx.state.candidates.push(candidate);
    analyze(app);
    ctx.state.applications.push(app);
    saveState(ctx.state);
    ctx.modal = html`
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

  if (form.id === "application-form") {
    const data = formData(form);
    const opp = ctx.state.opportunities.find((o) => o.id === data.opportunityId);
    const candidate = { id: uid("cand"), userId: ctx.activeUserId, name: data.name, company: data.company, email: data.email, role: data.role, bio: (data.proposalText || "").slice(0, 150) };
    const app = { id: uid("app"), opportunityId: data.opportunityId, candidateId: candidate.id, status: "submitted", proposalText: data.proposalText, whyApply: data.proposalText, documents: data.document?.name ? [{ name: data.document.name, kind: "Uploaded file" }] : [], analysis: null, interview: null, meeting: null, invitedToInterview: false };
    ctx.state.candidates.push(candidate);
    analyze(app);
    ctx.state.applications.push(app);
    saveState(ctx.state);
    ctx.modal = html`
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
    ctx.state.opportunities.unshift({ id: uid("opp"), ownerId: ctx.activeUserId, title: data.title, description: data.description, mustHaves: data.mustHaves, niceToHaves: data.niceToHaves, status: "open", createdAt: new Date().toISOString().slice(0, 10) });
    saveState(ctx.state);
    ctx.route = "dashboard";
    render();
  }

  if (form.id === "entry-access-form") {
    const data = formData(form);
    updateAccessDraft(data);
    ctx.verificationResult = verifyAccess(data, ctx.verificationResult);
    const user = currentUser();
    user.name = data.name || data.company;
    user.company = data.company;
    user.email = (data.email || "").trim();
    const savedPw = data.password || ctx.accessDraft.password;
    if (savedPw) user.password = savedPw;
    user.verified = ctx.verificationResult.status === "verified";
    user.verification = { hrEmail: data.hrEmail, authorizedBy: data.authorizedBy, businessCode: ctx.verificationResult.registration, linkedIn: ctx.verificationResult.linkedIn, letterName: ctx.verificationResult.letterName, letterSize: ctx.verificationResult.letterSize, supportName: ctx.verificationResult.supportName, supportSize: ctx.verificationResult.supportSize, letterPurpose: ctx.verificationResult.letterPurpose, supportPurpose: ctx.verificationResult.supportPurpose, signed: Boolean(data.signed), score: ctx.verificationResult.score, status: ctx.verificationResult.status, checks: ctx.verificationResult.checks, checkedAt: new Date().toISOString() };
    saveState(ctx.state);
    if (user.verified) {
      ctx.modal = html`
        <div class="modal-backdrop verified-transfer">
          <section class="modal transfer-card">
            <div class="approved-state">
              <b>✓</b>
              <h2>Verified! Bringing you to the dashboard...</h2>
              <p>${escapeHTML(user.company)} passed the company email, ${ctx.entryRole === "candidate" ? "HR approval" : "company admin approval"}, business code, authorization letter, signature, and code checks.</p>
            </div>
          </section>
        </div>
      `;
      render();
      setTimeout(() => { ctx.modal = ""; ctx.route = "dashboard"; ctx.verificationResult = null; render(); }, 1200);
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
    const meeting = { id: uid("meet"), applicationId: app.id, candidateCompany: candidate.company, ...data, status: "confirmed" };
    app.meeting = meeting;
    app.status = "meeting-scheduled";
    ctx.state.meetings.push(meeting);
    ctx.modal = "";
    saveState(ctx.state);
    render();
  }

  if (form.id === "company-verification-form") {
    const user = currentUser();
    user.verified = false;
    user.verification = { ...(user.verification || {}), status: "pending_review", checkedAt: new Date().toISOString() };
    saveState(ctx.state);
    alert("Verification submitted for review. Network and dashboard remain locked until final approval.");
    render();
  }

  if (form.id === "referral-invite-form") {
    const data = formData(form);
    const email = (data.referredEmail || "").trim().toLowerCase();
    if (!email) return;
    if (!ctx.state.referrals) ctx.state.referrals = [];
    const existing = ctx.state.referrals.find((r) => r.referredEmail === email);
    if (existing) { byId("referral-invite-status").textContent = `${email} has already been referred.`; return; }
    ctx.state.referrals.push({ id: uid("ref"), referrerId: ctx.activeUserId, referredEmail: email, type: data.type || "company", status: "pending", createdAt: new Date().toISOString() });
    saveState(ctx.state);
    form.reset();
    const status = byId("referral-invite-status");
    if (status) { status.textContent = `Invite logged for ${email}. They'll appear here once they join BridgeX.`; status.className = "referral-invite-confirm"; }
    render();
  }
});

// ── Drag & drop ────────────────────────────────────────────────────────────────

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

// ── Tab autocomplete ───────────────────────────────────────────────────────────

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
  const list = SUGGESTIONS[el.dataset.suggest];
  if (!list) return;
  const current = el.value;
  const suggestion = list.find((s) => current.length > 0 && s.toLowerCase().startsWith(current.toLowerCase())) || (current.length === 0 ? list[0] : null);
  if (suggestion && suggestion !== current) {
    e.preventDefault();
    el.value = suggestion;
    el.selectionStart = current.length;
    el.selectionEnd = suggestion.length;
  }
});
