const STROKE_DISTANCE = 32;
const STROKE_DURATION = 180;
const SHAKE_WINDOW = 540;

type Sample = { x: number; y: number; time: number };

export function createSchollyShakeDetector(start: Sample) {
  let pivot = start;
  let extreme = start;
  let axis: "x" | "y" | undefined;
  let direction = 0;
  let lastStroke: number | undefined;
  let strokes = 0;

  return (sample: Sample) => {
    if (sample.time - extreme.time > STROKE_DURATION) {
      pivot = extreme = sample;
      axis = undefined;
      direction = strokes = 0;
      lastStroke = undefined;
      return false;
    }

    const dx = sample.x - pivot.x;
    const dy = sample.y - pivot.y;
    if (!axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < STROKE_DISTANCE) return false;
      axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }

    const delta = sample[axis] - pivot[axis];
    if (!direction && Math.abs(delta) >= STROKE_DISTANCE) {
      direction = Math.sign(delta);
      extreme = sample;
      strokes = 1;
      lastStroke = sample.time;
      return false;
    }

    if ((sample[axis] - extreme[axis]) * direction >= 0) {
      extreme = sample;
      return false;
    }

    if (Math.abs(sample[axis] - extreme[axis]) < STROKE_DISTANCE) return false;

    strokes = lastStroke !== undefined && sample.time - lastStroke <= STROKE_DURATION ? strokes + 1 : 1;
    lastStroke = sample.time;
    direction *= -1;
    const withinWindow = sample.time - pivot.time <= SHAKE_WINDOW;
    extreme = sample;
    if (strokes < 4 && withinWindow) return false;

    const shook = strokes >= 4 && withinWindow;
    pivot = sample;
    strokes = 1;
    return shook;
  };
}
