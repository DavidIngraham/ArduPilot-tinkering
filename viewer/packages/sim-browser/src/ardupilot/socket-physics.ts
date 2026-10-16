/** Emscripten's standard POSIX UDP emulation, with the local FDM as its peer.
 * The firmware still uses unmodified SIM_JSON sendto/recvfrom calls. */
export function connectPhysicsSocket(
  module: any,
  respond: (packet: Uint8Array) => string,
) {
  const ops = module.SOCKFS?.websocket_sock_ops;
  if (!ops)
    throw Error("Firmware is missing the Emscripten SOCKFS runtime export");
  const original = ops.sendmsg;
  const encoder = new TextEncoder();
  ops.sendmsg = function (
    socket: any,
    buffer: ArrayBuffer | ArrayBufferView,
    offset: number,
    length: number,
    address: string,
    port: number,
  ) {
    if (socket.type !== 2 || address !== "127.0.0.1" || port !== 9002)
      return original.call(this, socket, buffer, offset, length, address, port);
    const bytes = ArrayBuffer.isView(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length)
      : new Uint8Array(buffer, offset, length);
    // Copy before stepping physics: its WASM calls may grow their own memory.
    const data = encoder.encode(respond(bytes.slice()));
    socket.recv_queue.push({ addr: address, port, data });
    return length;
  };
  return () => {
    ops.sendmsg = original;
  };
}
