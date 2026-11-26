import { createSchollyScene, type SceneRequest, type SceneStatus } from "./SchollyScene";

let scene: ReturnType<typeof createSchollyScene> | undefined;
const status = (value: SceneStatus) => self.postMessage(value);

self.addEventListener("message", async ({ data }: MessageEvent<SceneRequest>) => {
  try {
    if (data.type === "init") {
      scene = createSchollyScene(data.canvas, data.pixelRatio, status);
      await scene.compile();
      status("ready");
    } else if (data.type === "resize") {
      scene?.resize(data.width, data.height);
    } else if (scene) {
      scene.draw(data.frame);
      status("rendered");
    }
  } catch {
    status("failed");
  }
});
