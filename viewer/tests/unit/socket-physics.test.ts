import test from "node:test";
import assert from "node:assert/strict";
import { connectPhysicsSocket } from "@microagu/sim-browser/ardupilot/socket-physics";

test("local physics socket preserves datagrams and delegates other traffic", () => {
  const delegated: unknown[][] = [];
  const original = (...args: unknown[]) => {
    delegated.push(args);
    return 7;
  };
  const ops = { sendmsg: original };
  let received: Uint8Array | undefined;
  const disconnect = connectPhysicsSocket(
    { SOCKFS: { websocket_sock_ops: ops } },
    (packet) => {
      received = packet;
      return '\n{"timestamp":1}\n';
    },
  );
  const socket = { type: 2, recv_queue: [] as any[] };
  const backing = new Uint8Array([99, 88, 1, 2, 3, 77]);
  const slice = backing.subarray(1, 5);
  assert.equal(ops.sendmsg(socket, slice, 1, 3, "127.0.0.1", 9002), 3);
  assert.deepEqual(received, new Uint8Array([1, 2, 3]));
  backing.fill(0);
  assert.deepEqual(received, new Uint8Array([1, 2, 3]));
  assert.equal(socket.recv_queue.length, 1);
  assert.equal(
    new TextDecoder().decode(socket.recv_queue[0].data),
    '\n{"timestamp":1}\n',
  );
  assert.equal(socket.recv_queue[0].port, 9002);
  assert.equal(socket.recv_queue[0].addr, "127.0.0.1");
  assert.equal(ops.sendmsg(socket, slice, 0, 1, "127.0.0.1", 9003), 7);
  assert.equal(delegated.length, 1);
  assert.equal(socket.recv_queue.length, 1);
  disconnect();
  assert.equal(ops.sendmsg, original);
});

test("missing socket runtime fails explicitly", () => {
  assert.throws(() => connectPhysicsSocket({}, () => ""), /SOCKFS/);
});
