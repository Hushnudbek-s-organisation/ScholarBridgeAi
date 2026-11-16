// Practice vocabulary for academic reading and writing. The answer key stays
// on the server and each mission gets a stable exercise that survives reloads.
const vocabulary = [
  ["assess", "judge the quality or value of something"],
  ["allocate", "set aside resources for a purpose"],
  ["coherent", "logical and easy to follow"],
  ["compile", "collect information in one place"],
  ["convey", "communicate an idea or feeling"],
  ["decline", "become smaller or less"],
  ["derive", "obtain something from a source"],
  ["diverse", "including many different types"],
  ["explicit", "stated clearly and directly"],
  ["fluctuate", "rise and fall irregularly"],
  ["imply", "suggest something without saying it directly"],
  ["incentive", "something that encourages an action"],
  ["integrate", "combine things into a whole"],
  ["maintain", "keep something at its current level"],
  ["mitigate", "make a problem less severe"],
  ["notable", "important enough to attract attention"],
  ["obtain", "get or acquire something"],
  ["plausible", "reasonable enough to be believed"],
  ["predominant", "more common or influential than the others"],
  ["proportion", "a share of a larger whole"],
  ["restrict", "put a limit on something"],
  ["sustain", "make something continue over time"],
  ["transition", "a change from one state to another"],
  ["viable", "capable of working successfully"],
] as const;

export interface SchollyIeltsExercise {
  words: { word: string; definition: string }[];
  questions: { word: string; options: readonly string[] }[];
}

function exerciseFor(day: string, target: number) {
  const dayIndex = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  if (!Number.isFinite(dayIndex) || !Number.isInteger(target) || target < 1 || target > 7) return [];
  const start = ((dayIndex * 7) % vocabulary.length + vocabulary.length) % vocabulary.length;
  return Array.from({ length: target }, (_, i) => {
    const [word, definition] = vocabulary[(start + i) % vocabulary.length];
    const options: string[] = [
      vocabulary[(start + i + 8) % vocabulary.length][1],
      vocabulary[(start + i + 15) % vocabulary.length][1],
    ];
    const correctIndex = (start + i) % 3;
    options.splice(correctIndex, 0, definition);
    return { word, definition, options, correctIndex };
  });
}

export function publicIeltsExercise(day: string, target: number): SchollyIeltsExercise {
  const exercise = exerciseFor(day, target);
  return {
    words: exercise.map(({ word, definition }) => ({ word, definition })),
    questions: exercise.map(({ word, options }) => ({ word, options })),
  };
}

export function gradeIeltsExercise(day: string, target: number, answers: unknown): number | null {
  const exercise = exerciseFor(day, target);
  if (!exercise.length || !Array.isArray(answers) || answers.length !== exercise.length) return null;
  let correct = 0;
  for (const [index, question] of exercise.entries()) {
    const answer: unknown = answers[index];
    if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) return null;
    if (answer === question.correctIndex) correct++;
  }
  return correct;
}
