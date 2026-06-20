import { ctx, initCtx, analyze, setActiveUser, SESSION_USER_KEY } from "./app/ctx.js";
import { render } from "./app/shell.js";
import { saveState } from "./shared/state.js";
import { hasSession } from "./shared/api.js";
import "./app/events.js";

initCtx();

(async () => {
  if (hasSession()) {
    try {
      const res = await fetch("/api/state", {
        headers: { Authorization: `Bearer ${localStorage.getItem("bridgex_token")}` }
      });
      if (res.ok) {
        const serverState = await res.json();
        if (serverState?.users) {
          ctx.state = serverState;
          localStorage.setItem("bridgex_state_v17", JSON.stringify(serverState));
        }
      }
    } catch { /* fall back to localStorage */ }
  }

  if (!ctx.state.users.find((u) => u.id === ctx.activeUserId)) {
    setActiveUser(ctx.state.users[0].id);
  }

  const saved = localStorage.getItem(SESSION_USER_KEY);
  if (saved && ctx.route === "home") {
    const u = ctx.state.users.find((u) => u.id === saved);
    if (u?.verified) ctx.route = "dashboard";
  }

  ctx.state.applications.forEach((app) => { if (!app.analysis) analyze(app); });
  saveState(ctx.state);
  render();
})();
