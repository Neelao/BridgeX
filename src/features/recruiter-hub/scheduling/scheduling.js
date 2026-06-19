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
