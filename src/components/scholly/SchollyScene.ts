import * as T from "three";
import { createScholly, type Expression } from "./SchollyMesh";
import type { SchollyMotion } from "../useSchollyMotion";

export type SceneFrame = {
  now: number;
  since: number;
  pose: SchollyMotion;
  pressed: boolean;
  steady: boolean;
  facing: number;
  x: number;
  y: number;
  immediate: boolean;
};

export type SceneRequest =
  | { type: "init"; canvas: OffscreenCanvas; pixelRatio: number }
  | { type: "resize"; width: number; height: number }
  | { type: "draw"; frame: SceneFrame };
export type SceneStatus = "ready" | "rendered" | "lost" | "failed";

const EXPRESSIONS: Partial<Record<SchollyMotion, Expression>> = {
  happy: "happy", easter: "happy", think: "thinking", notice: "surprised", shake: "surprised",
  proud: "proud", concern: "concerned", sleep: "sleepy", celebrate: "celebrating", levelup: "celebrating",
};

export function createSchollyScene(canvas: HTMLCanvasElement | OffscreenCanvas, pixelRatio: number, onStatus: (status: SceneStatus) => void) {
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(pixelRatio, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.20;

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1.57, 1.57, 1.57, -1.57, 0.1, 35);
  camera.position.set(0, -0.169, 8);
  camera.lookAt(0, -0.169, 0);
  const model = createScholly(scene);
  const { robot, helmet, arms, faces, eyes, neutralMouth, shadow, voice } = model;

  function draw({ now, since, pose, pressed, steady, facing, x, y, immediate }: SceneFrame) {
    const time = now / 1000;
    const elapsed = Math.max(0, (now - since) / 1000);
    const happy = ["happy", "celebrate", "proud", "levelup", "easter"].includes(pose);
    const asleep = pose === "sleep";
    const thinking = pose === "think";
    const wave = pose === "wave";
    const point = pose === "point";
    const shake = pose === "shake" && !steady ? Math.sin(elapsed * 17) : 0;
    const drag = pose === "drag";
    const lean = pose === "notice" ? 0.12 * Math.sin(elapsed * 9) : 0;
    const smoothing = steady || immediate ? 1 : 0.25;
    const heading = facing + (steady ? 0 : x * (drag ? 0.25 : 0.22));
    robot.rotation.y += (heading - robot.rotation.y) * smoothing;
    helmet.rotation.y += ((steady ? 0 : x * 0.31) - helmet.rotation.y) * smoothing;
    helmet.rotation.x += ((steady ? 0 : y * 0.17 + lean) - helmet.rotation.x) * smoothing;
    helmet.rotation.z = steady ? 0 : thinking ? -0.078 : shake * 0.21;
    robot.rotation.z = steady ? 0 : shake * 0.09 + (wave ? Math.sin(elapsed * 7) * 0.052 : 0);
    robot.position.y = steady ? 0 : asleep ? -0.06 : happy ? Math.max(0, Math.sin(elapsed * 8)) * 0.12 : 0;
    robot.scale.setScalar(pressed ? 0.94 : 1);
    const expression = EXPRESSIONS[pose] ?? "neutral";
    const talking = pose === "talk";
    for (const [key, face] of faces) face.visible = key === expression;
    for (const eye of eyes) eye.scale.y = drag ? 0.13 : 1;
    if (neutralMouth) neutralMouth.visible = !talking;
    arms.forEach((arm, index) => {
      const side = index ? 1 : -1;
      const raised = ["celebrate", "levelup"].includes(pose) || (index === 1 && (wave || point));
      const flap = !steady && drag ? Math.sin(time * 21) * 0.28 : 0;
      const salute = !steady && wave && index === 1 ? Math.sin(elapsed * 19) * 0.35 : 0;
      arm.rotation.set(steady ? 0 : raised ? -0.17 : 0.10, 0, side * (raised && !steady ? 1.8 + salute : 0.62 + flap));
      if (!steady && thinking && index === 1) arm.rotation.set(-0.44, 0.20, 1.95);
      if (!steady && pose === "proud") arm.rotation.set(-0.95, side * 0.12, side * -0.67);
    });
    voice.visible = talking;
    voice.scale.y = steady ? 0.063 : 0.063 * (0.86 + Math.sin(elapsed * 17) * 0.39);
    shadow.scale.setScalar(1 + robot.position.y * 0.29);
    renderer.render(scene, camera);
  }

  function resize(width: number, height: number) {
    const aspect = width / height;
    const halfWidth = Math.max(1.52, 1.565 * aspect);
    const halfHeight = halfWidth / aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function loseContext(event: Event) {
    event.preventDefault();
    onStatus("lost");
  }
  const restoreContext = () => onStatus("ready");
  canvas.addEventListener("webglcontextlost", loseContext);
  canvas.addEventListener("webglcontextrestored", restoreContext);

  return {
    draw,
    resize,
    compile: () => renderer.compileAsync(scene, camera),
    dispose() {
      canvas.removeEventListener("webglcontextlost", loseContext);
      canvas.removeEventListener("webglcontextrestored", restoreContext);
      model.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
