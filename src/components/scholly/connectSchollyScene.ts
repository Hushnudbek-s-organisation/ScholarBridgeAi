import type { SceneFrame, SceneRequest, SceneStatus, createSchollyScene } from "./SchollyScene";

export function connectSchollyScene(canvas: HTMLCanvasElement, pixelRatio: number, onStatus: (status: SceneStatus) => void, useWorker = true) {
  if (useWorker && typeof Worker === "function" && typeof canvas.transferControlToOffscreen === "function") {
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL("./SchollyWorker.ts", import.meta.url), { type: "module", name: "scholly-3d" });
      const surface = canvas.transferControlToOffscreen();
      const activeWorker = worker;
      const send = (message: SceneRequest) => activeWorker.postMessage(message);
      let drawing = false;
      let queuedFrame: SceneFrame | undefined;
      function draw(frame: SceneFrame) {
        if (drawing) {
          queuedFrame = frame;
          return;
        }
        drawing = true;
        send({ type: "draw", frame });
      }
      activeWorker.onmessage = ({ data }: MessageEvent<SceneStatus>) => {
        if (data === "rendered") {
          drawing = false;
          const next = queuedFrame;
          queuedFrame = undefined;
          if (next) draw(next);
        } else if (data === "lost") {
          drawing = false;
          queuedFrame = undefined;
        }
        onStatus(data);
      };
      activeWorker.onerror = event => {
        event.preventDefault();
        onStatus("failed");
      };
      activeWorker.postMessage({ type: "init", canvas: surface, pixelRatio } satisfies SceneRequest, [surface]);
      return {
        worker: true,
        draw,
        resize: (width: number, height: number) => send({ type: "resize", width, height }),
        dispose: () => activeWorker.terminate(),
      };
    } catch {
      worker?.terminate();
    }
  }

  // Devices without transferable canvases use the same scene with idle scheduling.
  let disposed = false;
  let scene: ReturnType<typeof createSchollyScene> | undefined;
  void import("./SchollyScene").then(async ({ createSchollyScene }) => {
    if (disposed) return;
    scene = createSchollyScene(canvas, pixelRatio, onStatus);
    await scene.compile();
    if (!disposed) onStatus("ready");
  }).catch(() => { if (!disposed) onStatus("failed"); });
  return {
    worker: false,
    draw(frame: SceneFrame) {
      try {
        scene?.draw(frame);
        if (scene) onStatus("rendered");
      } catch {
        onStatus("failed");
      }
    },
    resize: (width: number, height: number) => scene?.resize(width, height),
    dispose() {
      disposed = true;
      scene?.dispose();
    },
  };
}
