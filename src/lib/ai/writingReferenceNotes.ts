import "server-only";

// These are independently written teaching notes. Original applications, identities,
// admissions decisions and numerical scores are never sent to the model.
const writingReferences = [
  {
    kind: "personal_statement",
    title: "The Secret Ingredient is Connection",
    source: "https://apply.jhu.edu/hopkins-insider/the-secret-ingredient-is-connection/",
    criterion: "Show how you work with others through a specific interaction in a sustained activity.",
  },
  {
    kind: "personal_statement",
    title: "Developing Roots",
    source: "https://apply.jhu.edu/hopkins-insider/developing-roots/",
    criterion: "Tie the essay’s central image to concrete experiences and explain how they shaped your values.",
  },
  {
    kind: "personal_statement",
    title: "The Two Sides of America",
    source: "https://apply.jhu.edu/hopkins-insider/the-two-sides-of-america/",
    criterion: "If comparing communities or settings, focus on the responsibilities and choices that changed your perspective.",
  },
  {
    kind: "personal_statement",
    title: "Clean Closet",
    source: "https://apply.jhu.edu/hopkins-insider/clean-closet/",
    criterion: "When starting from an everyday event, explain how it changed a later choice or action.",
  },
  {
    kind: "personal_statement",
    title: "In the Belly of the Ship",
    source: "https://apply.jhu.edu/hopkins-insider/in-the-belly-of-the-ship/",
    criterion: "Connect a setback to your response and the initiative or change that followed.",
  },
  {
    kind: "sop",
    title: "MIT EECS Communication Lab annotated example 1",
    source: "https://mitcommlab.mit.edu/eecs/wp-content/uploads/sites/6/2016/09/CS-grad-school-personal-statement-annotated-example.pdf",
    criterion: "For relevant research, connect the question, your individual contribution, and the documented outcome.",
  },
  {
    kind: "sop",
    title: "MIT EECS Communication Lab annotated example 2",
    source: "https://mitcommlab.mit.edu/eecs/wp-content/uploads/sites/6/2016/09/EE-grad-school-personal-statement-annotated-example.pdf",
    criterion: "State a specific research interest and use prior work to explain why the next step fits.",
  },
  {
    kind: "sop",
    title: "MIT EECS Communication Lab annotated example 3",
    source: "https://mitcommlab.mit.edu/eecs/wp-content/uploads/sites/6/2016/09/CS-grad-school-personal-statement-annotated-example-2.pdf",
    criterion: "Link different experiences through a research question instead of listing them as disconnected achievements.",
  },
] as const;

export function writingReferenceNotes(kind: string): string {
  const references = writingReferences.filter((reference) => reference.kind === kind);
  if (!references.length) return "";
  return [
    "Use only the applicable writing criteria below. Do not treat them as requirements, applicant facts, admission signals, or text to reproduce. Follow the actual prompt.",
    ...references.map(({ criterion }) => criterion),
  ].join(" ");
}
