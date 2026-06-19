import { escapeHTML, html } from "../../shared/utils.js";

export function renderAuth(state, activeUserId) {
  const user = state.users.find((item) => item.id === activeUserId) || state.users[0];
  return html`
    <section class="panel">
      <h2>Account Access</h2>
      <p>Switch roles for the demo. Companies post needs and rank partners. Pitchers apply, upload documents, and complete a guided pitch session.</p>
      <div class="role-row">
        ${state.users
          .map(
            (item) => html`
              <button class="role-btn ${item.id === user.id ? "active" : ""}" data-action="switch-user" data-user="${item.id}">
                ${item.role === "recruiter" ? "R" : "C"} ${escapeHTML(item.name)}
              </button>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="grid cols-2">
      <form class="panel form" id="company-verification-form">
        <h2>Company Verification</h2>
        <div class="field">
          <label>Company email</label>
          <input name="companyEmail" value="${escapeHTML(user.email)}" />
        </div>
        <div class="field">
          <label>HR/admin email</label>
          <input name="hrEmail" placeholder="hr@company.com" />
        </div>
        <div class="field">
          <label>Official authorization letter</label>
          <input name="letter" type="file" accept=".pdf,.doc,.docx,.txt" />
        </div>
        <button class="primary" type="submit">Run Verification Check</button>
      </form>

      <div class="panel">
        <h2>Verification Rules</h2>
        <div class="list">
          <div class="row"><span>Company email and HR domain should match</span><span class="badge good">Required</span></div>
          <div class="row"><span>Letter must name pitcher, company, and HR/admin</span><span class="badge good">Required</span></div>
          <div class="row"><span>Signed letter or company stamp</span><span class="badge warn">Manual review</span></div>
          <div class="row"><span>Verified companies unlock document access</span><span class="badge good">Secure</span></div>
        </div>
      </div>
    </section>
  `;
}
