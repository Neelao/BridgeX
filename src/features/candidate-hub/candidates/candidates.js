import { escapeHTML, html, truncate } from "../../../shared/utils.js";

export function renderCandidateApply(state, user) {
  const opportunities = state.opportunities.filter((item) => item.status === "open");
  return html`
    <section class="split">
      <form class="panel form" id="application-form">
        <h2>Pitch Your Company</h2>
        <p class="hint" style="margin-bottom:16px">Tell the recruiter why your company is the right partner. Be specific — the AI will score your proposal against the posting's must-haves.</p>

        <div class="field">
          <label data-tooltip="Choose which partnership posting you are pitching for">Posting</label>
          <select name="opportunityId" required>
            ${opportunities.map((opp) => `<option value="${opp.id}">${escapeHTML(opp.title)}</option>`).join("")}
          </select>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>Your name</label>
            <input name="name" value="${escapeHTML(user?.name || "")}" placeholder="Aisha Tan" required />
          </div>
          <div class="field">
            <label>Company</label>
            <input name="company" value="${escapeHTML(user?.company || "")}" placeholder="GreenGrid Analytics" required />
          </div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>Company email</label>
            <input name="email" type="email" value="${escapeHTML(user?.email || "")}" placeholder="you@company.com" required />
          </div>
          <div class="field">
            <label>Role</label>
            <input name="role" placeholder="Founder / Partnership Lead" required />
          </div>
        </div>
        <div class="field">
          <label data-tooltip="Explain how your company addresses the must-haves and what value you bring. Press Tab for a writing starter.">
            Proposal / pitch text
            <span class="tab-hint">Tab for suggestion</span>
          </label>
          <textarea
            name="proposalText"
            data-suggest="proposalText"
            placeholder="Describe how your company addresses the must-haves, relevant track record, and the value you bring to this partnership…"
            required
          ></textarea>
        </div>

        <div class="field">
          <label data-tooltip="PDF, DOC, DOCX, TXT, PPTX up to 10 MB. Drag &amp; drop supported.">
            CV / proposal / pitch deck
          </label>
          <label class="single-file-picker" data-dropzone="document" data-tooltip="Drag your pitch deck or CV here, or click to browse">
            <input name="document" type="file" accept=".pdf,.doc,.docx,.txt,.pptx" />
            <span class="file-icon">PDF</span>
            <span class="file-info">
              <b data-upload-status="document">No file selected yet</b>
              <small>Attach one document. If it is the wrong file, press Change file.</small>
            </span>
            <span class="file-change-btn">Choose file</span>
          </label>
        </div>

        <div class="ai-scan-preview">
          <div>
            <b>AI document scan</b>
            <span>After upload, BridgeX extracts role signals, keyword hits, missing requirements, and interview follow-up topics from the CV/proposal.</span>
          </div>
          <ul>
            <li>Scans uploaded resume/CV or proposal text when available.</li>
            <li>Matches document evidence against company must-haves.</li>
            <li>Builds interview questions from missing proof.</li>
          </ul>
        </div>

        <div class="field">
          <label data-tooltip="Optional. Enter a referral code if a BridgeX partner referred you.">
            Referral code <small>Optional</small>
          </label>
          <input name="referralCode" placeholder="e.g. BXR-MAYA2026" />
        </div>

        <button class="primary" type="submit">Submit Pitch</button>
      </form>

      <section class="panel">
        <h2>Available Opportunities</h2>
        <p class="hint" style="margin-bottom:12px">Click any posting to pre-fill the posting field.</p>
        <div class="list">
          ${opportunities
            .map(
              (opp) => html`
                <article class="card opportunity-preview-card" data-opp-id="${opp.id}" style="cursor:pointer">
                  <h3>${escapeHTML(opp.title)}</h3>
                  <p>${escapeHTML(truncate(opp.description, 180))}</p>
                  <div class="post-tags" style="margin-top:8px">
                    ${(opp.mustHaves || "").split(",").slice(0, 3).map((t) => `<span>${escapeHTML(t.trim())}</span>`).join("")}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}
