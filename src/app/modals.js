import { ctx, currentUser, findApp, analyze } from "./ctx.js";
import { render } from "./shell.js";
import { html, escapeHTML, byId } from "../shared/utils.js";
import { saveState } from "../shared/state.js";
import { summarizeInterview } from "../features/candidate-hub/ai-analysis/analysis.js";
import { buildInterviewQuestions } from "../features/candidate-hub/interview/interview.js";
import { renderScheduleModal } from "../features/recruiter-hub/scheduling/scheduling.js";

export function showCandidate(appId) {
  const { app, candidate } = findApp(appId);
  if (!app) return;
  if (!app.analysis) analyze(app);
  const summary = app.interview?.summary;
  ctx.modal = html`
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
          ${summary ? html`
            <p><b>${summary.score}/100 — ${escapeHTML(summary.recommendation)}</b></p>
            <p>${escapeHTML(summary.pitchSummary)}</p>
            <p><b>Follow-up questions:</b> ${escapeHTML(summary.nextQuestions.join(" | "))}</p>
          ` : "<p>No AI interview completed yet.</p>"}
          ${app.interview?.recording ? html`
            <div class="interview-video-preview">
              <span>🎥 Interview recording: <b>${escapeHTML(app.interview.recording)}</b></span>
              <span class="hint">Video stored for review — playback available in full version.</span>
            </div>
          ` : ""}
          <div class="transcript" style="margin-top: 12px">
            ${(app.interview?.answers || []).map((item) => html`
              <div class="qa">
                <strong>${escapeHTML(item.question)}</strong>
                <span>${escapeHTML(item.answer)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
  saveState(ctx.state);
  render();
}

export function startInterview(appId) {
  const { app, candidate, opportunity } = findApp(appId);
  if (!app.analysis) analyze(app);
  const questions = buildInterviewQuestions(opportunity, app);
  let index = 0;
  const answers = [];

  function screen() {
    ctx.modal = html`
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
            ${answers.map((item) => html`
              <div class="qa">
                <strong>${escapeHTML(item.question)}</strong>
                <span>${escapeHTML(item.answer)}</span>
              </div>
            `).join("")}
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
      saveState(ctx.state);
      ctx.modal = html`
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

export function showConsentModal(appId) {
  const { opportunity } = findApp(appId);
  ctx.modal = html`
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

export function startAvatarInterview(appId) {
  const { app, opportunity } = findApp(appId);
  if (!app.analysis) analyze(app);
  const questions = buildInterviewQuestions(opportunity, app);
  let index = 0;
  const answers = [];

  if (!ctx.state.consentLogs) ctx.state.consentLogs = [];
  ctx.state.consentLogs.push({ appId, userId: ctx.activeUserId, type: "interview_recording", acceptedAt: new Date().toISOString() });

  function avatarScreen() {
    ctx.modal = html`
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
      saveState(ctx.state);
      ctx.modal = html`
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
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return;

  function draw() {
    if (!byId(canvasId)) return;
    const t = Date.now() / 1000;
    canvasCtx.fillStyle = "#0f1117";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = 0.5 + 0.5 * Math.sin(t * 2);
    const grad = canvasCtx.createRadialGradient(180, 140, 60, 180, 140, 100 + glow * 10);
    grad.addColorStop(0, `rgba(42,123,228,${0.3 + glow * 0.2})`);
    grad.addColorStop(1, "rgba(42,123,228,0)");
    canvasCtx.fillStyle = grad;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.beginPath();
    canvasCtx.arc(180, 130, 72, 0, Math.PI * 2);
    canvasCtx.fillStyle = "#1a2440";
    canvasCtx.fill();
    canvasCtx.strokeStyle = "#2a7be4";
    canvasCtx.lineWidth = 2.5;
    canvasCtx.stroke();

    [145, 215].forEach((x) => {
      canvasCtx.beginPath();
      canvasCtx.arc(x, 115, 8, 0, Math.PI * 2);
      canvasCtx.fillStyle = "#4ade80";
      canvasCtx.fill();
    });

    const mouthOpen = 4 + 8 * Math.abs(Math.sin(t * 6));
    canvasCtx.beginPath();
    canvasCtx.ellipse(180, 155, 22, mouthOpen, 0, 0, Math.PI * 2);
    canvasCtx.fillStyle = "#2a7be4";
    canvasCtx.fill();

    canvasCtx.strokeStyle = "#4ade80";
    canvasCtx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = 90 + i * 18;
      const h = 6 + 14 * Math.abs(Math.sin(t * 5 + i * 0.6));
      canvasCtx.beginPath();
      canvasCtx.moveTo(x, 225 - h);
      canvasCtx.lineTo(x, 225 + h);
      canvasCtx.stroke();
    }

    canvasCtx.fillStyle = "#4ade8066";
    canvasCtx.font = "10px monospace";
    canvasCtx.fillText("TAVUS CVI · LIVE", 120, 270);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

export function schedule(appId) {
  const { app, candidate } = findApp(appId);
  ctx.modal = renderScheduleModal(app, candidate);
  render();
}

export function showApplyModal(oppId) {
  const opp = ctx.state.opportunities.find((o) => o.id === oppId);
  if (!opp) return;
  const user = currentUser();
  ctx.modal = html`
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
