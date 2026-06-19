import { escapeHTML, html } from "../../shared/utils.js";

const gradients = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5"
];

function imageClass(id = "") {
  return gradients[id.codePointAt(id.length - 1) % gradients.length];
}

function renderComments(opp, comments, expanded, user) {
  if (!expanded) return "";
  return html`
    <div class="comments-section">
      ${
        comments.length
          ? comments
              .map(
                (c) => html`
                  <div class="comment-item">
                    <div class="company-dot small-dot">${escapeHTML(c.company.slice(0, 1))}</div>
                    <div class="comment-body">
                      <div class="comment-meta">
                        <b>${escapeHTML(c.userName)}</b>
                        <span>${escapeHTML(c.company)} · ${escapeHTML(c.createdAt)}</span>
                      </div>
                      <p>${escapeHTML(c.text)}</p>
                    </div>
                  </div>
                `
              )
              .join("")
          : `<p class="comment-empty">No comments yet — be the first to respond.</p>`
      }
      <form class="comment-form" data-action="add-comment" data-opp="${opp.id}">
        <div class="comment-dot">${escapeHTML(user.company.slice(0, 1))}</div>
        <input name="comment" placeholder="Add a comment…" autocomplete="off" />
        <button class="mini-btn primary" type="submit">Post</button>
      </form>
    </div>
  `;
}

export function renderNetworkFeed(state, user, partnershipAreas, expandedComments = new Set()) {
  const isRecruiter = user.role === "recruiter";
  const userLinkedIn = user.verification?.linkedIn || user.linkedIn;
  const preference = user.preference || "business";
  const area = partnershipAreas.find((a) => a.id === preference) || partnershipAreas[0];

  const rows = state.opportunities.map((opp) => ({
    opp,
    owner: state.users.find((u) => u.id === opp.ownerId) || state.users[0],
    appCount: state.applications.filter((app) => app.opportunityId === opp.id).length,
    isOwn: opp.ownerId === user.id,
    liked: (opp.likes || []).includes(user.id),
    likeCount: (opp.likes || []).length,
    comments: opp.comments || [],
    expanded: expandedComments.has(opp.id)
  }));

  return html`
    <section class="network-layout">
      <aside class="profile-card">
        <div class="profile-cover"></div>
        <div class="profile-avatar">${escapeHTML(user.company.slice(0, 1))}</div>
        <h2>${escapeHTML(user.company)}</h2>
        <p>${escapeHTML(isRecruiter ? "Partner search team" : "Pitching company")}</p>
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
            <p>${isRecruiter ? "Share what your company needs and receive AI-screened partner pitches." : "Browse active openings and apply directly from the feed."}</p>
          </div>
          <button class="primary" data-route="${isRecruiter ? "requirements" : "apply"}">${isRecruiter ? "Create Post" : "Browse All"}</button>
        </div>

        <div class="tabs">
          <button class="tab-btn active">All Posts</button>
          <button class="tab-btn">Verified</button>
          <button class="tab-btn">Trending</button>
        </div>

        ${rows
          .map(
            ({ opp, owner, appCount, isOwn, liked, likeCount, comments, expanded }) => html`
              <article class="feed-post">
                <div class="post-image ${imageClass(opp.id)}">
                  <div class="post-company-flag">
                    <div class="company-dot post-avatar">${escapeHTML(owner.company.slice(0, 1))}</div>
                    <div class="post-flag-info">
                      <b>${escapeHTML(owner.company)}</b>
                      <span>${escapeHTML(opp.createdAt)} · Partnership opening</span>
                    </div>
                    <span class="badge good">Verified</span>
                  </div>
                </div>

                <div class="post-body">
                  <h2 class="post-title">${escapeHTML(opp.title)}</h2>
                  <p class="post-desc">${escapeHTML(opp.description)}</p>

                  <div class="requirements-row">
                    <div class="req-group">
                      <span class="req-label must">Must-haves</span>
                      <div class="post-tags">
                        ${(opp.mustHaves || "")
                          .split(",")
                          .map((tag) => `<span>${escapeHTML(tag.trim())}</span>`)
                          .join("")}
                      </div>
                    </div>
                    ${
                      opp.niceToHaves
                        ? html`
                            <div class="req-group">
                              <span class="req-label nice">Nice-to-haves</span>
                              <div class="post-tags nice">
                                ${(opp.niceToHaves || "")
                                  .split(",")
                                  .map((tag) => `<span>${escapeHTML(tag.trim())}</span>`)
                                  .join("")}
                              </div>
                            </div>
                          `
                        : ""
                    }
                  </div>

                  <div class="post-actions">
                    <div class="post-social">
                      <button
                        class="social-btn${liked ? " liked" : ""}"
                        data-action="like-post"
                        data-opp="${opp.id}"
                      >♥ ${likeCount} ${likeCount === 1 ? "Like" : "Likes"}</button>
                      <button
                        class="social-btn${expanded ? " active" : ""}"
                        data-action="toggle-comments"
                        data-opp="${opp.id}"
                      >💬 ${comments.length} ${comments.length === 1 ? "Comment" : "Comments"}</button>
                      <span class="pitch-count">${appCount} pitch${appCount === 1 ? "" : "es"}</span>
                    </div>
                    ${
                      isOwn || isRecruiter
                        ? `<button class="mini-btn" data-route="dashboard">Review Pipeline</button>`
                        : `<button class="apply-btn" data-action="apply-post" data-opp="${opp.id}">Apply Now</button>`
                    }
                  </div>

                  ${renderComments(opp, comments, expanded, user)}
                </div>
              </article>
            `
          )
          .join("")}
      </section>

      <aside class="suggestions panel">
        <h2>BridgeX Assistant</h2>
        <p>${isRecruiter ? "Companies are ranked by focus match, proposal strength, and verification status." : "Openings are ranked by your selected focus and company profile."}</p>
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
