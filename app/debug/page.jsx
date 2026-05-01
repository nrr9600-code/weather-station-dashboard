"use client";

import { useEffect, useMemo, useState } from "react";

const OMAN_TZ = "Asia/Muscat";

function fmt(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

function fmtTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-OM", {
    timeZone: OMAN_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function age(value) {
  if (!value) return "--";
  const sec = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.round(min / 60)}h`;
}

export default function DebugPage() {
  const [rows, setRows] = useState([]);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/history?hours=${hours}&limit=300`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(JSON.stringify(data.error));
      setRows([...(data.rows || [])].reverse());
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load debug data");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [hours]);

  const latest = rows[0];
  const summary = useMemo(() => {
    if (!latest) return [];
    return [
      ["Last cloud insert", fmtTime(latest.created_at)],
      ["Station device time", fmtTime(latest.device_time)],
      ["Data age", age(latest.created_at)],
      ["Route", latest.route],
      ["Firmware", latest.firmware_version],
      ["Packet", latest.packet_number],
      ["Boot ID", latest.boot_id],
      ["WiFi RSSI", latest.rssi],
      ["LoRa RSSI/SNR", latest.lora_rssi ? `${latest.lora_rssi} / ${latest.lora_snr}` : "--"],
      ["Free heap", latest.free_heap],
      ["Queue count", latest.queue_count],
      ["Sensor flags", `BME:${latest.bme_ok} PMS:${latest.pms_ok} INA:${latest.ina_ok} MT:${latest.mt6701_ok} LoRa:${latest.lora_ok} WiFi:${latest.wifi_ok}`],
    ];
  }, [latest]);

  return (
    <main>
      <style>{css}</style>
      <header>
        <div>
          <p className="kicker">Debug</p>
          <h1>Debug</h1>
          <p>Technical station logs, timestamps, routing, and firmware health.</p>
        </div>
        <a href="/">← Public dashboard</a>
      </header>

      <section className="controls">
        <button onClick={() => setHours(6)} className={hours === 6 ? "active" : ""}>6h</button>
        <button onClick={() => setHours(24)} className={hours === 24 ? "active" : ""}>24h</button>
        <button onClick={() => setHours(168)} className={hours === 168 ? "active" : ""}>7d</button>
        <button onClick={load}>Refresh</button>
      </section>

      {error && <section className="error">{error}</section>}

      <section className="summary">
        {summary.map(([k, v]) => (
          <div key={k}>
            <strong>{k}</strong>
            <span>{fmt(v)}</span>
          </div>
        ))}
      </section>

      <section className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Device time</th>
              <th>Route</th>
              <th>Packet</th>
              <th>Temp</th>
              <th>PM2.5</th>
              <th>Battery</th>
              <th>Current</th>
              <th>RSSI</th>
              <th>Heap</th>
              <th>Queue</th>
              <th>Firmware</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{fmtTime(r.created_at)}</td>
                <td>{fmtTime(r.device_time)}</td>
                <td>{fmt(r.route)}</td>
                <td>{fmt(r.packet_number)}</td>
                <td>{fmt(r.temperature)}</td>
                <td>{fmt(r.pm2_5)}</td>
                <td>{fmt(r.battery_voltage)} V / {fmt(r.battery_percent)}%</td>
                <td>{fmt(r.battery_current)} mA</td>
                <td>{fmt(r.rssi)}</td>
                <td>{fmt(r.free_heap)}</td>
                <td>{fmt(r.queue_count)}</td>
                <td>{fmt(r.firmware_version)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const css = `
body { background:#07111f; color:#e5eef8; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
main { max-width: 1280px; margin: 0 auto; padding: 24px; }
header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:18px; }
h1 { margin:0; font-size:36px; }
p { margin:4px 0; color:#94a3b8; }
.kicker { text-transform:uppercase; letter-spacing:.15em; color:#38bdf8; font-size:12px; font-weight:900; }
a { color:#93c5fd; text-decoration:none; font-weight:800; }
.controls { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
button { border:1px solid #334155; background:#111f34; color:#dbeafe; border-radius:10px; padding:8px 12px; cursor:pointer; }
button.active { background:#2563eb; border-color:#60a5fa; }
.error { background:#451a1a; color:#fecaca; border:1px solid #991b1b; padding:12px; border-radius:12px; margin-bottom:14px; }
.summary { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; margin-bottom:16px; }
.summary div { background:#0f1b2d; border:1px solid #23344f; border-radius:14px; padding:12px; min-height:74px; }
.summary strong { display:block; color:#93c5fd; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
.summary span { display:block; margin-top:6px; color:#e5eef8; overflow-wrap:anywhere; }
.tableWrap { overflow:auto; background:#0f1b2d; border:1px solid #23344f; border-radius:16px; }
table { border-collapse:collapse; width:100%; min-width:1100px; }
th, td { padding:10px 12px; border-bottom:1px solid #23344f; text-align:left; font-size:13px; white-space:nowrap; }
th { color:#93c5fd; background:#101f35; position:sticky; top:0; }
td { color:#dce8f5; }
tr:hover td { background:#132540; }
@media (max-width:900px) { .summary { grid-template-columns: repeat(2,minmax(0,1fr)); } header { flex-direction:column; } }
@media (max-width:560px) { main { padding:14px; } .summary { grid-template-columns:1fr; } }
`;
