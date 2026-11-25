import assert from "node:assert/strict";
import { institutionScholarshipMatch } from "../src/lib/institutionScholarship";
import { resolvedUsdScholarshipAmount } from "../src/lib/usdCosts";

const lse = { id: 76, name: "London School of Economics and Political Science (LSE)", shortName: "LSE", country: "United Kingdom" };
assert.equal(institutionScholarshipMatch({ universityId: 76 }, lse), true);
assert.equal(institutionScholarshipMatch({ universityId: 87, provider: lse.name, country: lse.country }, lse), false);
assert.equal(institutionScholarshipMatch({ provider: "London School of Economics and Political Science", country: "Buyuk Britaniya" }, lse), true);
assert.equal(institutionScholarshipMatch({ provider: "LSE", country: "United Kingdom" }, lse), true);
assert.equal(institutionScholarshipMatch({ provider: "Pohang University of Science and Technology", country: "South Korea" }, lse), false);
assert.equal(institutionScholarshipMatch({ provider: "Kazakhstan Ministry of Science & Higher Education", country: "Kazakhstan" }, lse), false);
assert.equal(institutionScholarshipMatch({ provider: "University of Oxford", country: "United Kingdom" }, lse), false);
assert.equal(institutionScholarshipMatch({ provider: "UK Government", country: "United Kingdom" }, lse), false);
assert.equal(resolvedUsdScholarshipAmount({ awardAmount: 24960, awardCurrency: "GBP", amountUsdValue: 24960 }), null);
console.log("9 institution scope and currency regression checks passed");
