import definitions from "../../../../generated/mavlink/dialect.json";
type Definition = {
  id: number;
  crc: number;
  length: number;
  fields: (string | number)[][];
};
export type Values = Record<string, number | string | number[]>;
export interface Message {
  name: string;
  values: Values;
  system: number;
  component: number;
}
const dialect = definitions as Record<string, Definition>;
const byId = new Map(
  Object.entries(dialect).map(([name, d]) => [d.id, { name, ...d }]),
);
const methods: Record<string, [string, number]> = {
  float: ["Float32", 4],
  double: ["Float64", 8],
  uint8_t: ["Uint8", 1],
  int8_t: ["Int8", 1],
  uint16_t: ["Uint16", 2],
  int16_t: ["Int16", 2],
  uint32_t: ["Uint32", 4],
  int32_t: ["Int32", 4],
  uint64_t: ["BigUint64", 8],
  int64_t: ["BigInt64", 8],
};
export function crc(bytes: Uint8Array, extra: number) {
  let value = 0xffff;
  for (const b of [...bytes, extra]) {
    let t = b ^ (value & 255);
    t ^= (t << 4) & 255;
    value = ((value >> 8) ^ (t << 8) ^ (t << 3) ^ (t >> 4)) & 65535;
  }
  return value;
}
export class MAVLink {
  private seq = 0;
  private pending = new Uint8Array(0);
  encode(name: string, values: Values = {}) {
    const d = dialect[name];
    if (!d) throw Error(`Unknown MAVLink message ${name}`);
    const packet = new Uint8Array(d.length + 12),
      view = new DataView(packet.buffer, 10, d.length);
    for (const [n, t, o, c] of d.fields) {
      const value = values[n] ?? 0,
        offset = Number(o),
        count = Number(c),
        type = String(t);
      if (type === "char") {
        const s = String(value === 0 ? "" : value);
        for (let i = 0; i < Math.min(count, s.length); i++)
          view.setUint8(offset + i, s.charCodeAt(i));
        continue;
      }
      const [method, size] = methods[type];
      for (let i = 0; i < count; i++) {
        let v = Array.isArray(value) ? (value[i] ?? 0) : Number(value);
        (view as any)[`set${method}`](
          offset + i * size,
          method.startsWith("Big") ? BigInt(v) : v,
          true,
        );
      }
    }
    packet.set([
      253,
      d.length,
      0,
      0,
      this.seq++ & 255,
      255,
      190,
      d.id & 255,
      (d.id >> 8) & 255,
      d.id >> 16,
    ]);
    const checksum = crc(packet.subarray(1, 10 + d.length), d.crc);
    packet[10 + d.length] = checksum & 255;
    packet[11 + d.length] = checksum >> 8;
    return packet;
  }
  feed(chunk: Uint8Array): Message[] {
    const all = new Uint8Array(this.pending.length + chunk.length);
    all.set(this.pending);
    all.set(chunk, this.pending.length);
    const out: Message[] = [];
    let p = 0;
    while (p < all.length) {
      const v2 = all[p] === 253;
      if (!v2 && all[p] !== 254) {
        p++;
        continue;
      }
      const header = v2 ? 10 : 6;
      if (all.length - p < header) break;
      const length = all[p + 1],
        total = header + length + 2 + (v2 && all[p + 2] & 1 ? 13 : 0);
      if (all.length - p < total) break;
      const id = v2
          ? all[p + 7] | (all[p + 8] << 8) | (all[p + 9] << 16)
          : all[p + 5],
        d = byId.get(id);
      if (!d) {
        p += total;
        continue;
      }
      const expected =
        all[p + header + length] | (all[p + header + length + 1] << 8);
      if (crc(all.subarray(p + 1, p + header + length), d.crc) !== expected) {
        p++;
        continue;
      }
      const payload = new Uint8Array(d.length);
      payload.set(
        all.subarray(p + header, p + header + Math.min(length, d.length)),
      );
      const view = new DataView(payload.buffer),
        values: Values = {};
      for (const [n, t, o, c] of d.fields) {
        const offset = Number(o),
          count = Number(c),
          type = String(t);
        if (type === "char") {
          values[n] = new TextDecoder()
            .decode(payload.subarray(offset, offset + count))
            .split("\0")[0];
          continue;
        }
        const [method, size] = methods[type],
          a = [];
        for (let i = 0; i < count; i++)
          a.push(
            Number((view as any)[`get${method}`](offset + i * size, true)),
          );
        values[n] = count === 1 ? a[0] : a;
      }
      out.push({
        name: d.name,
        values,
        system: all[p + (v2 ? 5 : 3)],
        component: all[p + (v2 ? 6 : 4)],
      });
      p += total;
    }
    this.pending = all.slice(p);
    return out;
  }
}
