import { escapeHTML, html } from "../../../shared/utils.js";

export function renderAnalytics(state, user) {
  const myOppIds = new Set(
    state.opportunities.filter((o) => o.ownerId === user.id).map((o) => o.id)
  );
  const myOpps = state.opportunities.filter((o) => myOppIds.has(o.id));
  const allApps = state.applications.filter((a) => myOppIds.has(a.opportunityId));
  const total = allApps.length;

  const analyzed = allApps.filter((a) => a.analysis).length;
  const interviewInvited = allApps.filter((a) => a.invitedToInterview).length;
  const interviewDone = allApps.filter((a) => a.interview).length;
  const meetingDone = allApps.filter((a) => a.meeting).length;

  const scores = allApps.filter((a) => a.analysis?.score).map((a) => a.analysis.score);
  const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const topScore = scores.length ? Math.max(...scores) : 0;

  const funnel = [
    { label: "Applications received", value: total },
    { label: "AI analyzed", value: analyzed },
    { label: "Interview invited", value: interviewInvited },
    { label: "Interview completed", value: interviewDone },
    { label: "Meeting scheduled", value: meetingDone }
  ];

  const buckets = [
    { label: "0 – 40 (Weak)", count: scores.filter((s) => s <= 40).length },
    { label: "41 – 60 (Potential)", count: scores.filter((s) => s > 40 && s <= 60).length },
    { label: "61 – 80 (Good)", count: scores.filter((s) => s > 60 && s <= 80).length },
    { label: "81 – 100 (Strong)", count: scores.filter((s) => s > 80).length }
  ];

  const postingStats = myOpps
    .map((opp) => {
      const apps = allApps.filter((a) => a.opportunityId === opp.id);
      const appScores = apps.filter((a) => a.analysis?.score).map((a) => a.analysis.score);
      const avg = appScores.length ? Math.round(appScores.reduce((s, v) => s + v, 0) / appScores.length) : 0;
      return {
        opp,
        count: apps.length,
        avg,
        interviewed: apps.filter((a) => a.interview).length,
        meetings: apps.filter((a) => a.meeting).length
      };
    })
    .sort((a, b) => b.count - a.count);

  return html`
    <section class="dashboard-page">
      <div class="dashboard-hero">
        <div>
          <span class="hero-pill">Business intelligence</span>
          <h2>Recruiter Analytics</h2>
          <p>Conversion funnel, score distribution, and per-posting performance across all your partnership postings.</p>
        </div>
      </div>

      <section class="dashboard-stats">
        <div class="panel stat"><span>Total postings</span><b>${myOpps.length}</b></div>
        <div class="panel stat"><span>Applications</span><b>${total}</b></div>
        <div class="panel stat"><span>Avg fit score</span><b>${avgScore || "—"}${avgScore ? "%" : ""}</b></div>
        <div class="panel stat"><span>Top score</span><b>${topScore || "—"}${topScore ? "%" : ""}</b></div>
        <div class="panel stat"><span>Meetings booked</span><b>${meetingDone}</b></div>
      </section>

      <div class="analytics-grid">
        <div class="panel">
          <h3>Application Funnel</h3>
          ${
            total === 0
              ? `<p class="hint">No applications yet. Share your postings in the feed to start receiving pitches.</p>`
              : html`
                  <div class="funnel">
                    ${funnel
                      .map(({ label, value }) => {
                        const pct = total ? Math.round((value / total) * 100) : 0;
                        return html`
                          <div class="funnel-row">
                            <span class="funnel-label">${escapeHTML(label)}</span>
                            <div class="funnel-bar-wrap">
                              <div class="funnel-bar" style="width:${pct}%"></div>
                            </div>
                            <span class="funnel-value">${value} <small>${pct}%</small></span>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                `
          }
        </div>

        <div class="panel">
          <h3>Score Distribution</h3>
          ${
            scores.length === 0
              ? `<p class="hint">No scores yet — run <b>Re-analyze All</b> from the dashboard first.</p>`
              : html`
                  <div class="funnel">
                    ${buckets
                      .map(({ label, count }) => {
                        const pct = scores.length ? Math.round((count / scores.length) * 100) : 0;
                        return html`
                          <div class="funnel-row">
                            <span class="funnel-label">${escapeHTML(label)}</span>
                            <div class="funnel-bar-wrap">
                              <div class="funnel-bar" style="width:${pct}%"></div>
                            </div>
                            <span class="funnel-value">${count}</span>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                `
          }
        </div>
      </div>

      <div class="panel">
        <h3>Performance by Posting</h3>
        ${
          postingStats.length === 0
            ? `<p class="hint">No postings yet.</p>`
            : html`
                <div class="list">
                  ${postingStats
                    .map(
                      ({ opp, count, avg, interviewed, meetings }) => html`
                        <div class="row">
                          <div>
                            <h4 style="margin:0 0 3px">${escapeHTML(opp.title)}</h4>
                            <span class="hint">${count} applicant${count !== 1 ? "s" : ""} · ${interviewed} interviewed · ${meetings} meeting${meetings !== 1 ? "s" : ""} · posted ${escapeHTML(opp.createdAt || "")}</span>
                          </div>
                          <div class="actions">
                            ${avg ? `<span class="badge ${avg >= 70 ? "good" : avg >= 50 ? "warn" : "bad"}">Avg ${avg}%</span>` : `<span class="badge">No scores</span>`}
                            <span class="badge">${escapeHTML(opp.status)}</span>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
        }
      </div>
    </section>
  `;
}
