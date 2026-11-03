/** GOV.UK pages manually read 2026-11-03. GBP amounts are native fees,
 * not live exchange rates or a guarantee that every applicant owes them.
 */
export const UK_STUDENT_VISA_FACTS = {
  checkedOn: "2026-11-03",
  applicationFeeGbp: 558,
  ihsPerYearGbp: 776,
  maintenanceMonths: 9,
  maintenanceLondonGbpPerMonth: 1529,
  maintenanceOutsideLondonGbpPerMonth: 1171,
  fundsConsecutiveDays: 28,
  statementEndWithinDays: 31,
  sources: {
    overview: "https://www.gov.uk/student-visa",
    money: "https://www.gov.uk/student-visa/money",
    ihs: "https://www.gov.uk/healthcare-immigration-application/how-much-pay",
    tb: "https://www.gov.uk/tb-test-visa",
    clinic: "https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis-testing-in-uzbekistan",
    centres: "https://www.gov.uk/find-a-visa-application-centre",
  },
} as const;
