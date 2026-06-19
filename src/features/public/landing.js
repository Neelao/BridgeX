import { html } from "../../shared/utils.js";

export function renderLanding() {
  return html`
    <section class="figma-hero">
      <div class="hero-inner">
        <span class="hero-pill">AI-Powered Partnership Matching</span>
        <h1>Find partners who <span>actually fit.</span></h1>
        <p>
          BridgeX verifies companies, screens partnership proposals, and helps teams move from trusted discovery to real meetings.
        </p>
        <div class="hero-actions">
          <button class="hero-primary" data-action="enter-recruiter">
            <span>Post an Opportunity</span>
            <b>→</b>
          </button>
          <button class="hero-secondary" data-action="enter-candidate">
            <span>Browse Opportunities</span>
            <b>→</b>
          </button>
        </div>
      </div>
    </section>
  `;
}
