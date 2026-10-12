/** Pure application-list projections shared by dashboards and trackers. */
export interface ApplicationSummary {
  total: number;
  preparing: number;
  submitted: number;
  decision: number;
}

export interface ApplicationSummaryRow {
  id: number;
  submittedAt: unknown;
}

export interface OfferSummaryRow {
  applicationId: number;
  status: string;
}

/**
 * Decisions are counted per application (not per offer row). A pending offer
 * is not a decision; duplicate offer rows cannot inflate the count.
 */
export function summarizeApplications(
  applications: readonly ApplicationSummaryRow[],
  offers: readonly OfferSummaryRow[]
): ApplicationSummary {
  const decidedIds = new Set(
    offers
      .filter((offer) => offer.status !== "pending")
      .map((offer) => offer.applicationId)
  );
  const submitted = applications.filter((application) => !!application.submittedAt).length;
  return {
    total: applications.length,
    preparing: applications.length - submitted,
    submitted,
    decision: applications.filter((application) => decidedIds.has(application.id)).length,
  };
}
