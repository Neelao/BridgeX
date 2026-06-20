const securityWords = ["secure", "security", "encrypt", "audit", "privacy", "compliance", "tenant", "access"];
const scaleWords = ["scale", "enterprise", "deployment", "api", "architecture", "dashboard", "workflow"];
const sustainabilityWords = ["sustainability", "esg", "carbon", "energy", "supplier", "waste", "reporting"];
const businessWords = ["partner", "partnership", "customer", "market", "pilot", "pricing", "sales", "launch", "growth"];
const proofWords = ["deployed", "delivered", "built", "launched", "client", "customer", "case", "users", "revenue", "production"];

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

function keywordHits(text = "") {
  const groups = [
    { label: "Security", words: securityWords },
    { label: "Scalability", words: scaleWords },
    { label: "Sustainability", words: sustainabilityWords },
    { label: "Business", words: businessWords },
    { label: "Proof", words: proofWords }
  ];
  return groups
    .map((group) => ({ label: group.label, hits: containsAny(text, group.words) }))
    .filter((group) => group.hits.length);
}

function sentences(text = "") {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|[\n\r]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 24);
}

function evidenceLine(text, words, fallback) {
  const cleanWords = words.map((word) => word.toLowerCase());
  const found = sentences(text).find((line) => {
    const clean = normalize(line);
    return cleanWords.some((word) => clean.includes(word));
  });
  return found || fallback;
}

export function extractDocumentKeyPoints(opportunity = {}, application = {}) {
  const docs = application.documents || [];
  const documentText = [
    application.proposalText,
    application.whyApply,
    application.documentText,
    docs.map((doc) => `${doc.kind || "Document"} ${doc.name || ""} ${doc.extractedText || ""}`).join(" ")
  ]
    .filter(Boolean)
    .join(" ");
  const sourceText = documentText || "No document text available yet.";
  const must = criteria(opportunity.mustHaves || "");
  const nice = criteria(opportunity.niceToHaves || "");
  const matchedMust = matchedCriteria(must, sourceText);
  const matchedNice = matchedCriteria(nice, sourceText);
  const hits = keywordHits(sourceText);
  const keyPoints = [
    {
      label: "Relevant experience",
      value: evidenceLine(sourceText, ["experience", "deployed", "delivered", "built", "client"], "Evidence from the proposal and uploaded file names has been captured for recruiter review.")
    },
    {
      label: "Technical / operating capability",
      value: evidenceLine(sourceText, [...scaleWords, "automation", "platform", "workflow"], "The submitted materials mention operating capability, but the AI should probe for technical depth in interview.")
    },
    {
      label: "Secure, scalable, sustainable fit",
      value: evidenceLine(sourceText, [...securityWords, ...scaleWords, ...sustainabilityWords], "The AI found partial SSS alignment and will ask targeted follow-ups where evidence is thin.")
    },
    {
      label: "Business proof",
      value: evidenceLine(sourceText, proofWords, "The AI did not find strong proof yet, so it will ask for customers, pilots, or measurable outcomes.")
    }
  ];

  const confidence = Math.min(
    98,
    35 + matchedMust.length * 10 + matchedNice.length * 5 + hits.reduce((sum, group) => sum + group.hits.length, 0) * 3
  );

  return {
    confidence,
    keyPoints,
    keywordGroups: hits,
    matchedMust,
    matchedNice,
    missingMust: must.filter((item) => !matchedMust.includes(item)),
    missingNice: nice.filter((item) => !matchedNice.includes(item)),
    summary:
      confidence >= 78
        ? "The uploaded materials provide strong evidence for this opportunity."
        : confidence >= 55
          ? "The uploaded materials show promise, but the AI interview should validate missing proof."
          : "The uploaded materials need more specific evidence before shortlisting."
  };
}

export function analyzeApplication(opportunity, application) {
  const documentScan = extractDocumentKeyPoints(opportunity, application);
  const proposal = [application.proposalText || "", application.documentText || ""].join(" ");
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
    documentScan,
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
  const interviewScan = extractInterviewKeyPoints(opportunity, application, interview);

  return {
    score: Math.max(application.analysis?.score || 0, updated.score),
    recommendation: updated.recommendation,
    pitchSummary: topAnswer
      ? topAnswer.answer
      : `${application.proposalText.slice(0, 180)}${application.proposalText.length > 180 ? "..." : ""}`,
    strengths: updated.strengths,
    risks: updated.risks,
    keyPoints: interviewScan.keyPoints,
    keywordGroups: interviewScan.keywordGroups,
    evidenceScore: interviewScan.evidenceScore,
    nextQuestions: [
      "What proof can you share from an existing customer or deployment?",
      "Who will own implementation on both sides?",
      "What data needs to be exchanged during the first pilot?"
    ],
    sss: updated.sss
  };
}

export function extractInterviewKeyPoints(opportunity = {}, application = {}, interview = {}) {
  const answers = interview.answers || [];
  const answerText = answers.map((item) => `${item.question} ${item.answer}`).join(" ");
  const combined = `${application.proposalText || ""} ${answerText}`;
  const hits = keywordHits(answerText);
  const must = criteria(opportunity.mustHaves || "");
  const matchedMust = matchedCriteria(must, combined);
  const evidenceScore = Math.min(100, 42 + matchedMust.length * 9 + hits.reduce((sum, group) => sum + group.hits.length, 0) * 4);
  return {
    evidenceScore,
    keywordGroups: hits,
    keyPoints: [
      {
        label: "Pitch clarity",
        value: evidenceLine(answerText, ["pitch", "value", "bring", "solution"], "The candidate gave a pitch answer; recruiter should review clarity and relevance.")
      },
      {
        label: "Proof under pressure",
        value: evidenceLine(answerText, proofWords, "The AI did not hear enough concrete proof yet; ask for customers, metrics, or delivered outcomes.")
      },
      {
        label: "SSS alignment",
        value: evidenceLine(answerText, [...securityWords, ...scaleWords, ...sustainabilityWords], "The answer touched the secure, scalable, sustainable track, but the detail level should be checked.")
      },
      {
        label: "Follow-up readiness",
        value: evidenceLine(answerText, ["timeline", "milestone", "meeting", "commit"], "The AI captured availability or next-step signal from the interview.")
      }
    ]
  };
}
