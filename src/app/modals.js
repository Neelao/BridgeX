import { ctx, currentUser, findApp, analyze } from "./ctx.js";
import { render } from "./shell.js";
import { html, escapeHTML, byId } from "../shared/utils.js";
import { saveState } from "../shared/state.js";
import { summarizeInterview } from "../features/candidate-hub/ai-analysis/analysis.js";
import { buildInterviewQuestions } from "../features/candidate-hub/interview/interview.js";
import { renderAiInterviewScheduleModal, renderScheduleModal } from "../features/recruiter-hub/scheduling/scheduling.js";

function speakAiQuestion(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 0.98;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices?.() || [];
  utterance.voice = voices.find((voice) => /english|us/i.test(voice.lang) && /male|daniel|alex|david|google/i.test(voice.name)) || voices.find((voice) => /en/i.test(voice.lang)) || null;
  window.__bridgeXAiSpeaking = true;
  utterance.onend = () => { window.__bridgeXAiSpeaking = false; };
  window.speechSynthesis.speak(utterance);
}

function renderInterviewAnalysisLoading(candidate, opportunity) {
  return html`
    <div class="modal-backdrop">
      <section class="modal interview-analysis-loading">
        <div class="analysis-orbit">
          <span></span><span></span><span></span>
          <b>AI</b>
        </div>
        <div>
          <span class="hero-pill">Interview complete</span>
          <h2>BridgeX AI is extracting your pitch notes...</h2>
          <p>Analyzing ${escapeHTML(candidate.company)}'s answers for requirement match, proof strength, partnership risks, follow-up questions, and recruiter-ready highlights for ${escapeHTML(opportunity.title)}.</p>
          <div class="analysis-stage-list">
            <span>Capturing answer transcript</span>
            <span>Scoring spoken evidence against must-haves</span>
            <span>Finding strengths, risks, and next steps</span>
            <span>Preparing recruiter summary</span>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderInterviewSummaryScreen(app, candidate, opportunity) {
  const summary = app.interview?.summary;
  const keyPoints = summary?.keyPoints || [];
  return html`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal interview-summary-modal">
        <div class="interview-summary-hero">
          <div>
            <span class="hero-pill">AI interview notes ready</span>
            <h2>${escapeHTML(candidate.company)} pitch summary</h2>
            <p>${escapeHTML(summary?.pitchSummary || "BridgeX captured the full interview transcript and generated recruiter notes.")}</p>
          </div>
          <div class="scan-score-card">
            <b>${summary?.score ?? 0}</b>
            <span>overall score</span>
            <small>${escapeHTML(summary?.recommendation || "Review recommended")}</small>
          </div>
        </div>

        <div class="scan-panel">
          <h3>Key notes from the interviewee</h3>
          <div class="scan-evidence-grid">
            ${keyPoints.map((point) => html`
              <div>
                <b>${escapeHTML(point.label)}</b>
                <p>${escapeHTML(point.value)}</p>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="interview-transcript-review">
          <h3>Captured Q&A transcript</h3>
          ${(app.interview?.answers || []).map((item, idx) => html`
            <div class="interview-qa-card">
              <b>Q${idx + 1}. ${escapeHTML(item.question)}</b>
              <p>${escapeHTML(item.answer)}</p>
            </div>
          `).join("")}
        </div>

        <div class="scan-results-actions">
          <button class="primary" data-action="close-modal">Back to Dashboard</button>
          <button class="ghost" data-action="go-dashboard">Review in Dashboard</button>
        </div>
      </section>
    </div>
  `;
}

export function showCandidate(appId) {
  const { app, candidate, opportunity } = findApp(appId);
  if (!app) return;
  if (!app.analysis) analyze(app);
  const summary = app.interview?.summary;
  const documentScan = app.analysis?.documentScan;
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
            ${documentScan ? html`
              <div class="ai-document-scan">
                <h3>AI document scan</h3>
                <p><b>${documentScan.confidence}/100 evidence confidence</b> — ${escapeHTML(documentScan.summary)}</p>
                <div class="scan-keypoints">
                  ${documentScan.keyPoints.map((point) => html`
                    <div>
                      <b>${escapeHTML(point.label)}</b>
                      <span>${escapeHTML(point.value)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}
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
            ${summary.keyPoints ? html`
              <div class="ai-document-scan compact">
                <h3>AI interview key points</h3>
                <p><b>${summary.evidenceScore}/100 spoken evidence score</b> from camera/voice transcript.</p>
                <div class="scan-keypoints">
                  ${summary.keyPoints.map((point) => html`
                    <div>
                      <b>${escapeHTML(point.label)}</b>
                      <span>${escapeHTML(point.value)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}
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
    const currentQuestion = questions[index];
    ctx.modal = html`
      <div class="modal-backdrop">
        <section class="modal interview-room-modal">
          <div class="mock-interview-header">
            <div class="interview-brand-pill">
              <span class="interview-bot-mark">BX</span>
              <b>BridgeX Interview</b>
            </div>
            <div>
              <h2>AI Pitch Interview</h2>
              <p><span class="live-dot"></span> Live session · ${escapeHTML(candidate.company)} pitching for ${escapeHTML(opportunity.title)}</p>
            </div>
            <button class="finish-pill" type="submit" form="interview-form">${index + 1 === questions.length ? "Finish" : "Next"}</button>
          </div>

          <div class="video-call-grid pitch-call-grid">
            <div class="video-tile ai-video-tile primary-ai-tile">
              <img src="assets/ai-interviewer.png" alt="BridgeX AI interviewer Maya" />
              <div class="ai-speaking-ring"></div>
              <div class="ai-mouth-pulse"><span></span><span></span><span></span></div>
              <div class="ai-waveform"><span></span><span></span><span></span><span></span><span></span></div>
              <div class="video-label">AI interviewer <span>speaking</span></div>
            </div>
            <div class="video-tile user-video-tile video-box interview-camera" id="video-box">
              <div class="video-placeholder">
                <div class="camera-icon">◉</div>
                <b>Your camera</b>
                <span>Click Open camera + mic, allow permissions, then speak naturally.</span>
                <button class="call-chip" type="button" data-action="start-camera">Open camera + mic</button>
              </div>
              <div class="video-label left">You <span>mic ready</span></div>
            </div>
          </div>

          <div class="interview-lower-grid">
            <div class="interview-status-panel">
              <h3>Status</h3>
              <div class="status-row"><span>Room ID</span><b>${escapeHTML(app.id.replace("app_", "").slice(0, 10).toUpperCase())}</b></div>
              <div class="status-row"><span>Room connected</span><b>CONNECTED</b></div>
              <div class="status-row"><span>Agent connected</span><b>TRUE</b></div>
              <div class="status-row"><span>Recording</span><b>ON AFTER CAMERA</b></div>
            </div>

            <form class="form" id="interview-form">
              <div class="chat-panel">
                <div class="ai-chat-row">
                  <img src="assets/ai-interviewer.png" alt="" />
                  <p>${escapeHTML(currentQuestion)}</p>
                </div>
                ${answers.length ? html`
                  <div class="chat-history">
                    ${answers.map((item, itemIndex) => html`
                      <div class="interview-question-replay">
                        <b>Q${itemIndex + 1}</b>
                        <span>${escapeHTML(item.question)}</span>
                      </div>
                      <div class="user-chat-row">
                        <p>${escapeHTML(item.answer)}</p>
                        <span>you</span>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
              <span class="badge">Question ${index + 1} of ${questions.length}</span>
              <textarea id="interview-answer" name="answer"></textarea>
              <div class="spoken-answer-panel" id="spoken-transcript">
                <b>Your spoken answer will appear here</b>
                <span>Open camera + mic, listen to Maya's question, then answer out loud. This answer is saved only for question ${index + 1}.</span>
              </div>
              <div class="live-ai-scan" id="live-ai-scan">
                AI is waiting for your answer. It will scan for proof, skills, requirement matches, and risks in real time.
              </div>
              <div class="actions">
                <button class="ghost" type="button" data-action="voice-answer">Start microphone transcript</button>
                <button class="primary" type="submit">${index + 1 === questions.length ? "Finish Interview" : "Save & Continue"}</button>
                <button class="ghost" type="button" data-action="close-modal">Exit</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    `;
    render();
    setTimeout(() => speakAiQuestion(currentQuestion), 350);
  }

  window.__bridgeXInterviewNext = (answer) => {
    answers.push({ question: questions[index], answer });
    try {
      window.__bridgeXListening = false;
      window.__bridgeXRecognition?.stop?.();
      window.speechSynthesis?.cancel?.();
      window.__bridgeXFinalTranscript = "";
    } catch {}
    index += 1;
    if (index >= questions.length) {
      app.interview = {
        mode: "text/voice/video",
        recording: window.__bridgeXRecorder?.chunks?.length ? `browser-recording-${app.id}.webm` : `recording-${app.id}.webm`,
        recordingStatus: window.__bridgeXRecorder?.chunks?.length ? "camera-session-captured" : "transcript-only",
        completedAt: new Date().toISOString(),
        answers
      };
      try {
        window.__bridgeXListening = false;
        window.__bridgeXRecognition?.stop?.();
        window.__bridgeXRecorder?.recorder?.stop();
        window.__bridgeXActiveStream?.getTracks?.().forEach((track) => track.stop());
      } catch {}
      window.__bridgeXRecognition = null;
      window.__bridgeXRecorder = null;
      window.__bridgeXActiveStream = null;
      app.interview.summary = summarizeInterview(opportunity, app, app.interview);
      app.status = "interview-complete";
      saveState(ctx.state);
      ctx.modal = renderInterviewAnalysisLoading(candidate, opportunity);
      render();
      setTimeout(() => {
        ctx.modal = renderInterviewSummaryScreen(app, candidate, opportunity);
        render();
      }, 1900);
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
          <button class="primary" data-action="consent-and-start" data-app="${appId}">Start Live Camera Interview</button>
          <button class="ghost" data-action="close-modal">Cancel</button>
        </div>
        <div class="consent-modes" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
          <span class="hint" style="display:block;margin-bottom:8px">Your browser will request camera and microphone access on the next screen. If permission is blocked, text fallback still works.</span>
          <button class="mini-btn" data-action="consent-and-start" data-app="${appId}" data-mode="text">Use text fallback</button>
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

export function scheduleAiInterview(appId) {
  const { app, candidate, opportunity } = findApp(appId);
  ctx.modal = renderAiInterviewScheduleModal(app, candidate, opportunity);
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
            <label>CV / proposal / pitch deck</label>
            <label class="single-file-picker" data-dropzone="resume">
              <input name="resume" type="file" accept=".pdf,.doc,.docx,.txt,.pptx" />
              <span class="file-icon">PDF</span>
              <span class="file-info">
                <b data-upload-status="resume">No file selected yet</b>
                <small>Attach one PDF, DOC, DOCX, TXT, or PPTX file.</small>
              </span>
              <span class="file-change-btn">Choose file</span>
            </label>
          </div>
          <button class="primary" type="submit" style="width:100%">Submit Application</button>
        </form>
      </section>
    </div>
  `;
  render();
}
