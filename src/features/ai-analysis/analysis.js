const securityWords = ["secure", "security", "encrypt", "audit", "privacy", "compliance", "tenant", "access"];
const scaleWords = ["scale", "enterprise", "deployment", "api", "architecture", "dashboard", "workflow"];
const sustainabilityWords = ["sustainability", "esg", "carbon", "energy", "supplier", "waste", "reporting"];

function normalize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokens(text = "") {
  return [...new Set(normalize(text).split(/\s+/).filter((word) => word.length > 2))];
}

function criteria(text = "") {
  return text
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function containsAny(text, words) {
  const clean = normalize(text);
  return words.filter((word) => clean.includes(word));
}

function matchedCriteria(requirements, proposal) {
  const proposalTokens = tokens(proposal);
  return requirements.filter((item) => {
    const words = tokens(item);
    return words.some((word) => proposalTokens.includes(word));
  });
}

export function analyzeApplication(opportunity, application) {
  const proposal = application.proposalText || "";
  const must = criteria(opportunity.mustHaves);
  const nice = criteria(opportunity.niceToHaves);
  const matchedMust = matchedCriteria(must, proposal);
  const matchedNice = matchedCriteria(nice, proposal);
  const missingMust = must.filter((item) => !matchedMust.includes(item));
  const missingNice = nice.filter((item) => !matchedNice.includes(item));
  const security = containsAny(proposal, securityWords);
  const scale = containsAny(proposal, scaleWords);
  const sustainability = containsAny(proposal, sustainabilityWords);

  const mustScore = must.length ? (matchedMust.length / must.length) * 48 : 40;
  const niceScore = nice.length ? (matchedNice.length / nice.length) * 18 : 10;
  const sssScore = Math.min(24, security.length * 3 + scale.length * 2.5 + sustainability.length * 3);
  const clarityScore = Math.min(10, Math.round(proposal.length / 90));
  const score = Math.min(98, Math.round(mustScore + niceScore + sssScore + clarityScore));

  const strengths = [
    matchedMust.length ? `Matches ${matchedMust.length} must-have requirement(s)` : "",
    matchedNice.length ? `Adds ${matchedNice.length} nice-to-have signal(s)` : "",
    security.length ? "Shows security and verification awareness" : "",
    scale.length ? "Mentions scalable implementation or enterprise readiness" : "",
    sustainability.length ? "Directly supports sustainability outcomes" : ""
  ].filter(Boolean);

  const risks = [
    missingMust.length ? `Missing must-have evidence: ${missingMust.slice(0, 2).join(", ")}` : "",
    proposal.length < 180 ? "Proposal is short and may need more proof" : "",
    !security.length ? "Security approach is not clear yet" : "",
    !sustainability.length ? "Sustainability impact is not clearly explained" : ""
  ].filter(Boolean);

  return {
    score,
    recommendation: score >= 78 ? "Strong fit" : score >= 55 ? "Potential fit" : "Weak fit",
    reasoning:
      "The score weighs must-have matches, nice-to-have signals, and secure, scalable, sustainable alignment from the submitted proposal.",
    matchedMust,
    matchedNice,
    missingMust,
    missingNice,
    strengths: strengths.length ? strengths : ["Clear enough to proceed to discovery"],
    risks: risks.length ? risks : ["No major gaps detected in the submitted text"],
    sss: {
      security: security.length ? Math.min(100, 55 + security.length * 10) : 35,
      scalability: scale.length ? Math.min(100, 55 + scale.length * 10) : 40,
      sustainability: sustainability.length ? Math.min(100, 55 + sustainability.length * 10) : 40
    }
  };
}

export function summarizeInterview(opportunity, application, interview) {
  const answers = interview.answers.map((item) => item.answer).join(" ");
  const temporaryApp = { ...application, proposalText: `${application.proposalText} ${answers}` };
  const updated = analyzeApplication(opportunity, temporaryApp);
  const topAnswer = interview.answers.find((item) => item.question.toLowerCase().includes("pitch"));

  return {
    score: Math.max(application.analysis?.score || 0, updated.score),
    recommendation: updated.recommendation,
    pitchSummary: topAnswer
      ? topAnswer.answer
      : `${application.proposalText.slice(0, 180)}${application.proposalText.length > 180 ? "..." : ""}`,
    strengths: updated.strengths,
    risks: updated.risks,
    nextQuestions: [
      "What proof can you share from an existing customer or deployment?",
      "Who will own implementation on both sides?",
      "What data needs to be exchanged during the first pilot?"
    ],
    sss: updated.sss
  };
}
