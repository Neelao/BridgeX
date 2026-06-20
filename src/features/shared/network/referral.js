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
  const partnerCards = state.candidates
    .map((candidate, index) => {
      const relatedApps = state.applications.filter((app) => app.candidateId === candidate.id);
      const bestScore = Math.max(0, ...relatedApps.map((app) => app.interview?.summary?.score ?? app.analysis?.score ?? 0));
      const status = relatedApps.some((app) => app.interview)
        ? "Interviewed"
        : relatedApps.some((app) => app.invitedToInterview)
          ? "AI interview ready"
          : "Open to connect";
      const focus = candidate.bio || "Verified partner profile in the BridgeX network.";
      return { candidate, bestScore, status, focus, index };
    });
  const activity = [
    { title: "GreenGrid completed an AI interview", detail: "Sustainability reporting partner · 94% match", tone: "good" },
    { title: "SecureLedger accepted interview invite", detail: "Compliance workflow specialist · pending interview", tone: "blue" },
    { title: "MarketPilot joined the partner graph", detail: "GTM operations profile added to discovery", tone: "warn" }
  ];

  return html`
    <section class="network-page">
      <div class="network-hero">
        <div>
          <span class="hero-pill">Partner Network</span>
          <h2>Discover warm, verified ecosystem connections</h2>
          <p>BridgeX maps companies, pitchers, referrals, AI interviews, and meeting readiness into one relationship graph.</p>
          <div class="network-hero-stats">
            <span><b>${allUsers.length}</b> verified profiles</span>
            <span><b>${state.applications.length}</b> active pitches</span>
            <span><b>${state.applications.filter((app) => app.interview).length}</b> AI interviews</span>
          </div>
        </div>
        <div class="network-map-card" aria-label="Animated partner network map">
          <div class="network-link-line line-a"></div>
          <div class="network-link-line line-b"></div>
          <div class="network-link-line line-c"></div>
          ${partnerCards.slice(0, 4).map(({ candidate, bestScore }, index) => html`
            <div class="network-node node-${index + 1}">
              <span>${escapeHTML((candidate.company || candidate.name || "?").slice(0, 2).toUpperCase())}</span>
              <small>${bestScore || 70 + index * 6}%</small>
            </div>
          `).join("")}
          <div class="network-center-node">
            <b>BX</b>
            <span>AI matched</span>
          </div>
        </div>
      </div>

      <div class="network-grid">
        <div class="panel referral-code-card">
          <span class="hint">Your referral code</span>
          <div class="referral-code-display" id="my-referral-code">${escapeHTML(myCode)}</div>
          <button class="ghost" data-action="copy-referral-code" data-code="${escapeHTML(myCode)}" data-tooltip="Copy code to clipboard">Copy code</button>
        </div>

        <div class="panel network-invite-panel">
          <h3>Invite someone to BridgeX</h3>
          <p class="hint">Invite a trusted company or pitcher into your ecosystem.</p>
          <form id="referral-invite-form" class="referral-invite-form">
            <input name="referredEmail" type="email" placeholder="partner@company.com" required />
            <select name="type">
              <option value="company">Company</option>
              <option value="candidate">Pitcher</option>
            </select>
            <button class="primary" type="submit">Send Invite</button>
          </form>
          <div id="referral-invite-status"></div>
        </div>
      </div>

      <div class="network-section-head">
        <div>
          <h2>Recommended partners</h2>
          <p>Visual profiles ranked by AI fit, interview readiness, and ecosystem trust signals.</p>
        </div>
      </div>

      <div class="partner-card-grid">
        ${partnerCards.map(({ candidate, bestScore, status, focus, index }) => html`
          <article class="partner-card">
            <div class="partner-card-cover cover-${(index % 4) + 1}"></div>
            <div class="partner-avatar">${escapeHTML((candidate.company || candidate.name || "?").slice(0, 2).toUpperCase())}</div>
            <div class="partner-card-body">
              <div>
                <h3>${escapeHTML(candidate.company || candidate.name)}</h3>
                <p>${escapeHTML(candidate.name)} · ${escapeHTML(candidate.role || "Partner lead")}</p>
              </div>
              <p>${escapeHTML(focus)}</p>
              <div class="partner-tags">
                <span>${escapeHTML(status)}</span>
                <span>${bestScore || 72}% match</span>
                <span>${candidate.linkedIn ? "LinkedIn linked" : "Profile verified"}</span>
              </div>
              <div class="partner-card-actions">
                <button class="mini-btn">View profile</button>
                <button class="primary">Connect</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>

      <div class="network-two-col">
        <div class="panel">
          <h3>Network activity</h3>
          <div class="network-activity-list">
            ${activity.map((item) => html`
              <div class="activity-item ${item.tone}">
                <span></span>
                <div>
                  <b>${escapeHTML(item.title)}</b>
                  <small>${escapeHTML(item.detail)}</small>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel">
          <h3>Trust leaderboard</h3>
          <p class="hint">Scores come from verified status, postings, interviews, meetings, and referrals.</p>
          <div class="list compact-leaderboard">
            ${userRep
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(({ user: u, score, label, cls, totalApps, meetings }, i) => html`
                <div class="rep-row">
                  <div class="rep-rank">${i + 1}</div>
                  <div class="company-dot rep-dot">${escapeHTML((u.company || u.name || "?").slice(0, 1))}</div>
                  <div class="rep-info">
                    <b>${escapeHTML(u.company || u.name || "Unknown")}</b>
                    <span class="hint">${totalApps} pitch${totalApps !== 1 ? "es" : ""} · ${meetings} meeting${meetings !== 1 ? "s" : ""}</span>
                  </div>
                  <div class="rep-display ${cls}" data-tooltip="Reputation score: ${score}/100">
                    <span class="rep-score">${score}</span>
                    <span class="rep-label">${label}</span>
                  </div>
                </div>
              `).join("")}
          </div>
        </div>
      </div>

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
    </section>
  `;
}
