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
  const verificationCode = data.verificationCode?.trim() || "";
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
    },
    {
      label: "Email verification code is entered",
      passed: /^\d{6}$/.test(verificationCode)
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
  const sampleName = isRecruiter ? "Maya Lee" : "Aisha Tan";
  const sampleCompany = isRecruiter ? "Northstar Ventures" : "GreenGrid Analytics";
  const sampleEmail = isRecruiter ? "maya@northstar.co" : "aisha@greengrid.ai";
  const sampleHr = isRecruiter ? "hr@northstar.co" : "hr@greengrid.ai";
  const sampleRole = isRecruiter ? "Partnership Manager" : "Founder";
  const sampleCode = isRecruiter ? "BRX-NSV-2026" : "BRX-GGA-2026";
  const sampleLinkedIn = isRecruiter ? "https://www.linkedin.com/company/northstar-ventures" : "https://www.linkedin.com/company/greengrid-analytics";
  const portalTitle = isRecruiter ? "Company Portal" : "Candidate Portal";
  const portalSubtitle = isRecruiter ? "Verify your organization to post partnership opportunities" : "Verify your company to pitch for partnership opportunities";
  return html`
    <section class="portal-page">
      <button class="back-link" data-action="go-home">‹ Back to home</button>
      <form class="portal-card" id="entry-access-form">
        <div class="portal-title">
          <div class="portal-icon">${isRecruiter ? "▦" : "◈"}</div>
          <div>
            <h1>${portalTitle}</h1>
            <p>${portalSubtitle}</p>
          </div>
        </div>
        <input class="step-radio" type="radio" id="portal-step-1" name="portalStep" checked />
        <input class="step-radio" type="radio" id="portal-step-2" name="portalStep" />
        <input class="step-radio" type="radio" id="portal-step-3" name="portalStep" />
        <input class="step-radio" type="radio" id="portal-step-4" name="portalStep" />
        <div class="stepper">
          <label class="step step-1" for="portal-step-1"><b>1</b><span>Your Details</span></label>
          <i></i>
          <label class="step step-2" for="portal-step-2"><b>2</b><span>Auth Letter</span></label>
          <i></i>
          <label class="step step-3" for="portal-step-3"><b>3</b><span>Email Verify</span></label>
          <i></i>
          <label class="step step-4" for="portal-step-4"><b>4</b><span>Approved</span></label>
        </div>

        <div class="portal-fields">
          <section class="portal-step-panel step-panel-1">
            <div class="grid cols-2">
              <div class="field">
                <label>Your Full Name</label>
                <input name="name" value="${sampleName}" required />
              </div>
              <div class="field">
                <label>Company Name</label>
                <input name="company" value="${sampleCompany}" required />
              </div>
            </div>
            <div class="field">
              <label>Your Company Email</label>
              <input name="email" type="email" value="${sampleEmail}" required />
              <span class="hint">Must match the email domain on your authorization letter.</span>
            </div>
            <div class="field">
              <label>HR Representative Email</label>
              <input name="hrEmail" type="email" value="${sampleHr}" required />
              <span class="hint">The letter must reference this email. Verification codes go to both addresses.</span>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>Your Role</label>
                <input name="roleTitle" value="${sampleRole}" required />
              </div>
              <div class="field">
                <label>Business Registration Code</label>
                <input name="businessCode" value="${sampleCode}" required />
              </div>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>LinkedIn Company/Profile Link</label>
                <input name="linkedIn" type="url" value="${sampleLinkedIn}" required />
              </div>
              <div class="field">
                <label>Password</label>
                <input name="password" type="password" value="bridgexdemo" required />
              </div>
            </div>
            <label class="portal-submit step-next" for="portal-step-2">Continue <span>›</span></label>
          </section>

          <section class="portal-step-panel step-panel-2">
            <div class="auth-requirements">
              <h2>Authorization letter requirements</h2>
              <div class="requirement-list">
                <span>Your full name — "${sampleName}"</span>
                <span>Your company email — "${sampleEmail}"</span>
                <span>HR representative email — "${sampleHr}"</span>
                <span>Written on official company letterhead</span>
                <span>Signed by an authorized company signatory</span>
                <span>States that you are authorized to ${isRecruiter ? "seek partners and post opportunities" : "pitch partnerships"} on behalf of the company</span>
              </div>
            </div>
            <label class="upload-zone">
              <input name="letter" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
              <b>⇧</b>
              <strong>Upload authorization letter</strong>
              <span>PDF, DOC, PNG, or JPG • max 10 MB</span>
            </label>
            <div class="field">
              <label>Authorization Contact</label>
              <input name="authorizedBy" value="${isRecruiter ? "Northstar HR Admin" : "GreenGrid HR Admin"}" required />
            </div>
            <label class="check-row">
              <input name="signed" type="checkbox" required checked />
              <span>I confirm the letter is approved by the company and signed or stamped.</span>
            </label>
            <div class="letter-warning">
              Your letter will be reviewed by our team within 24 hours. You will receive a verification code only after the document is approved.
            </div>
            <div class="portal-actions">
              <label class="ghost step-button" for="portal-step-1">Back</label>
              <label class="portal-submit step-button" for="portal-step-3">Submit Letter</label>
            </div>
          </section>

          <section class="portal-step-panel step-panel-3">
            <div class="success-note">
              Letter approved. Verification codes sent to <b>${sampleEmail}</b> and <b>${sampleHr}</b>.
            </div>
            <div class="field">
              <label>Verification Code</label>
              <input name="verificationCode" inputmode="numeric" pattern="[0-9]{6}" value="123456" required />
              <span class="hint">Both the applicant and HR must confirm. Enter either code to proceed.</span>
            </div>
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
            <div class="portal-actions">
              <label class="ghost step-button" for="portal-step-2">Back</label>
              <label class="portal-submit step-button" for="portal-step-4">Verify & Enter</label>
            </div>
          </section>

          <section class="portal-step-panel step-panel-4">
            <div class="approved-state">
              <b>✓</b>
              <h2>Verified! Taking you in...</h2>
              <p>Final access is created only after the review email is approved, keeping the network locked from unverified accounts.</p>
            </div>
          </section>
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
