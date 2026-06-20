import { ctx, currentUser, protectedRoute, isCandidate, getRoutes, getRouteLabel } from "./ctx.js";
import { html, escapeHTML } from "../shared/utils.js";
import { renderAuth } from "../features/portal-flow/auth/auth.js";
import { renderCandidateApply } from "../features/candidate-hub/candidates/candidates.js";
import { renderCandidateDashboard } from "../features/candidate-hub/dashboard_candidate/dashboard_candidate.js";
import { renderDashboard } from "../features/recruiter-hub/dashboard_rec/dashboard_rec.js";
import { renderDocuments } from "../features/recruiter-hub/documents/documents.js";
import { renderCompanyTypePicker, renderIntentPicker } from "../features/portal-flow/intent/intent.js";
import { renderNetworkFeed } from "../features/shared/feed/feed.js";
import { renderNetwork } from "../features/shared/network/referral.js";
import { partnershipAreas } from "../features/portal-flow/partnership/areas.js";
import { renderLanding } from "../features/portal-flow/public/landing.js";
import { renderRequirements } from "../features/recruiter-hub/requirements/requirements.js";
import { renderAnalytics } from "../features/recruiter-hub/analytics/analytics.js";
import { renderAccessPage, renderReviewPage } from "../features/portal-flow/verification/verification.js";
import { renderLogin } from "../features/portal-flow/login/login.js";

function renderMain() {
  const user = currentUser();
  if (protectedRoute(ctx.route) && !user.verified) {
    ctx.route = "access";
    return renderAccessPage(ctx.entryRole, ctx.verificationResult, ctx.aiHelperMessages, ctx.accessDraft);
  }
  if (ctx.route === "home") return renderLanding();
  if (ctx.route === "login") return renderLogin(ctx.loginError);
  if (ctx.route === "company-type") return renderCompanyTypePicker();
  if (ctx.route === "access") return renderAccessPage(ctx.entryRole, ctx.verificationResult, ctx.aiHelperMessages, ctx.accessDraft);
  if (ctx.route === "review") return renderReviewPage(user);
  if (ctx.route === "intent") return renderIntentPicker(ctx.entryRole, partnershipAreas);
  if (ctx.route === "feed") return renderNetworkFeed(ctx.state, user, partnershipAreas, ctx.expandedComments);
  if (ctx.route === "requirements") return renderRequirements(ctx.state);
  if (ctx.route === "analytics") return renderAnalytics(ctx.state, user);
  if (ctx.route === "apply") return renderCandidateApply(ctx.state, user);
  if (ctx.route === "documents") return renderDocuments(ctx.state, user);
  if (ctx.route === "auth") return renderAuth(ctx.state, ctx.activeUserId);
  if (ctx.route === "network") return renderNetwork(ctx.state, user);
  return isCandidate() ? renderCandidateDashboard(ctx.state, user) : renderDashboard(ctx.state, user, ctx.dashFilters);
}

function appShell() {
  const user = currentUser();
  const publicRoutes = ["home", "access", "intent", "company-type", "login"];
  if (publicRoutes.includes(ctx.route)) {
    return html`
      <main class="public-shell">
        <header class="public-nav">
          <div class="brand">
            <div class="mark">BX</div>
            <div>
              <strong>BridgeX</strong>
              <span>Company partnership network</span>
            </div>
          </div>
          <div class="actions">
            <button class="nav-link" data-action="enter-candidate">For Candidates</button>
            <button class="nav-link" data-action="go-login">Sign In</button>
            <button class="nav-cta" data-action="enter-recruiter">For Companies</button>
          </div>
        </header>
        ${renderMain()}
      </main>
      ${ctx.modal}
    `;
  }

  const routes = getRoutes();
  return html`
    <main class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">BX</div>
          <div>
            <strong>BridgeX</strong>
            <span>Company partnership network</span>
          </div>
        </div>
        <nav class="nav">
          ${routes.map(([id, label]) => html`
            <button class="${ctx.route === id ? "active" : ""}" data-route="${id}">${label}</button>
          `).join("")}
        </nav>
        <div class="user-panel">
          <strong>${escapeHTML(user.name || "New account")}</strong>
          ${user.email ? `<span class="hint user-email">${escapeHTML(user.email)}</span>` : ""}
          <span>${escapeHTML(user.company || "")}${user.company ? " · " : ""}${escapeHTML(isCandidate() ? "Candidate" : "Company")}</span>
          <span class="badge ${user.verified ? "good" : "warn"}">${user.verified ? "Verified" : "Pending"}</span>
          <button class="logout-btn" data-action="logout">Log out</button>
          <button class="ghost reset-link" data-action="reset-demo" data-tooltip="Clear all demo data and return to start">Reset demo</button>
        </div>
      </aside>
      <section class="content">
        <div class="topbar">
          <div>
            <h1>${getRouteLabel(ctx.route)}</h1>
            <p>${isCandidate() ? "Verified candidate workspace — pitch, track, and grow partnerships." : "Verified partner discovery from requirement to introduction to meeting."}</p>
          </div>
          <div class="actions">
            <span class="badge good">MVP ready</span>
            <span class="badge">Prototype data</span>
          </div>
        </div>
        ${renderMain()}
      </section>
    </main>
    ${ctx.modal}
  `;
}

export function render() {
  document.querySelector("#app").innerHTML = appShell();
}
