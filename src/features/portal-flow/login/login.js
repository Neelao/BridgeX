import { escapeHTML, html } from "../../../shared/utils.js";

export function renderLogin(errorMsg) {
  return html`
    <div class="portal-page">
      <button class="back-link" data-action="go-home">← Back to home</button>

      <div class="login-layout">
        <div class="login-card">
          <div class="portal-title">
            <div class="portal-icon">BX</div>
            <div>
              <h1>Sign in to BridgeX</h1>
              <p>Access your verified company or candidate workspace.</p>
            </div>
          </div>

          <form id="login-form" class="portal-fields">
            <div class="field">
              <label>Email address</label>
              <input name="email" type="email" placeholder="you@company.com" autocomplete="email" required />
            </div>
            <div class="field">
              <label>Password</label>
              <input name="password" type="password" placeholder="Your password" autocomplete="current-password" required />
            </div>

            ${
              errorMsg
                ? `<div class="login-error">${escapeHTML(errorMsg)}</div>`
                : ""
            }

            <button class="portal-submit" type="submit">Sign In</button>
          </form>

          <div class="login-divider"><span>New to BridgeX?</span></div>

          <div class="login-signup-row">
            <button class="login-signup-btn" data-action="enter-candidate">
              <span class="login-signup-icon">C</span>
              <span>
                <b>Join as Candidate</b>
                <small>Pitch your company for partnership opportunities</small>
              </span>
            </button>
            <button class="login-signup-btn" data-action="enter-recruiter">
              <span class="login-signup-icon recruiter">R</span>
              <span>
                <b>Join as Company</b>
                <small>Post requirements and discover verified partners</small>
              </span>
            </button>
          </div>
        </div>

        <div class="login-info-panel">
          <h2>Verified partner discovery</h2>
          <p>BridgeX connects companies with verified partnership candidates through an AI-powered screening process.</p>
          <div class="login-info-steps">
            <div class="login-info-step">
              <div class="login-step-num">1</div>
              <div>
                <b>Register &amp; verify</b>
                <span>Submit company evidence for verification</span>
              </div>
            </div>
            <div class="login-info-step">
              <div class="login-step-num">2</div>
              <div>
                <b>Discover &amp; apply</b>
                <span>Browse the network and pitch your company</span>
              </div>
            </div>
            <div class="login-info-step">
              <div class="login-step-num">3</div>
              <div>
                <b>Interview &amp; meet</b>
                <span>AI interview followed by a direct meeting</span>
              </div>
            </div>
          </div>
          <div class="login-demo-note">
            <b>Demo accounts</b>
            <span>recruiter: <code>maya@northstar.co</code></span>
            <span>candidate: <code>aisha@greengrid.ai</code></span>
            <span>Use any password to log in to the demo.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
