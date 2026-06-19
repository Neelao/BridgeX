import { escapeHTML, html } from "../../shared/utils.js";

export function renderNetworkFeed(state, user, partnershipAreas) {
  const preference = user.preference || "business";
  const area = partnershipAreas.find((item) => item.id === preference) || partnershipAreas[0];
  const isRecruiter = user.role === "recruiter";
  const userLinkedIn = user.verification?.linkedIn || user.linkedIn;
  const rows = state.opportunities.map((opp) => ({
    opp,
    owner: state.users.find((item) => item.id === opp.ownerId) || state.users[0],
    count: state.applications.filter((app) => app.opportunityId === opp.id).length
  }));

  return html`
    <section class="network-layout">
      <aside class="profile-card">
        <div class="profile-cover"></div>
        <div class="profile-avatar">${escapeHTML(user.company.slice(0, 1))}</div>
        <h2>${escapeHTML(user.company)}</h2>
        <p>${escapeHTML(user.role === "recruiter" ? "Partner search team" : "Pitching company")}</p>
        <span class="badge good">Verified company</span>
        <div class="profile-meta">
          <span>Focus</span>
          <b>${escapeHTML(area.title)}</b>
        </div>
        <div class="profile-meta">
          <span>Business ID</span>
          <b>${escapeHTML(user.verification?.businessCode || "Verified demo")}</b>
        </div>
        <div class="profile-meta">
          <span>LinkedIn</span>
          <b>${userLinkedIn ? "Connected" : "Pending"}</b>
        </div>
        ${
          userLinkedIn
            ? `<a class="linkedin-connect profile-linkedin" href="${escapeHTML(userLinkedIn)}" target="_blank" rel="noopener noreferrer">Open LinkedIn ↗</a>`
            : ""
        }
      </aside>

      <section class="feed-column">
        <div class="composer panel">
          <div>
            <h2>${isRecruiter ? "Post a partnership opening" : "Find openings to pitch"}</h2>
            <p>${isRecruiter ? "Share what your company needs and receive screened partner pitches." : "Browse active company needs and pitch where your company fits."}</p>
          </div>
          <button class="primary" data-route="${isRecruiter ? "requirements" : "apply"}">${isRecruiter ? "Create post" : "Browse openings"}</button>
        </div>

        <div class="tabs">
          <button class="tab-btn active">Recommended</button>
          <button class="tab-btn">Recent</button>
          <button class="tab-btn">Verified</button>
        </div>

        ${rows
          .map(
            ({ opp, owner, count }) => html`
              <article class="feed-post">
                <div class="post-head">
                  <div class="company-dot">${escapeHTML(owner.company.slice(0, 1))}</div>
                  <div>
                    <h3>${escapeHTML(owner.company)}</h3>
                    <span>${escapeHTML(opp.createdAt)} - Partnership opening</span>
                  </div>
                  <span class="badge good">Verified</span>
                </div>
                <h2>${escapeHTML(opp.title)}</h2>
                <p>${escapeHTML(opp.description)}</p>
                <div class="post-tags">
                  ${(opp.mustHaves || "")
                    .split(",")
                    .slice(0, 4)
                    .map((tag) => `<span>${escapeHTML(tag.trim())}</span>`)
                    .join("")}
                </div>
                <div class="post-actions">
                  <span>${count} pitch${count === 1 ? "" : "es"} received</span>
                  <button class="mini-btn" data-route="${isRecruiter ? "dashboard" : "apply"}">${isRecruiter ? "Review pipeline" : "Pitch now"}</button>
                </div>
              </article>
            `
          )
          .join("")}
      </section>

      <aside class="suggestions panel">
        <h2>BridgeX Assistant</h2>
        <p>${isRecruiter ? "Suggested companies are prioritized by your selected focus, proposal strength, and verification status." : "Openings are prioritized by your selected focus and your company profile."}</p>
        <h2>Suggested Companies</h2>
        ${state.candidates
          .map(
            (candidate) => html`
              <div class="suggestion-row">
                <div class="company-dot small-dot">${escapeHTML(candidate.company.slice(0, 1))}</div>
                <div>
                  <b>${escapeHTML(candidate.company)}</b>
                  <span>${escapeHTML(candidate.bio)}</span>
                  ${
                    candidate.linkedIn
                      ? `<a class="linkedin-connect" href="${escapeHTML(candidate.linkedIn)}" target="_blank" rel="noopener noreferrer">Connect through LinkedIn ↗</a>`
                      : ""
                  }
                </div>
              </div>
            `
          )
          .join("")}
      </aside>
    </section>
  `;
}
