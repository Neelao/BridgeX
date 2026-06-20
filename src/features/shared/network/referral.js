import { escapeHTML, html } from "../../../shared/utils.js";

function reputationScore(user, state) {
  if (!user) return 0;
  let score = user.verified ? 40 : 0;
  const myOpps = state.opportunities.filter((o) => o.ownerId === user.id).length;
  score += Math.min(myOpps * 5, 20);
  const myOppIds = new Set(state.opportunities.filter((o) => o.ownerId === user.id).map((o) => o.id));
  const myAppIds = new Set(state.candidates.filter((c) => c.userId === user.id).map((c) => c.id));
  const interviews = state.applications.filter((a) =>
    (myOppIds.has(a.opportunityId) || myAppIds.has(a.candidateId)) && a.interview
  ).length;
  score += Math.min(interviews * 5, 20);
  const meetings = state.applications.filter((a) =>
    (myOppIds.has(a.opportunityId) || myAppIds.has(a.candidateId)) && a.meeting
  ).length;
  score += Math.min(meetings * 10, 15);
  if (user.linkedIn) score += 5;
  return Math.min(score, 100);
}

function reputationLabel(score) {
  if (score >= 80) return { label: "Top Partner", cls: "rep-top" };
  if (score >= 60) return { label: "Trusted", cls: "rep-trusted" };
  if (score >= 35) return { label: "Active", cls: "rep-active" };
  return { label: "New Member", cls: "rep-new" };
}

export function renderNetwork(state, user) {
  const allUsers = state.users || [];

  // Build referral chains from state.referrals (if present) or from referralCode on candidates
  const referrals = state.referrals || [];

  // Per-user reputation
  const userRep = allUsers.map((u) => {
    const score = reputationScore(u, state);
    const { label, cls } = reputationLabel(score);
    const myOppIds = new Set(state.opportunities.filter((o) => o.ownerId === u.id).map((o) => o.id));
    const myCandIds = new Set(state.candidates.filter((c) => c.userId === u.id).map((c) => c.id));
    const totalApps = state.applications.filter((a) => myOppIds.has(a.opportunityId) || myCandIds.has(a.candidateId)).length;
    const meetings = state.applications.filter((a) => (myOppIds.has(a.opportunityId) || myCandIds.has(a.candidateId)) && a.meeting).length;
    return { user: u, score, label, cls, totalApps, meetings };
  });

  const myCode = `BXR-${(user.name || "USER").replace(/\s/g, "").toUpperCase().slice(0, 6)}${new Date().getFullYear()}`;

  return html`
    <section class="network-page">
      <!-- Your referral code card -->
      <div class="network-hero">
        <div>
          <span class="hero-pill">Referral &amp; Trust Network</span>
          <h2>Grow the BridgeX partner network</h2>
          <p>Share your referral code to invite trusted companies and candidates. Each verified referral strengthens your trust score.</p>
        </div>
        <div class="referral-code-card">
          <span class="hint">Your referral code</span>
          <div class="referral-code-display" id="my-referral-code">${escapeHTML(myCode)}</div>
          <button class="ghost" data-action="copy-referral-code" data-code="${escapeHTML(myCode)}" data-tooltip="Copy code to clipboard">Copy code</button>
        </div>
      </div>

      <!-- Invite form -->
      <div class="panel network-invite-panel">
        <h3>Invite someone to BridgeX</h3>
        <p class="hint">Enter their email and we'll log the referral. Once they verify, you get trust credit.</p>
        <form id="referral-invite-form" class="referral-invite-form">
          <input name="referredEmail" type="email" placeholder="partner@company.com" required />
          <select name="type">
            <option value="company">Company (recruiter)</option>
            <option value="candidate">Candidate (pitcher)</option>
          </select>
          <button class="primary" type="submit">Send Invite</button>
        </form>
        <div id="referral-invite-status"></div>
      </div>

      <!-- Referral log -->
      ${referrals.length ? html`
        <div class="panel" style="margin-top:16px">
          <h3>Your referral history</h3>
          <div class="list" style="margin-top:12px">
            ${referrals.map((r) => html`
              <div class="card referral-row">
                <div class="referral-row-info">
                  <b>${escapeHTML(r.referredEmail)}</b>
                  <span class="badge">${escapeHTML(r.type)}</span>
                  <span class="badge ${r.status === "verified" ? "good" : r.status === "pending" ? "warn" : ""}">${escapeHTML(r.status)}</span>
                </div>
                <span class="hint">${new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Trust leaderboard -->
      <div class="panel" style="margin-top:16px">
        <h3>Partner trust leaderboard</h3>
        <p class="hint" style="margin-bottom:12px">All verified members, ranked by reputation score. Scores are earned through postings, interviews, meetings, and referrals.</p>
        <div class="list">
          ${userRep
            .sort((a, b) => b.score - a.score)
            .map(({ user: u, score, label, cls, totalApps, meetings }, i) => html`
              <div class="card rep-row">
                <div class="rep-rank">${i + 1}</div>
                <div class="company-dot rep-dot">${escapeHTML((u.company || u.name || "?").slice(0, 1))}</div>
                <div class="rep-info">
                  <b>${escapeHTML(u.company || u.name || "Unknown")}</b>
                  <span class="hint">${escapeHTML(u.name || "")} · ${escapeHTML(u.role === "recruiter" ? "Company" : "Candidate")}</span>
                </div>
                <div class="rep-stats">
                  <span>${totalApps} app${totalApps !== 1 ? "s" : ""}</span>
                  <span>${meetings} meeting${meetings !== 1 ? "s" : ""}</span>
                </div>
                <div class="rep-display ${cls}" data-tooltip="Reputation score: ${score}/100">
                  <span class="rep-score">${score}</span>
                  <span class="rep-label">${label}</span>
                </div>
                ${u.id === user.id ? `<span class="badge good">You</span>` : ""}
              </div>
            `).join("")}
        </div>
      </div>
    </section>
  `;
}
