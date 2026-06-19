export function buildInterviewQuestions(opportunity, application) {
  const missing = application.analysis?.missingMust || [];
  const base = [
    "What is your name, role, and company?",
    "Give us your one-minute pitch for this partnership.",
    "What value can your company bring to this opportunity?",
    "What proof, customers, or past work supports your proposal?",
    "How will your solution stay secure, scalable, and sustainable?",
    "What timeline and first milestone can you commit to?",
    "Are you open to a physical or online follow-up meeting?"
  ];

  const gapQuestions = missing.slice(0, 3).map((gap) => `Your proposal did not clearly prove "${gap}". How would you address that requirement?`);
  return [base[0], base[1], ...gapQuestions, ...base.slice(2)];
}
