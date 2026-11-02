import "server-only";
// Live-data connectors. READ is real (MQTT via mqtt.js, Modbus/TCP via raw socket FC3, OPC UA via an HTTP/REST gateway).
// WRITE is never autonomous: every write needs an operator approval token (see approvals.ts) AND SCADA_ALLOW_WRITES=1.
// Why: a web app + LLM is not SIL-rated (IEC 61511/61508). The plant's SIS stays the final authority; the app only advises.
import net from "node:net";
import type { TagId } from "./model";
export type Kind = "sim" | "mqtt" | "opcua" | "modbus";
export interface Connector { id: string; kind: Kind; readOnly: boolean; read(tags: TagId[]): Promise<Partial<Record<TagId, number>>>; write?(tag: TagId, value: number): Promise<void>; }
type Map = Partial<Record<TagId, string>>; // tag -> topic | register | nodeId
const parseMap = (env?: string): Map => { try { return env ? JSON.parse(env) : {}; } catch { return {}; } };
const writesAllowed = () => process.env.SCADA_ALLOW_WRITES === "1";
export function mqttConnector(url = process.env.MQTT_URL, map: Map = parseMap(process.env.MQTT_TAG_MAP)): Connector {
  return { id: "mqtt", kind: "mqtt", readOnly: !writesAllowed(), async read(tags) {
    if (!url) throw new Error("MQTT_URL not set (e.g. mqtts://broker:8883). Map tags with MQTT_TAG_MAP='{\"SEP1_P\":\"plant/SEP1/P\"}'");
    const mqtt = await import("mqtt"); const c = await mqtt.connectAsync(url, { username: process.env.MQTT_USER, password: process.env.MQTT_PASS, connectTimeout: 5000, reconnectPeriod: 0 });
    const want = tags.filter((t) => map[t]); const out: Partial<Record<TagId, number>> = {};
    try {
      await new Promise<void>((res) => { const t = setTimeout(res, 2500); c.on("message", (topic, msg) => { const tag = want.find((w) => map[w] === topic); const v = Number(String(msg).match(/-?\d+(\.\d+)?/)?.[0]); if (tag && Number.isFinite(v)) out[tag] = v; if (Object.keys(out).length === want.length) { clearTimeout(t); res(); } }); c.subscribe(want.map((w) => map[w]!)); });
    } finally { await c.endAsync().catch(() => null); }
    return out;
  }, async write(tag, value) { if (!writesAllowed()) throw new Error("writes disabled"); const mqtt = await import("mqtt"); const c = await mqtt.connectAsync(url!, { username: process.env.MQTT_USER, password: process.env.MQTT_PASS, reconnectPeriod: 0 }); await c.publishAsync(`${map[tag]}/sp`, String(value), { qos: 1 }); await c.endAsync(); } };
}
/** Minimal Modbus/TCP FC3 (read holding registers). Values scaled by MODBUS_SCALE (default 10). */
export function modbusRead(host: string, port: number, unit: number, addr: number, count: number): Promise<number[]> {
  return new Promise((res, rej) => {
    const s = net.connect({ host, port, timeout: 4000 }); const tid = Math.floor(Math.random() * 65535);
    const pdu = Buffer.alloc(12); pdu.writeUInt16BE(tid, 0); pdu.writeUInt16BE(0, 2); pdu.writeUInt16BE(6, 4); pdu.writeUInt8(unit, 6); pdu.writeUInt8(3, 7); pdu.writeUInt16BE(addr, 8); pdu.writeUInt16BE(count, 10);
    let buf = Buffer.alloc(0);
    s.on("connect", () => s.write(pdu)); s.on("timeout", () => { s.destroy(); rej(new Error("modbus timeout")); }); s.on("error", rej);
    s.on("data", (d) => { buf = Buffer.concat([buf, d]); if (buf.length >= 9) { if (buf[7] & 0x80) { s.destroy(); return rej(new Error(`modbus exception ${buf[8]}`)); } const n = buf[8]; if (buf.length >= 9 + n) { s.destroy(); res(Array.from({ length: n / 2 }, (_, i) => buf.readInt16BE(9 + i * 2))); } } });
  });
}
export function modbusConnector(target = process.env.MODBUS_HOST, map: Map = parseMap(process.env.MODBUS_TAG_MAP)): Connector {
  return { id: "modbus", kind: "modbus", readOnly: true, async read(tags) {
    if (!target) throw new Error("MODBUS_HOST not set (host:port of an on-site gateway — never expose Modbus/TCP to the internet). Map: MODBUS_TAG_MAP='{\"SEP1_P\":\"0\"}' (0-based holding register)");
    const [host, port = "502"] = target.split(":"); const scale = Number(process.env.MODBUS_SCALE ?? 10); const out: Partial<Record<TagId, number>> = {};
    for (const t of tags) if (map[t] !== undefined) { const [v] = await modbusRead(host, +port, Number(process.env.MODBUS_UNIT ?? 1), Number(map[t]), 1); out[t] = v / scale; }
    return out;
  } };
}
/** OPC UA via a REST gateway (node-opcua needs long-lived sockets — run it on-site, e.g. Node-RED/Kepware IoT Gateway). GET {url}/read?nodeId=… → {value} */
export function opcuaConnector(url = process.env.OPCUA_GATEWAY_URL, map: Map = parseMap(process.env.OPCUA_TAG_MAP)): Connector {
  return { id: "opcua", kind: "opcua", readOnly: true, async read(tags) {
    if (!url) throw new Error("OPCUA_GATEWAY_URL not set. Map: OPCUA_TAG_MAP='{\"SEP1_P\":\"ns=2;s=SEP1.P\"}'");
    const out: Partial<Record<TagId, number>> = {};
    await Promise.all(tags.filter((t) => map[t]).map(async (t) => { const r = await fetch(`${url.replace(/\/$/, "")}/read?nodeId=${encodeURIComponent(map[t]!)}`, { headers: process.env.OPCUA_GATEWAY_TOKEN ? { authorization: `Bearer ${process.env.OPCUA_GATEWAY_TOKEN}` } : {}, signal: AbortSignal.timeout(4000) }); const j = await r.json(); const v = Number(j.value ?? j.Value ?? j.v); if (Number.isFinite(v)) out[t] = v; }));
    return out;
  } };
}
export const CONNECTORS = { mqtt: mqttConnector, opcua: opcuaConnector, modbus: modbusConnector };
export const connectorStatus = () => ({ sim: true, mqtt: !!process.env.MQTT_URL, opcua: !!process.env.OPCUA_GATEWAY_URL, modbus: !!process.env.MODBUS_HOST, writes: writesAllowed() });
