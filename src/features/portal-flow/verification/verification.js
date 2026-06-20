import { escapeHTML, html } from "../../../shared/utils.js";

function emailDomain(email = "") {
  return email.toLowerCase().split("@")[1] || "";
}

function baseVerificationData(data) {
  const companyDomain = emailDomain(data.email);
  const hrDomain = emailDomain(data.hrEmail);
  const letterName = data.letter?.name || "";
  const letterSize = Number(data.letter?.size || 0);
  const supportName = data.supportDocument?.name || "";
  const supportSize = Number(data.supportDocument?.size || 0);
  const registration = data.businessCode?.trim() || "";
  const linkedIn = data.linkedIn?.trim() || "";
  const validLetterType = /\.(pdf|doc|docx|png|jpe?g|txt)$/i.test(letterName);
  const validSupportType = !supportName || /\.(pdf|doc|docx|png|jpe?g|txt)$/i.test(supportName);
  const lowerEvidence = letterName.toLowerCase();

  return {
    companyDomain,
    hrDomain,
    letterName,
    letterSize,
    supportName,
    supportSize,
    registration,
    linkedIn,
    validLetterType,
    validSupportType,
    lowerEvidence
  };
}

function scoreChecks(checks) {
  return Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
}

export function reviewAuthorizationLetter(data) {
  const publicDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const { companyDomain, hrDomain, letterName, letterSize, supportName, supportSize, registration, linkedIn, validLetterType, validSupportType } = baseVerificationData(data);
  const checks = [
    {
      label: "Company email uses a business domain",
      passed: Boolean(companyDomain) && !publicDomains.includes(companyDomain)
    },
    {
      label: "Approver email matches company domain",
      passed: Boolean(companyDomain) && companyDomain === hrDomain
    },
    {
      label: "Business registration code format is valid",
      passed: /^[a-z0-9-]{6,}$/i.test(registration)
    },
    {
      label: "LinkedIn trust signal is valid when connected",
      passed: !linkedIn || /^https:\/\/(www\.)?linkedin\.com\/(company|in)\//i.test(linkedIn)
    },
    {
      label: "Authorization letter is uploaded",
      passed: Boolean(letterName) && data.letterPurpose === "authorization_letter"
    },
    {
      label: "Document 1 file type can be reviewed",
      passed: Boolean(letterName) && validLetterType
    },
    {
      label: "Document 1 is under 10 MB",
      passed: Boolean(letterName) && letterSize > 0 && letterSize <= 10 * 1024 * 1024
    },
    {
      label: "Optional supporting company evidence is recorded when provided",
      passed: true
    },
    {
      label: "Supporting document can be reviewed",
      passed: validSupportType && supportSize <= 10 * 1024 * 1024
    },
    {
      label: "Signed or stamped confirmation is checked",
      passed: Boolean(data.signed)
    }
  ];
  const score = scoreChecks(checks);
  return {
    score,
    status: checks.every((check) => check.passed) ? "document_verified" : "document_blocked",
    checks,
    letterName,
    letterSize,
    supportName,
    supportSize,
    letterPurpose: data.letterPurpose,
    supportPurpose: data.supportPurpose,
    registration,
    linkedIn,
    hrEmail: data.hrEmail
  };
}

export function verifyAccess(data, reviewedDocument = null) {
  const documentReview = reviewedDocument?.status === "document_verified" ? reviewedDocument : reviewAuthorizationLetter(data);
  const verificationCode = data.verificationCode?.trim() || "";
  const checks = [
    ...documentReview.checks,
    {
      label: "Authorization contact is provided",
      passed: Boolean(data.authorizedBy?.trim())
    },
    {
      label: "Email verification code is correct",
      passed: verificationCode === "123456"
    }
  ];
  const score = scoreChecks(checks);
  return {
    score,
    status: checks.every((check) => check.passed) ? "verified" : "blocked",
    checks,
    letterName: documentReview.letterName,
    letterSize: documentReview.letterSize,
    supportName: documentReview.supportName,
    supportSize: documentReview.supportSize,
    letterPurpose: documentReview.letterPurpose,
    supportPurpose: documentReview.supportPurpose,
    registration: documentReview.registration,
    linkedIn: documentReview.linkedIn,
    hrEmail: documentReview.hrEmail
  };
}

function helperStep(verificationResult) {
  if (!verificationResult) return "details";
  if (verificationResult.status === "document_blocked") return "document_blocked";
  if (verificationResult.status === "document_verified") return "email";
  if (verificationResult.status === "blocked") return "final_blocked";
  if (verificationResult.status === "verified") return "verified";
  return "details";
}

function stepAdvice(step) {
  const advice = {
    details: "Start by checking that the company email and approver email use the same business domain. I can also help you phrase the authorization letter.",
    document_blocked: "The document review found missing evidence. Ask me what failed, then check Document 1 is marked as an authorization letter and add one supporting company proof.",
    email: "Your document passed. Type verification code 123456, representing the code sent to the requester and company approver.",
    final_blocked: "The final verification failed. Ask me to explain the failed checks and I will suggest the fastest fix.",
    verified: "Everything passed. BridgeX is ready to bring you into the dashboard."
  };
  return advice[step] || advice.details;
}

export function buildAiHelperReply(question = "", context = {}) {
  const text = question.toLowerCase();
  const result = context.verificationResult;
  const failed = result?.checks?.filter((check) => !check.passed) || [];
  const failedText = failed.length
    ? `Right now, fix: ${failed.map((check) => check.label).join(", ")}.`
    : "Right now, all checks I can see are passing.";

  if (text.includes("letter") || text.includes("document") || text.includes("upload")) {
    return "Upload Document 1 as the authorization letter, then choose one supporting proof such as business registration, company profile, HR confirmation, or letterhead. PDF, DOC, TXT, PNG, and JPG files under 10 MB are accepted.";
  }
  if (text.includes("hr") || text.includes("email")) {
    return "The approver email must match the company email domain. For candidates, this should be HR confirming the person really works there. For recruiters, this can be a company admin or authorized contact.";
  }
  if (text.includes("code") || text.includes("otp")) {
    return "The verification code for this prototype is 123456. Type it manually after the AI document review passes. In a real backend this would be emailed to the requester and the company approver.";
  }
  if (text.includes("fail") || text.includes("fix") || text.includes("wrong") || text.includes("why")) {
    return `${failedText} The fastest fix is to use matching company and approver domains, upload Document 1 as an authorization letter, choose a supporting evidence type if you have one, and leave the signed confirmation checked. LinkedIn is optional.`;
  }
  if (text.includes("linkedin")) {
    return "LinkedIn is optional here. If you connect it, use a company page or representative profile such as https://www.linkedin.com/company/northstar-ventures. It improves confidence, but it will not block the demo.";
  }
  if (text.includes("dashboard") || text.includes("after")) {
    return "After the document review and email code both pass, I show the verified transfer screen and automatically bring the user to the dashboard.";
  }
  if (text.includes("sample") || text.includes("demo")) {
    return "For the quickest prototype run, enter matching company and approver emails, upload any accepted file as Document 1, choose Authorization letter, and type code 123456. LinkedIn and supporting proof are optional.";
  }
  return `${stepAdvice(context.step)} ${failedText}`;
}

function renderAiHelper(entryRole, verificationResult, aiMessages = []) {
  const step = helperStep(verificationResult);
  const isRecruiter = entryRole === "recruiter";
  const starterMessages = aiMessages.length
    ? aiMessages
    : [
        {
          role: "assistant",
          text: `Hi, I’m the BridgeX AI helper. I’ll guide this ${isRecruiter ? "company" : "pitcher"} verification step by step. ${stepAdvice(step)}`
        }
      ];

  return html`
    <aside class="ai-helper-panel">
      <div class="ai-helper-head">
        <div class="ai-orb">AI</div>
        <div>
          <h2>Verification helper</h2>
          <p>Ask me what to upload, why a check failed, or what happens next.</p>
        </div>
      </div>
      <div class="ai-helper-status">
        <span>Current step</span>
        <b>${step === "details" ? "Company details" : step === "document_blocked" ? "Fix document evidence" : step === "email" ? (isRecruiter ? "Admin email code" : "HR approval code") : step === "verified" ? "Verified" : "Final checks"}</b>
      </div>
      ${
        verificationResult?.checks?.length
          ? html`
              <div class="ai-helper-audit">
                <h3>${verificationResult.status === "document_blocked" || verificationResult.status === "blocked" ? "What needs fixing" : "Verification audit"}</h3>
                ${verificationResult.checks
                  .map(
                    (check) => html`
                      <div class="${check.passed ? "ok" : "fail"}">
                        <b>${check.passed ? "✓" : "!"}</b>
                        <span>${escapeHTML(check.label)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          : ""
      }
      <div class="ai-helper-chat" aria-live="polite">
        ${starterMessages
          .map(
            (message) => html`
              <div class="ai-message ${message.role === "user" ? "user" : "assistant"}">
                <span>${message.role === "user" ? "You" : "AI helper"}</span>
                <p>${escapeHTML(message.text)}</p>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="ai-helper-prompts">
        <button type="button" data-action="ask-ai-prompt" data-question="What should my authorization letter include?">Letter help</button>
        <button type="button" data-action="ask-ai-prompt" data-question="Why did verification fail?">Fix failed checks</button>
        <button type="button" data-action="ask-ai-prompt" data-question="What happens after I enter the code?">Next step</button>
      </div>
      <form class="ai-helper-form" id="ai-helper-form">
        <input name="question" placeholder="Ask the AI helper..." autocomplete="off" />
        <button type="submit">Ask</button>
      </form>
    </aside>
  `;
}

export function renderAccessPage(entryRole, verificationResult, aiMessages = [], draft = {}) {
  const isRecruiter = entryRole === "recruiter";
  const isEstablishedCompany = isRecruiter && draft.orgType === "company";
  const placeholderName = isRecruiter ? "Maya Lee" : "Aisha Tan";
  const placeholderCompany = isRecruiter ? "Northstar Ventures" : "GreenGrid Analytics";
  const placeholderEmail = isRecruiter ? "maya@northstar.co" : "aisha@greengrid.ai";
  const placeholderHr = isRecruiter ? "admin@northstar.co" : "hr@greengrid.ai";
  const placeholderCode = isRecruiter ? "BRX-NSV-2026" : "BRX-GGA-2026";
  const approverLabel = isRecruiter ? "Company Admin Email" : "HR Representative Email";
  const approverHint = isRecruiter
    ? "A company admin or authorized contact receives the code after the document check."
    : "HR receives the code to confirm this pitcher is actually inside the company.";
  const codeSentMessage = "AI helper verified the uploaded evidence and sent an HR approval code";
  const codeRecipientHint = "Enter the code received by either the candidate or HR representative.";
  const linkedInValue = draft.linkedIn || verificationResult?.linkedIn || "";
  const portalTitle = isRecruiter ? "Company Portal" : "Candidate Portal";
  const portalSubtitle = isRecruiter ? "Verify your organization to post partnership opportunities" : "Verify your company to pitch for partnership opportunities";
  const documentChecked = ["document_verified", "blocked", "verified"].includes(verificationResult?.status);
  const activeStep = verificationResult?.status === "document_blocked" ? "2" : verificationResult ? (isRecruiter ? "4" : "3") : "1";
  return html`
    <section class="portal-page">
      <button class="back-link" data-action="go-home">‹ Back to home</button>
      <div class="portal-layout">
        <form class="portal-card" id="entry-access-form">
          <div class="portal-title">
            <div class="portal-icon">${isRecruiter ? "▦" : "◈"}</div>
            <div>
              <h1>${portalTitle}</h1>
              <p>${portalSubtitle}</p>
            </div>
          </div>
          <input class="step-radio" type="radio" id="portal-step-1" name="portalStep" ${activeStep === "1" ? "checked" : ""} />
        <input class="step-radio" type="radio" id="portal-step-2" name="portalStep" ${activeStep === "2" ? "checked" : ""} />
        <input class="step-radio" type="radio" id="portal-step-3" name="portalStep" ${activeStep === "3" ? "checked" : ""} />
        <input class="step-radio" type="radio" id="portal-step-4" name="portalStep" />
        <input type="hidden" name="orgType" value="${escapeHTML(draft.orgType || "")}" />
        <input type="hidden" name="preference" value="${escapeHTML(draft.preference || "")}" />
        ${
          isRecruiter
            ? html`
                <div class="stepper recruiter-stepper">
                  <div class="step step-1"><b>1</b><span>Your Details</span></div>
                  <i></i>
                  <div class="step step-2"><b>2</b><span>AI Doc Check</span></div>
                  <i></i>
                  <div class="step step-4"><b>3</b><span>Dashboard</span></div>
                </div>
              `
            : html`
                <div class="stepper">
                  <div class="step step-1"><b>1</b><span>Your Details</span></div>
                  <i></i>
                  <div class="step step-2"><b>2</b><span>AI Doc Check</span></div>
                  <i></i>
                  <div class="step step-3"><b>3</b><span>HR Approval Code</span></div>
                  <i></i>
                  <div class="step step-4"><b>4</b><span>Dashboard</span></div>
                </div>
              `
        }

        <div class="portal-fields">
          <section class="portal-step-panel step-panel-1">
            <div class="portal-section profile-section">
              <div class="portal-section-head">
                <i>01</i>
                <div>
                  <b>${isEstablishedCompany ? "Company details" : "Profile details"}</b>
                  <span>${isEstablishedCompany ? "Tell BridgeX which organization is requesting access." : "Tell BridgeX who is requesting access."}</span>
                </div>
              </div>
              ${
                isEstablishedCompany
                  ? html`
                      <div class="field">
                        <label>Company Name</label>
                        <input name="company" value="${escapeHTML(draft.company || "")}" placeholder="${placeholderCompany}" required />
                      </div>
                    `
                  : html`
                      <div class="grid cols-2">
                        <div class="field">
                          <label>Your Full Name</label>
                          <input name="name" value="${escapeHTML(draft.name || "")}" placeholder="${placeholderName}" required />
                        </div>
                        <div class="field">
                          <label>Company Name</label>
                          <input name="company" value="${escapeHTML(draft.company || "")}" placeholder="${placeholderCompany}" required />
                        </div>
                      </div>
                    `
              }
            </div>

            <div class="portal-section company-section">
              <div class="portal-section-head">
                <i>02</i>
                <div>
                  <b>Company verification</b>
                  <span>These fields are checked against the uploaded authorization document.</span>
                </div>
              </div>
              <div class="field">
                <label>Your Company Email</label>
                <input name="email" type="email" value="${escapeHTML(draft.email || "")}" placeholder="${placeholderEmail}" required />
                <span class="hint">Must match the email domain on your authorization letter.</span>
              </div>
              <div class="field">
                <label>${approverLabel}</label>
                <input name="hrEmail" type="email" value="${escapeHTML(draft.hrEmail || "")}" placeholder="${placeholderHr}" required />
                <span class="hint">${approverHint}</span>
              </div>
              <div class="grid cols-2">
                <div class="field">
                  <label>Your Role</label>
                  <select name="roleTitle" required>
                    <option value="">Select your role</option>
                    <option value="Founder" ${draft.roleTitle === "Founder" ? "selected" : ""}>Founder</option>
                    <option value="CEO" ${draft.roleTitle === "CEO" ? "selected" : ""}>CEO</option>
                    <option value="Partnership Manager" ${draft.roleTitle === "Partnership Manager" ? "selected" : ""}>Partnership Manager</option>
                    <option value="HR Representative" ${draft.roleTitle === "HR Representative" ? "selected" : ""}>HR Representative</option>
                    <option value="Business Development Lead" ${draft.roleTitle === "Business Development Lead" ? "selected" : ""}>Business Development Lead</option>
                  </select>
                </div>
                <div class="field">
                  <label>Business Registration Code</label>
                  <input name="businessCode" value="${escapeHTML(draft.businessCode || "")}" placeholder="${placeholderCode}" required />
                </div>
              </div>
            </div>

            <div class="account-access-box">
              <div>
                <b>Create account access</b>
                <span>This password is used when you return to BridgeX after verification.</span>
              </div>
              <div class="field">
                <label data-tooltip="Min 8 characters. You'll use this to sign in after verification.">Password</label>
                <input name="password" type="password" value="${escapeHTML(draft.password || "")}" placeholder="Create a password" autocomplete="new-password" required />
              </div>
              <div class="field">
                <label data-tooltip="Optional. Enter a referral code if someone invited you to BridgeX.">Referral code <small>Optional</small></label>
                <input name="referralCode" value="${escapeHTML(draft.referralCode || "")}" placeholder="e.g. BXR-MAYA2026" />
              </div>
            </div>

            <div class="portal-section trust-section">
              <div class="portal-section-head">
                <i>03</i>
                <div>
                  <b>Optional trust signal</b>
                  <span>Connect LinkedIn after creating the password, or skip it for the demo.</span>
                </div>
              </div>
              <div class="field linkedin-field">
                <label>LinkedIn Verification <small>Optional</small></label>
                <input class="linkedin-hidden-input" name="linkedIn" value="${escapeHTML(linkedInValue)}" readonly />
                <button class="linkedin-connect-button" type="button" data-action="open-linkedin-connect">
                  ${linkedInValue ? "LinkedIn connected" : "Connect LinkedIn"}
                </button>
                <span class="hint linkedin-status" data-linkedin-status>
                  ${linkedInValue ? `Connected: ${escapeHTML(linkedInValue)}` : "Skip this for now, or connect a company page/profile for stronger verification."}
                </span>
              </div>
            </div>
            <button class="portal-submit step-next" type="button" data-action="continue-details">Continue <span>›</span></button>
          </section>

          <section class="portal-step-panel step-panel-2">
            <div class="auth-requirements">
              <h2>AI helper will check your evidence packet</h2>
              <div class="requirement-list">
                <span>Your full name and company name</span>
                <span>Your company email and ${isRecruiter ? "company admin email" : "HR representative email"}</span>
                <span>Your business registration code or supporting company record</span>
                <span>Written on official company letterhead</span>
                <span>Signed by an authorized company signatory</span>
                <span>States that you are authorized to ${isRecruiter ? "seek partners and post opportunities" : "pitch partnerships"} on behalf of the company</span>
              </div>
            </div>
            <div class="document-stack">
              <div class="document-upload-card">
                <div class="document-upload-head">
                  <b>Document 1</b>
                  <span>Required</span>
                </div>
                <div class="field">
                  <label>What is this document for?</label>
                  <select name="letterPurpose" required>
                    <option value="">Choose document type</option>
                    <option value="authorization_letter" ${draft.letterPurpose === "authorization_letter" ? "selected" : ""}>Authorization letter</option>
                    <option value="hr_confirmation" ${draft.letterPurpose === "hr_confirmation" ? "selected" : ""}>${isRecruiter ? "Admin confirmation letter" : "HR confirmation letter"}</option>
                    <option value="company_letterhead" ${draft.letterPurpose === "company_letterhead" ? "selected" : ""}>Official company letterhead</option>
                  </select>
                </div>
                <label class="upload-zone compact-upload" data-dropzone="letter" data-tooltip="Drag a file here or click to browse">
                  <input name="letter" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                  <b>⇧</b>
                  <strong>Upload document 1</strong>
                  <span>PDF, DOC, TXT, PNG, or JPG • max 10 MB</span>
                  <span class="drop-hint">or drag &amp; drop from your file explorer</span>
                  <em class="${verificationResult?.letterName ? "has-file" : ""}" data-upload-status="letter">
                    ${verificationResult?.letterName ? `Uploaded: ${escapeHTML(verificationResult.letterName)}` : "No file selected yet"}
                  </em>
                </label>
              </div>
              <details class="document-upload-card optional-document" ${verificationResult?.supportPurpose || draft.supportPurpose ? "open" : ""}>
                <summary>
                  <span>
                    <b>Other company verification</b>
                    <small>Optional, but helps the AI approve faster</small>
                  </span>
                  <i>Add proof</i>
                </summary>
                <div class="field">
                  <label>What is this supporting proof?</label>
                  <select name="supportPurpose">
                    <option value="">Choose supporting proof</option>
                    <option value="business_registration" ${draft.supportPurpose === "business_registration" ? "selected" : ""}>Business registration certificate</option>
                    <option value="company_profile" ${draft.supportPurpose === "company_profile" ? "selected" : ""}>Company profile / website proof</option>
                    <option value="hr_email_confirmation" ${draft.supportPurpose === "hr_email_confirmation" ? "selected" : ""}>${isRecruiter ? "Admin email confirmation" : "HR email confirmation"}</option>
                    <option value="signed_mou" ${draft.supportPurpose === "signed_mou" ? "selected" : ""}>Signed MOU / partnership proof</option>
                  </select>
                </div>
                <label class="upload-zone compact-upload support-upload" data-dropzone="supportDocument" data-tooltip="Drag a supporting file here or click to browse">
                  <input name="supportDocument" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                  <b>+</b>
                  <strong>Upload supporting document</strong>
                  <span>Business registration, ${isRecruiter ? "admin proof" : "HR proof"}, company profile, or signed record</span>
                  <span class="drop-hint">or drag &amp; drop from your file explorer</span>
                  <em class="${verificationResult?.supportName ? "has-file" : ""}" data-upload-status="supportDocument">
                    ${verificationResult?.supportName ? `Uploaded: ${escapeHTML(verificationResult.supportName)}` : "No supporting file selected"}
                  </em>
                </label>
              </details>
            </div>
            <div class="field">
              <label>Authorization Contact</label>
              <input name="authorizedBy" value="${escapeHTML(draft.authorizedBy || "")}" placeholder="${isRecruiter ? "Name of company admin approver" : "Name of HR approver"}" required />
            </div>
            <label class="check-row">
              <input name="signed" type="checkbox" required checked />
              <span>I confirm the letter is approved by the company and signed or stamped.</span>
            </label>
            <div class="letter-warning">
              The AI helper scans Document 1 and your supporting proof first. If the evidence packet passes, ${isRecruiter ? "the dashboard unlocks." : "the HR approval code step unlocks."}
            </div>
            ${
              verificationResult?.status === "document_blocked" || verificationResult?.status === "document_verified"
                ? html`
                    <div class="document-review-summary ${verificationResult.status === "document_verified" ? "verified" : "blocked"}">
                      <b>${verificationResult.status === "document_verified" ? "AI document check passed" : "AI document check failed"}</b>
                      <span>${verificationResult.score}/100 evidence confidence. ${verificationResult.status === "document_verified" ? (isRecruiter ? "The dashboard is now unlocked." : "The HR approval code step is now unlocked.") : "Check the AI helper for what needs fixing."}</span>
                    </div>
                  `
                : ""
            }
            <div class="portal-actions">
              <label class="ghost step-button" for="portal-step-1">Back</label>
              <button class="portal-submit step-button" type="button" data-action="run-document-review">Run AI document check</button>
            </div>
          </section>

          <section class="portal-step-panel step-panel-3">
            ${
              documentChecked
                ? html`
                    <div class="success-note">
                      ${codeSentMessage} <b>123456</b> to <b>${escapeHTML(verificationResult.hrEmail || draft.hrEmail || placeholderHr)}</b> and <b>${escapeHTML(draft.email || placeholderEmail)}</b>.
                    </div>
                    <div class="field">
                      <label>Verification Code</label>
                      <input name="verificationCode" inputmode="numeric" pattern="[0-9]{6}" value="" placeholder="Enter 6-digit code" required />
                      <span class="hint">${codeRecipientHint}</span>
                    </div>
                    ${
                      verificationResult?.status === "blocked"
                        ? html`
                            <div class="verification-result blocked">
                              <b>Final verification failed</b>
                              <span>${verificationResult.score}/100 trust readiness. Check the AI helper for the failed items.</span>
                            </div>
                          `
                        : ""
                    }
                    <div class="portal-actions">
                      <label class="ghost step-button" for="portal-step-2">Back</label>
                      <button class="portal-submit step-button" type="submit">Verify & Enter</button>
                    </div>
                  `
                : html`
                    <div class="verification-result blocked">
                      <b>Document check required first</b>
                      <span>Upload Document 1, choose what it is for, and run the AI document check before ${isRecruiter ? "admin email verification" : "HR approval"} unlocks.</span>
                      <div class="portal-actions">
                        <label class="ghost step-button" for="portal-step-2">Back to upload</label>
                      </div>
                    </div>
                  `
            }
          </section>

          <section class="portal-step-panel step-panel-4">
            <div class="approved-state">
              <b>✓</b>
              <h2>Verified! Bringing you to the dashboard...</h2>
              <p>BridgeX verified your evidence packet, company email, ${isRecruiter ? "admin email" : "HR approval"}, optional trust signals, and email code.</p>
            </div>
          </section>
        </div>
        </form>
        ${renderAiHelper(entryRole, verificationResult, aiMessages)}
      </div>
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
                : `A review update will be sent to ${escapeHTML(user.email)} after BridgeX checks the company email, HR/admin email, business registration code, optional trust signals, and signed letter.`
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
