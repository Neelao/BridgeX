import { escapeHTML, html, todayPlus } from "../../../shared/utils.js";

export function renderScheduleModal(app, candidate) {
  return html`
    <div class="modal-backdrop" data-action="close-modal">
      <form class="modal form" id="meeting-form" data-app="${app.id}">
        <h2>Schedule Meeting With ${escapeHTML(candidate.company)}</h2>
        <div class="grid cols-2">
          <div class="field">
            <label>Date</label>
            <input name="date" type="date" value="${todayPlus(2)}" required />
          </div>
          <div class="field">
            <label>Time</label>
            <input name="time" type="time" value="14:00" required />
          </div>
        </div>
        <div class="field">
          <label>Meeting type</label>
          <select name="type">
            <option>Online</option>
            <option>Face to face</option>
          </select>
        </div>
        <div class="field">
          <label>Link or location</label>
          <input name="location" placeholder="Google Meet link or office address" required />
        </div>
        <div class="field">
          <label>Message</label>
          <textarea name="message">We reviewed your pitch summary and would like to schedule a follow-up meeting.</textarea>
        </div>
        <div class="actions">
          <button class="primary" type="submit">Confirm Meeting</button>
          <button class="ghost" type="button" data-action="close-modal">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

export function renderAiInterviewScheduleModal(app, candidate, opportunity) {
  return html`
    <div class="modal-backdrop" data-action="close-modal">
      <form class="modal form ai-slot-modal" id="ai-interview-slot-form" data-app="${app.id}">
        <div class="topbar">
          <div>
            <h2>Schedule AI Interview</h2>
            <p>${escapeHTML(candidate.company)} pitching for ${escapeHTML(opportunity?.title || "this opportunity")}</p>
          </div>
          <span class="badge good">AI interviewer ready</span>
        </div>

        <div class="ai-interview-preview">
          <div class="ai-person">
            <div class="ai-person-face">
              <span></span>
              <span></span>
            </div>
          </div>
          <div>
            <b>Maya, BridgeX AI interviewer</b>
            <p>I will ask your pitch questions live, listen through your microphone, and scan your answers for requirement matches, proof, risks, and next steps.</p>
          </div>
        </div>

        <div class="grid cols-2">
          <div class="field">
            <label>Preferred date</label>
            <input name="date" type="date" value="${todayPlus(1)}" required />
          </div>
          <div class="field">
            <label>Preferred time</label>
            <input name="time" type="time" value="10:00" required />
          </div>
        </div>

        <div class="field">
          <label>Interview mode</label>
          <select name="mode">
            <option>Live camera + microphone</option>
            <option>Microphone only</option>
            <option>Text fallback</option>
          </select>
          <span class="hint">For the live demo, choose camera + microphone and allow browser permissions when prompted.</span>
        </div>

        <div class="field">
          <label>Anything the AI should know before starting?</label>
          <textarea name="note" placeholder="Example: I want to focus on our sustainability pilot and data security proof."></textarea>
        </div>

        <div class="actions">
          <button class="primary" type="submit">Confirm Slot & Start AI Interview</button>
          <button class="ghost" type="button" data-action="go-dashboard">Do Later</button>
        </div>
      </form>
    </div>
  `;
}
