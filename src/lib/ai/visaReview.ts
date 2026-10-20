import { runMercuryDecision } from "@/lib/ai/decide";
import { scoreConversationBehaviors } from "@/lib/ai/behaviorScore";

export async function reviewVisaConversation(args: {
  destination: string;
  homeCountry?: string | null;
  messages: Array<{ role: string; text: string }>;
  fundingContext?: {
    targetMajor?: string | null;
    degreeLevel?: string | null;
    budgetAnnualUsd?: number | null;
    confirmedFunding?: Array<{ name: string; kind: string; amountUsd: number }>;
  } | null;
  profileId?: number | null;
}): Promise<{
  mercury: Awaited<ReturnType<typeof runMercuryDecision>>;
  respan: Awaited<ReturnType<typeof scoreConversationBehaviors>>;
}> {
  const transcript = args.messages.map(({ role, text }) => `${role === "user" ? "Applicant" : "Officer"}: ${text.slice(0, 2000)}`).join("\n").slice(0, 48_000);
  const state = JSON.stringify({
    destination: args.destination,
    homeCountry: args.homeCountry || null,
    applicantAcademicAndFundingContext: args.fundingContext || null,
    interviewTranscript: transcript,
  });
  const [mercury, respan] = await Promise.all([
    runMercuryDecision({
      state,
      profileId: args.profileId,
      timeoutMs: 3_500,
      questions: [
        { key: "academicPurposeClarity", type: "yes_no", question: "Did the applicant state a clear, credible academic purpose for this specific university and program?" },
        { key: "financialSufficiencyCredibility", type: "yes_no", question: "Did the applicant demonstrate concrete, credible financial coverage for tuition and living costs, using the recorded budget and confirmed funding context where available?" },
        { key: "homeCountryTiesStrength", type: "yes_no", question: "Did the applicant articulate convincing post-graduation plans or ties to their home country?" },
        { key: "overallConsularReadiness", type: "yes_no", question: "Does this transcript demonstrate overall readiness for a practice student-visa interview? This is not a prediction of a real visa decision." },
      ],
    }),
    scoreConversationBehaviors({
      transcriptOrText: transcript,
      profileId: args.profileId,
      timeoutMs: 3_500,
      behaviors: [
        { key: "directAndConfident", description: "The applicant answers the officer's question directly and concisely without rambling." },
        { key: "concreteFactsAndNumbers", description: "The applicant backs up claims with specific names, figures, dates, or funding amounts." },
        { key: "hesitationOrVagueness", description: "The applicant gives vague, generic, or hesitant answers that lack personal detail." },
        { key: "contradictionRisk", description: "The applicant's statements contain internal inconsistencies or contradict their stated study plan." },
      ],
    }),
  ]);
  return { mercury, respan };
}
