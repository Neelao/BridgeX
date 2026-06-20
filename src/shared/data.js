export const seed = {
  users: [
    {
      id: "u_recruiter",
      name: "Maya Lee",
      email: "maya@northstar.co",
      role: "recruiter",
      company: "Northstar Ventures",
      linkedIn: "https://www.linkedin.com/company/northstar-ventures",
      verified: true,
      verification: { status: "verified", verifiedAt: "2025-01-01T00:00:00.000Z" }
    },
    {
      id: "u_candidate",
      name: "Aisha Tan",
      email: "aisha@greengrid.ai",
      role: "candidate",
      company: "GreenGrid Analytics",
      linkedIn: "https://www.linkedin.com/company/greengrid-analytics",
      verified: true,
      verification: { status: "verified", verifiedAt: "2025-01-01T00:00:00.000Z" }
    }
  ],
  opportunities: [
    {
      id: "opp_1",
      ownerId: "u_recruiter",
      title: "Sustainability reporting partner",
      description:
        "We need a partner to help enterprise clients automate ESG reporting, energy insights, and supplier sustainability checks.",
      mustHaves:
        "ESG reporting experience, document screening, secure enterprise data handling, APAC deployment experience",
      niceToHaves:
        "Carbon accounting, dashboard analytics, multilingual support, startup-friendly pricing",
      status: "open",
      createdAt: "2026-06-19",
      likes: ["u_mock_2", "u_mock_3"],
      comments: [
        {
          id: "cmt_1",
          userId: "u_candidate",
          userName: "Aisha Tan",
          company: "GreenGrid Analytics",
          text: "This aligns perfectly with our ESG automation roadmap — we have APAC deployment experience and carbon accounting built in.",
          createdAt: "2026-06-19"
        }
      ]
    },
    {
      id: "opp_2",
      ownerId: "u_recruiter",
      title: "APAC payments integration partner",
      description:
        "Seeking a technical partner to integrate payment rails, onboarding checks, and partner reporting for a regional B2B marketplace.",
      mustHaves:
        "API integration, fintech experience, compliance workflows, secure customer onboarding",
      niceToHaves:
        "Malaysia market knowledge, dashboard reporting, banking partner network",
      status: "open",
      createdAt: "2026-06-18",
      likes: ["u_candidate"],
      comments: [
        {
          id: "cmt_2",
          userId: "u_mock_2",
          userName: "Daniel Koh",
          company: "SecureLedger Labs",
          text: "Our compliance ledger platform handles secure onboarding and audit workflows. Very interested in exploring this.",
          createdAt: "2026-06-18"
        }
      ]
    },
    {
      id: "opp_3",
      ownerId: "u_recruiter",
      title: "Corporate innovation pilot partner",
      description:
        "Looking for startups ready to run a six-week pilot with enterprise teams across operations, customer success, or sustainability.",
      mustHaves:
        "Pilot readiness, B2B case study, dedicated implementation lead, clear success metrics",
      niceToHaves:
        "Enterprise references, training materials, regional support",
      status: "open",
      createdAt: "2026-06-17",
      likes: [],
      comments: []
    }
  ],
  candidates: [
    {
      id: "cand_1",
      userId: "u_candidate",
      name: "Aisha Tan",
      company: "GreenGrid Analytics",
      email: "aisha@greengrid.ai",
      role: "Founder",
      linkedIn: "https://www.linkedin.com/company/greengrid-analytics",
      bio: "Platform for reducing energy waste and automating ESG reporting."
    },
    {
      id: "cand_2",
      userId: "u_mock_2",
      name: "Daniel Koh",
      company: "SecureLedger Labs",
      email: "daniel@secureledger.io",
      role: "Partnership Lead",
      linkedIn: "https://www.linkedin.com/company/secureledger-labs",
      bio: "Compliance and audit workflow startup for regulated companies."
    },
    {
      id: "cand_3",
      userId: "u_mock_3",
      name: "Priya Raman",
      company: "MarketPilot",
      email: "priya@marketpilot.co",
      role: "COO",
      linkedIn: "https://www.linkedin.com/company/marketpilot",
      bio: "Go-to-market operations team for B2B startup launches."
    }
  ],
  applications: [
    {
      id: "app_1",
      opportunityId: "opp_1",
      candidateId: "cand_1",
      status: "interview-complete",
      proposalText:
        "GreenGrid Analytics automates ESG reporting by reading utility bills, invoices, and supplier documents. We already support carbon accounting workflows, energy anomaly detection, and APAC multilingual reporting. Our architecture isolates tenant data, encrypts uploads, and supports enterprise audit logs.",
      whyApply:
        "GreenGrid Analytics automates ESG reporting by reading utility bills, invoices, and supplier documents. We already support carbon accounting workflows, energy anomaly detection, and APAC multilingual reporting. Our architecture isolates tenant data, encrypts uploads, and supports enterprise audit logs.",
      resume: { name: "greengrid_pitch.pdf", kind: "Pitch deck" },
      documents: [{ name: "greengrid_pitch.pdf", kind: "Pitch deck" }],
      analysis: null,
      interview: {
        completedAt: "2026-06-19T10:30:00.000Z",
        recording: "recording-app_1.webm",
        recordingStatus: "demo-recording-ready",
        answers: [
          {
            question: "Give us your 60-second pitch for this partnership.",
            answer:
              "GreenGrid brings an ESG reporting platform that reads utility bills, supplier files, and invoices, then turns them into carbon, energy, and audit-ready reports for enterprise clients."
          },
          {
            question: "How will you keep enterprise data secure and scalable?",
            answer:
              "We isolate tenant data, encrypt uploads, keep audit logs, and deploy through a modular API workflow that can scale across APAC teams and multilingual reporting needs."
          },
          {
            question: "What proof can you share from customers or pilots?",
            answer:
              "We have delivered pilots with operations teams, reduced manual reporting time, and can commit to a six-week milestone plan with weekly measurement checkpoints."
          }
        ],
        summary: {
          score: 94,
          recommendation: "Strong fit",
          pitchSummary:
            "GreenGrid is a strong sustainability reporting partner with clear ESG automation, secure data handling, APAC readiness, and a practical pilot plan.",
          strengths: [
            "Strong ESG and carbon reporting alignment",
            "Clear enterprise security and audit-log approach",
            "Ready for a measurable six-week pilot"
          ],
          risks: ["Confirm exact customer references before final approval"],
          keyPoints: [
            { label: "Pitch clarity", value: "Explained ESG document automation and enterprise reporting clearly." },
            { label: "Proof under pressure", value: "Shared pilot delivery and manual reporting time reduction signal." },
            { label: "SSS alignment", value: "Covered secure uploads, scalable API workflow, and sustainability outcomes." }
          ],
          evidenceScore: 93,
          nextQuestions: [
            "Which enterprise client can validate the pilot results?",
            "What data fields are needed in week one?",
            "Who owns implementation from GreenGrid?"
          ],
          sss: { security: 92, scalability: 88, sustainability: 96 }
        }
      },
      meeting: null,
      invitedToInterview: true
    },
    {
      id: "app_2",
      opportunityId: "opp_1",
      candidateId: "cand_2",
      status: "interview-invited",
      proposalText:
        "SecureLedger Labs provides compliance ledgers and document approval controls. We are strong in data security, audit logs, and regulated workflow management, but we do not have direct ESG reporting deployments yet.",
      whyApply:
        "SecureLedger Labs provides compliance ledgers and document approval controls. We are strong in data security, audit logs, and regulated workflow management, but we do not have direct ESG reporting deployments yet.",
      resume: { name: "secureledger_proposal.docx", kind: "Proposal" },
      documents: [{ name: "secureledger_proposal.docx", kind: "Proposal" }],
      analysis: null,
      interview: null,
      meeting: null,
      invitedToInterview: true
    },
    {
      id: "app_3",
      opportunityId: "opp_1",
      candidateId: "cand_3",
      status: "submitted",
      proposalText:
        "MarketPilot can help with partnership launches, founder introductions, and customer discovery. We have growth strategy experience, but limited AI implementation and no carbon accounting product.",
      whyApply:
        "MarketPilot can help with partnership launches, founder introductions, and customer discovery. We have growth strategy experience, but limited AI implementation and no carbon accounting product.",
      resume: { name: "marketpilot_cv.pdf", kind: "CV" },
      documents: [{ name: "marketpilot_cv.pdf", kind: "CV" }],
      analysis: null,
      interview: null,
      meeting: null,
      invitedToInterview: false
    }
  ],
  meetings: []
};
