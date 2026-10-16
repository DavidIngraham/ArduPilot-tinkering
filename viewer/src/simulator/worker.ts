import { Simulator } from "./runtime";
const sim = new Simulator();
const send = (kind: string, data: unknown) => postMessage({ kind, data });
let lastUpdate = 0;
sim.onUpdate = () => {
  if (performance.now() - lastUpdate >= 40) {
    lastUpdate = performance.now();
    send("state", sim.state);
  }
};
sim.onTruth = (frame) => send("truth", frame);
sim.onLog = (text) => send("log", text);
sim.onError = (text) => send("error", text);
self.onmessage = async ({ data }) => {
  const { id, method, args } = data;
  try {
    switch (method) {
      case "start":
        await sim.start(args[0]);
        send("trimThrottle", sim.physics.config.command[0]);
        break;
      case "controls":
        sim.controls(...(args as [number, number, number]));
        return;
      case "mode":
        await sim.mode(args[0]);
        break;
      case "wind":
        sim.physics.setWind(args[0], args[1], args[2]);
        break;
      case "launch":
        await sim.launch(args[0]);
        break;
      case "upload":
        await sim.upload(args[0], (n) => send("progress", n));
        break;
      case "execute":
        await sim.execute();
        break;
      default:
        throw Error("Unknown simulator worker request");
    }
    postMessage({ id, ok: true });
  } catch (e) {
    postMessage({
      id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};
