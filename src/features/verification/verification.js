import { escapeHTML, html } from "../../shared/utils.js";

function emailDomain(email = "") {
  return email.toLowerCase().split("@")[1] || "";
}

export function verifyAccess(data) {
  const publicDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const companyDomain = emailDomain(data.email);
  const hrDomain = emailDomain(data.hrEmail);
  const letterName = data.letter?.name || "";
  const registration = data.businessCode?.trim() || "";
  const linkedIn = data.linkedIn?.trim() || "";
  const checks = [
    {
      label: "Company email uses a business domain",
      passed: Boolean(companyDomain) && !publicDomains.includes(companyDomain)
    },
    {
      label: "HR/admin email matches company domain",
      passed: Boolean(companyDomain) && companyDomain === hrDomain
    },
    {
      label: "Authorization contact is provided",
      passed: Boolean(data.authorizedBy?.trim())
    },
    {
      label: "Business registration code is provided",
      passed: /^[a-z0-9-]{6,}$/i.test(registration)
    },
    {
      label: "LinkedIn company or representative profile is linked",
      passed: /^https:\/\/(www\.)?linkedin\.com\/(company|in)\//i.test(linkedIn)
    },
    {
      label: "Official authorization letter is uploaded",
      passed: Boolean(letterName)
    },
    {
      label: "Signed or stamped confirmation is checked",
      passed: Boolean(data.signed)
    }
  ];
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  return {
    score,
    status: checks.every((check) => check.passed) ? "pending_review" : "blocked",
    checks,
    letterName,
    registration,
    linkedIn
  };
}

export function renderAccessPage(entryRole, verificationResult) {
  const isRecruiter = entryRole === "recruiter";
  return html`
    <section class="portal-page">
      <button class="back-link" data-action="go-home">‹ Back to home</button>
      <form class="portal-card" id="entry-access-form">
        <div class="portal-title">
          <div class="portal-icon">${isRecruiter ? "▦" : "◈"}</div>
          <div>
            <h1>${isRecruiter ? "Company Portal" : "Candidate Portal"}</h1>
            <p>${isRecruiter ? "Verify your organization to post partnership opportunities" : "Verify your company to browse and pitch opportunities"}</p>
          </div>
        </div>
        <div class="stepper">
          <div class="step active"><b>1</b><span>Your Details</span></div>
          <i></i>
          <div class="step"><b>2</b><span>Auth Letter</span></div>
          <i></i>
          <div class="step"><b>3</b><span>Email Verify</span></div>
          <i></i>
          <div class="step"><b>4</b><span>Approved</span></div>
        </div>

        <div class="portal-fields">
          <div class="grid cols-2">
            <div class="field">
              <label>Your Full Name</label>
              <input name="name" value="${isRecruiter ? "Maya Lee" : "Aisha Tan"}" required />
            </div>
            <div class="field">
              <label>Company Name</label>
              <input name="company" value="${isRecruiter ? "Northstar Ventures" : "GreenGrid Analytics"}" required />
            </div>
          </div>
          <div class="field">
            <label>Your Company Email</label>
            <input name="email" type="email" value="${isRecruiter ? "maya@northstar.co" : "aisha@greengrid.ai"}" required />
            <span class="hint">Must match the email domain on your authorization letter.</span>
          </div>
          <div class="field">
            <label>HR Representative Email</label>
            <input name="hrEmail" type="email" value="${isRecruiter ? "hr@northstar.co" : "hr@greengrid.ai"}" required />
            <span class="hint">The letter must reference this email. Verification codes go to both addresses.</span>
          </div>
          <div class="grid cols-2">
            <div class="field">
              <label>Your Role</label>
              <input name="roleTitle" value="${isRecruiter ? "Partnership Manager" : "Founder"}" required />
            </div>
            <div class="field">
              <label>Business Registration Code</label>
              <input name="businessCode" value="${isRecruiter ? "BRX-NSV-2026" : "BRX-GGA-2026"}" required />
            </div>
          </div>
          <div class="grid cols-2">
            <div class="field">
              <label>LinkedIn Company/Profile Link</label>
              <input name="linkedIn" type="url" value="${isRecruiter ? "https://www.linkedin.com/company/northstar-ventures" : "https://www.linkedin.com/company/greengrid-analytics"}" required />
            </div>
            <div class="field">
              <label>Password</label>
              <input name="password" type="password" value="bridgexdemo" required />
            </div>
          </div>
          <div class="field">
            <label>Official Authorization Letter</label>
            <input name="letter" type="file" accept=".pdf,.doc,.docx,.txt" required />
            <span class="hint">Letter must include company name, business registration code, your name/email, HR/admin email, purpose of pitching or recruiting, and company signature/stamp.</span>
          </div>
          <div class="field">
            <label>Authorization Contact</label>
            <input name="authorizedBy" value="${isRecruiter ? "Northstar HR Admin" : "GreenGrid HR Admin"}" required />
          </div>
          <label class="check-row">
            <input name="signed" type="checkbox" required checked />
            <span>I confirm the letter is approved by the company and signed or stamped.</span>
          </label>
          ${
            verificationResult
              ? html`
                  <div class="verification-result ${verificationResult.status}">
                    <b>${verificationResult.status === "pending_review" ? "Submitted for review" : "Verification blocked"}</b>
                    <span>
                      ${verificationResult.score}/100 trust readiness.
                      ${verificationResult.status === "pending_review" ? "Network and dashboard remain locked until final approval." : "Fix the failed items before submitting again."}
                    </span>
                  </div>
                `
              : ""
          }
          <button class="portal-submit" type="submit">Continue <span>›</span></button>
        </div>
      </form>
    </section>
  `;
}

export function renderReviewPage(user) {
  const isRejected = user.verification?.status === "rejected";
  const isVerified = user.verification?.status === "verified";
  return html`
    <section class="review-page">
      <div class="review-card panel">
        <span class="eyebrow">${isRejected ? "Review rejected" : isVerified ? "Review approved" : "Review in progress"}</span>
        <h1>
          ${
            isRejected
              ? "Please sign in again and resubmit verification"
              : isVerified
                ? "Your company is verified"
                : "We sent the review status to your company email"
          }
        </h1>
        <p>
          ${
            isRejected
              ? `BridgeX could not verify ${escapeHTML(user.company)} from the submitted evidence. Sign in again, correct the details, and upload a new authorization letter.`
              : isVerified
                ? `${escapeHTML(user.company)} can now access the BridgeX network and dashboard.`
                : `A review update will be sent to ${escapeHTML(user.email)} after BridgeX checks the company email, HR/admin email, business registration code, LinkedIn proof, and signed letter.`
          }
        </p>

        <div class="email-preview">
          <b>Email notification</b>
          <span>To: ${escapeHTML(user.email || "company email")}</span>
          <span>Status: ${escapeHTML(user.verification?.status || "pending_review")}</span>
          <span>${isRejected ? "Action required: sign in again and resubmit." : isVerified ? "Approved: continue to BridgeX." : "Pending: wait for approval or rejection."}</span>
        </div>

        <div class="actions">
          ${
            isRejected
              ? `<button class="primary" data-action="resubmit-verification">Sign in again</button>`
              : isVerified
                ? `<button class="primary" data-action="continue-after-approval">Continue</button>`
                : html`
                    <button class="ghost" data-action="review-rejected">Preview rejected email</button>
                    <button class="primary" data-action="review-approved">Preview approved email</button>
                  `
          }
        </div>
      </div>
    </section>
  `;
}
