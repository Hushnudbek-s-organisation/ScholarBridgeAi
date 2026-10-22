import assert from "node:assert/strict";
import {
  localizeUniversityRow,
  localizeProgramRow,
  localizeScholarshipRow,
} from "../src/lib/catalogLocalizer";

const unknownUniversity = {
  id: 9001,
  name: "Northbridge Institute for Molecular Systems",
  country: "Somewhere Unknown",
  city: "Unlisted City",
  sourceUrl: "https://official.example.edu",
  officialWebsiteUrl: "https://official.example.edu/admissions",
};
const localizedUnknown = localizeUniversityRow(unknownUniversity, "uz");
assert.equal(localizedUnknown.name, unknownUniversity.name, "unknown proper university name should remain canonical");
assert.equal(localizedUnknown.country, unknownUniversity.country, "unknown country should fall back verbatim");
assert.equal(localizedUnknown.sourceUrl, unknownUniversity.sourceUrl, "source URL must be preserved");
assert.equal(localizedUnknown.officialWebsiteUrl, unknownUniversity.officialWebsiteUrl, "official URL must be preserved");

const partialUniversity = { id: 9002, name: "Unlisted University", country: null, city: undefined, description: undefined, sourceUrl: "https://u.example" };
const localizedPartial = localizeUniversityRow(partialUniversity, "ru");
assert.equal(localizedPartial.name, partialUniversity.name);
assert.equal(localizedPartial.country, null);
assert.equal(localizedPartial.city, undefined);
assert.equal(localizedPartial.sourceUrl, partialUniversity.sourceUrl);

const unknownProgram = {
  id: 71,
  name: "Molecular Quantum Systems and Computation",
  field: "Unlisted interdisciplinary area",
  description: "Uncatalogued copy should remain intact.",
  programUrl: "https://u.example/program",
  sourceUrl: "https://u.example/source",
};
const localizedProgram = localizeProgramRow(unknownProgram, "uz");
assert.equal(localizedProgram.name, unknownProgram.name, "unknown programme name should not be mangled");
assert.equal((localizedProgram as typeof unknownProgram & { officialName?: string | null }).officialName, unknownProgram.name, "canonical programme name remains available");
assert.equal(localizedProgram.description, unknownProgram.description, "unknown prose should fall back verbatim");
assert.equal(localizedProgram.programUrl, unknownProgram.programUrl);
assert.equal(localizedProgram.sourceUrl, unknownProgram.sourceUrl);

const partialProgram = localizeProgramRow({ name: null, requirements: null, sourceUrl: "https://u.example/req" }, "ru");
assert.equal(partialProgram.name, null);
assert.equal(partialProgram.requirements, null);
assert.equal(partialProgram.sourceUrl, "https://u.example/req");

const unknownAward = {
  id: 13,
  title: "Northbridge Emerging Research Award",
  provider: "Unlisted Foundation",
  description: "An unknown official description.",
  requirements: undefined,
  sourceUrl: "https://award.example/official",
};
const localizedAward = localizeScholarshipRow(unknownAward, "uz");
assert.equal(localizedAward.title, unknownAward.title, "unknown scholarship title should stay intact");
assert.equal((localizedAward as typeof unknownAward & { officialTitle?: string | null }).officialTitle, unknownAward.title, "canonical scholarship title remains available");
assert.equal(localizedAward.provider, unknownAward.provider, "unknown provider should stay intact");
assert.equal(localizedAward.description, unknownAward.description, "unknown description should fall back verbatim");
assert.equal(localizedAward.requirements, undefined);
assert.equal(localizedAward.sourceUrl, unknownAward.sourceUrl, "source URL must be preserved");

console.log("Catalog localization fallback checks passed (unknown names, partial rows, and source URLs preserved).");
