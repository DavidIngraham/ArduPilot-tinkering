import { test } from "node:test";
import assert from "node:assert/strict";
import { Scope } from "@microagu/applet-ui/shell/scope";
import { SimulatorClient } from "@microagu/sim-browser/worker/client";
import { flightPose } from "@microagu/playback/pose";

test("scope removes listeners, cancels frames and disposes resources exactly once", () => {
  const saved = [
    globalThis.requestAnimationFrame,
    globalThis.cancelAnimationFrame,
  ] as const;
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0,
    events = 0,
    disposed = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++next, callback);
    return next;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  try {
    const scope = new Scope(),
      target = new EventTarget();
    scope.listen(target, "change", () => events++);
    scope.requestFrame(() => events++);
    scope.own({
      dispose() {
        disposed++;
      },
    });
    target.dispatchEvent(new Event("change"));
    scope.dispose();
    scope.dispose();
    target.dispatchEvent(new Event("change"));
    assert.equal(events, 1);
    assert.equal(disposed, 1);
    assert.equal(frames.size, 0);
    assert.equal(scope.resourceCount, 0);
    scope.own({
      dispose() {
        disposed++;
      },
    });
    assert.equal(disposed, 2);
  } finally {
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = saved;
  }
});

test("disposing a simulator rejects pending RPCs and terminates its worker", async () => {
  const original = globalThis.Worker;
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    sent: any[] = [];
    terminated = false;
    constructor() {
      workers.push(this);
    }
    postMessage(value: unknown) {
      this.sent.push(value);
    }
    terminate() {
      this.terminated = true;
    }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  try {
    const home = { lat: 45, lon: -121, alt: 600 },
      client = new SimulatorClient(home, "https://example.com/viewer/");
    const start = client.start();
    assert.equal(workers[0].sent[0].method, "start");
    client.dispose();
    await assert.rejects(start, /disposed/);
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[0].onmessage, null);
    client.controls(1, 1, 1);
    assert.equal(workers[0].sent.length, 1);
    await assert.rejects(client.mode("AUTO"), /disposed/);
    const second = new SimulatorClient(home, "https://example.com/viewer/"),
      ready = second.start();
    workers[1].onmessage!({ data: { kind: "reply", id: 1, ok: true } });
    await ready;
    assert.equal(workers.length, 2);
    second.dispose();
  } finally {
    globalThis.Worker = original;
  }
});

test("measured flight poses never invent canopy truth or rotor measurements", () => {
  const pose = flightPose({
    t: 1,
    p: [1, 2, 3],
    q: [0, 0, 0, 1],
    mode: "MANUAL",
    pwm: [1500, 1500, 1500],
    command: [0, 0, 0],
    limits: [],
    valid: true,
  });
  assert.equal(pose.canopy, null);
  assert.equal(pose.rpm, null);
  assert.equal(pose.inflation, null);
});
