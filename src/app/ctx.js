import { loadState } from "../shared/state.js";
import { analyzeApplication } from "../features/candidate-hub/ai-analysis/analysis.js";
import { buildAiHelperReply } from "../features/portal-flow/verification/verification.js";

export const SESSION_USER_KEY = "bridgex_active_user";

export const ctx = {
  state: null,
  route: "home",
  activeUserId: null,
  modal: "",
  entryRole: "recruiter",
  verificationResult: null,
  aiHelperMessages: [],
  accessDraft: {},
  expandedComments: new Set(),
  loginError: "",
  dashFilters: { search: "", minScore: 0, status: "all" },
};

export const recruiterRoutes = [
  ["feed", "Feed"],
  ["dashboard", "Dashboard"],
  ["requirements", "Post Requirement"],
  ["analytics", "Business Analytics"],
  ["network", "Partner Network"]
];

export const candidateRoutes = [
  ["feed", "Feed"],
  ["apply", "Apply Jobs"],
  ["documents", "My Documents"],
  ["dashboard", "My Dashboard"],
  ["network", "Partner Network"]
];

export function initCtx() {
  ctx.state = loadState();
  const saved = localStorage.getItem(SESSION_USER_KEY);
  ctx.activeUserId = saved && ctx.state.users.find((u) => u.id === saved)
    ? saved
    : ctx.state.users[0].id;
}

export function setActiveUser(id) {
  ctx.activeUserId = id;
  if (id) localStorage.setItem(SESSION_USER_KEY, id);
  else localStorage.removeItem(SESSION_USER_KEY);
}

export function currentUser() {
  return ctx.state.users.find((u) => u.id === ctx.activeUserId) || ctx.state.users[0];
}

export function isCandidate() {
  return currentUser().role === "candidate";
}

export function getRoutes() {
  return isCandidate() ? candidateRoutes : recruiterRoutes;
}

export function getRouteLabel(id) {
  return getRoutes().find(([r]) => r === id)?.[1] || "Dashboard";
}

export function findApp(appId) {
  const app = ctx.state.applications.find((item) => item.id === appId);
  return {
    app,
    candidate: ctx.state.candidates.find((item) => item.id === app?.candidateId),
    opportunity: ctx.state.opportunities.find((item) => item.id === app?.opportunityId)
  };
}

export function analyze(app) {
  const opportunity = ctx.state.opportunities.find((item) => item.id === app.opportunityId);
  app.analysis = analyzeApplication(opportunity, app);
  app.status = app.status === "submitted" ? "analyzed" : app.status;
}

export function askAiHelper(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  ctx.aiHelperMessages.push({ role: "user", text: cleanQuestion });
  ctx.aiHelperMessages.push({
    role: "assistant",
    text: buildAiHelperReply(cleanQuestion, {
      entryRole: ctx.entryRole,
      verificationResult: ctx.verificationResult,
      user: currentUser()
    })
  });
  ctx.aiHelperMessages = ctx.aiHelperMessages.slice(-8);
}

export function updateAccessDraft(data) {
  ctx.accessDraft = {
    name: data.name || "",
    company: data.company || "",
    email: data.email || "",
    hrEmail: data.hrEmail || "",
    roleTitle: data.roleTitle || "",
    businessCode: data.businessCode || "",
    linkedIn: data.linkedIn || "",
    password: data.password || "",
    authorizedBy: data.authorizedBy || "",
    letterPurpose: data.letterPurpose || "",
    supportPurpose: data.supportPurpose || "",
    orgType: data.orgType || ctx.accessDraft.orgType || "",
    preference: data.preference || ctx.accessDraft.preference || ""
  };
}

export function protectedRoute(nextRoute) {
  return ["feed", "dashboard", "requirements", "apply", "documents", "analytics", "auth", "network"].includes(nextRoute);
}
