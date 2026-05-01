"use client";

import { useEffect, useMemo, useState } from "react";

const OMAN_TZ = "Asia/Muscat";
const EXPECTED_INTERVAL_MS = 5 * 60 * 1000;
const GAP_THRESHOLD_MS = 8 * 60 * 1000;

function isValid(v) {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) && Number(v) > -900 && Number(v) !== -1;
}

function fmt(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "--";
  return `${value}${suffix}`;
}

function num(value, digits = 1, suffix = "") {
  if (!isValid(value)) return "--";
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function int(value, suffix = "") {
  if (!isValid(value)) return "--";
  return `${Math.round(Number(value))}${suffix}`;
}

function fmtTime(value, withSeconds = true) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-OM", {
    timeZone: OMAN_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
  });
}

function shortTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-OM", {
    timeZone: OMAN_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function age(value) {
  if (!value) return "--";
  const sec = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${hr}h ${rem}m` : `${hr}h`;
}

function statusFromAge(createdAt) {
  if (!createdAt) return { label: "No data", cls: "bad" };
  const delta = Date.now() - new Date(createdAt).getTime();
  if (delta <= 7 * 60 * 1000) return { label: `Live · ${age(createdAt)} ago`, cls: "ok" };
  if (delta <= 20 * 60 * 1000) return { label: `Delayed · ${age(createdAt)} ago`, cls: "warn" };
  return { label: `Offline · ${age(createdAt)} ago`, cls: "bad" };
}

function wifiQuality(rssi) {
  if (!isValid(rssi)) return { label: "Unknown", bars: 0, cls: "muted" };
  const x = Number(rssi);
  if (x >= -60) return { label: "Excellent", bars: 5, cls: "ok" };
  if (x >= -67) return { label: "Good", bars: 4, cls: "ok" };
  if (x >= -75) return { label: "Fair", bars: 3, cls: "warn" };
  if (x >= -85) return { label: "Weak", bars: 2, cls: "warn" };
  return { label: "Poor", bars: 1, cls: "bad" };
}

function rfQuality(rssi, snr) {
  if (!isValid(rssi)) return { label: "No relay RSSI", bars: 0, cls: "muted" };
  const x = Number(rssi);
  const s = isValid(snr) ? Number(snr) : 0;
  if (x >= -70 && s >= 8) return { label: "Excellent", bars: 5, cls: "ok" };
  if (x >= -90 && s >= 5) return { label: "Good", bars: 4, cls: "ok" };
  if (x >= -105 && s >= 0) return { label: "Fair", bars: 3, cls: "warn" };
  if (x >= -118) return { label: "Weak", bars: 2, cls: "warn" };
  return { label: "Poor", bars: 1, cls: "bad" };
}

function bars(count) {
  return (
    <span className="bars" aria-label={`${count} bars`}>
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= count ? "on" : ""} />)}
    </span>
  );
}

function routeLabel(route) {
  if (route === "direct") return "Direct WiFi upload";
  if (route === "relay") return "Indoor relay upload";
  if (route === "queued") return "Queued / delayed";
  if (route === "none") return "No route";
  return route || "Unknown";
}

function asPowerW(row) {
  if (isValid(row?.system_load_watts)) return Number(row.system_load_watts);
  if (isValid(row?.battery_power)) return Number(row.battery_power) / 1000;
  return null;
}

function rowTime(row) {
  return row?.created_at || row?.device_time || null;
}

function pickMax(rows, getter) {
  let best = null;
  let bestValue = -Infinity;
  for (const row of rows) {
    const value = getter(row);
    if (Number.isFinite(value) && value > bestValue) {
      best = row;
      bestValue = value;
    }
  }
  return best ? { row: best, value: bestValue } : null;
}

function pickMin(rows, getter) {
  let best = null;
  let bestValue = Infinity;
  for (const row of rows) {
    const value = getter(row);
    if (Number.isFinite(value) && value < bestValue) {
      best = row;
      bestValue = value;
    }
  }
  return best ? { row: best, value: bestValue } : null;
}

function avg(rows, getter) {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const value = getter(row);
    if (Number.isFinite(value)) {
      total += value;
      count += 1;
    }
  }
  return count ? total / count : null;
}

function buildGaps(rowsAsc) {
  const gaps = [];
  for (let i = 1; i < rowsAsc.length; i++) {
    const prev = new Date(rowsAsc[i - 1].created_at).getTime();
    const cur = new Date(rowsAsc[i].created_at).getTime();
    const diff = cur - prev;
    if (diff > GAP_THRESHOLD_MS) {
      gaps.push({
        from: rowsAsc[i - 1],
        to: rowsAsc[i],
        durationMs: diff,
        missed: Math.max(1, Math.round(diff / EXPECTED_INTERVAL_MS) - 1),
      });
    }
  }
  return gaps.reverse();
}

function buildRouteSwitches(rowsAsc) {
  const events = [];
  let previous = null;
  for (const row of rowsAsc) {
    const current = row.route || "unknown";
    if (previous && previous.route !== current) {
      events.push({ time: row.created_at, from: previous.route, to: current, row });
    }
    previous = { route: current, row };
  }
  return events.reverse();
}

function buildBootEvents(rowsAsc) {
  const events = [];
  let previous = null;
  for (const row of rowsAsc) {
    const current = row.boot_id || "unknown";
    if (!previous || previous.boot !== current) {
      events.push({ time: row.created_at, boot: current, packet: row.packet_number, firmware: row.firmware_version });
    }
    previous = { boot: current, row };
  }
  return events.reverse();
}

function countFalse(rows, key) {
  return rows.filter(r => r[key] === false).length;
}

function boolText(v) {
  if (v === true) return "OK";
  if (v === false) return "FAIL";
  return "--";
}

function sensorClass(v) {
  if (v === true) return "ok";
  if (v === false) return "bad";
  return "muted";
}

export default function DebugPage() {
  const [rowsAsc, setRowsAsc] = useState([]);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const limit = hours >= 720 ? 3000 : hours >= 168 ? 2200 : 800;
      const res = await fetch(`/api/history?hours=${hours}&limit=${limit}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      setRowsAsc(Array.isArray(data.rows) ? data.rows : []);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load debug data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [hours]);

  const rows = useMemo(() => [...rowsAsc].reverse(), [rowsAsc]);
  const latest = rows[0] || null;

  const stats = useMemo(() => {
    const gaps = buildGaps(rowsAsc);
    const routes = buildRouteSwitches(rowsAsc);
    const boots = buildBootEvents(rowsAsc);
    const maxPower = pickMax(rowsAsc, r => asPowerW(r));
    const maxCurrent = pickMax(rowsAsc, r => isValid(r.battery_current) ? Number(r.battery_current) : NaN);
    const minBattery = pickMin(rowsAsc, r => isValid(r.battery_percent) ? Number(r.battery_percent) : NaN);
    const maxTemp = pickMax(rowsAsc, r => isValid(r.temperature) ? Number(r.temperature) : NaN);
    const maxPM25 = pickMax(rowsAsc, r => isValid(r.pm2_5) ? Number(r.pm2_5) : NaN);
    const maxWind = pickMax(rowsAsc, r => isValid(r.wind_gust) ? Number(r.wind_gust) : NaN);
    return {
      gaps,
      routes,
      boots,
      maxPower,
      maxCurrent,
      minBattery,
      maxTemp,
      maxPM25,
      maxWind,
      avgPower: avg(rowsAsc, r => asPowerW(r)),
      avgCurrent: avg(rowsAsc, r => isValid(r.battery_current) ? Number(r.battery_current) : NaN),
      directCount: rowsAsc.filter(r => r.route === "direct").length,
      relayCount: rowsAsc.filter(r => r.route === "relay").length,
      queuedCount: rowsAsc.filter(r => Number(r.queue_count || 0) > 0).length,
      wifiFailCount: countFalse(rowsAsc, "wifi_ok"),
      loraFailCount: countFalse(rowsAsc, "lora_ok"),
      bmeFailCount: countFalse(rowsAsc, "bme_ok"),
      pmsFailCount: countFalse(rowsAsc, "pms_ok"),
      inaFailCount: countFalse(rowsAsc, "ina_ok"),
      mtFailCount: countFalse(rowsAsc, "mt6701_ok"),
    };
  }, [rowsAsc]);

  const live = statusFromAge(latest?.created_at);
  const wifi = wifiQuality(latest?.rssi);
  const rf = rfQuality(latest?.lora_rssi, latest?.lora_snr);
  const routeIsDirect = latest?.route === "direct";

  return (
    <main>
      <style>{css}</style>

      <header className="hero">
        <div>
          <p className="kicker">Hidden technical page</p>
          <h1>Debug</h1>
          <p>Operational telemetry, routing history, sensor data, link quality, and outage detection. No passwords, tokens, or keys are shown here.</p>
        </div>
        <a className="back" href="/">← Public dashboard</a>
      </header>

      <section className="controls">
        {[6, 24, 168, 720].map(h => (
          <button key={h} onClick={() => setHours(h)} className={hours === h ? "active" : ""}>
            {h === 6 ? "6h" : h === 24 ? "24h" : h === 168 ? "7d" : "30d"}
          </button>
        ))}
        <button onClick={load}>Refresh</button>
        <span className={`pill ${live.cls}`}>{live.label}</span>
        {loading && <span className="mutedText">Loading…</span>}
      </section>

      {error && <section className="error">{error}</section>}

      <section className="grid summaryGrid">
        <article className="card wide">
          <div className="cardTitle">🛰️ Latest update</div>
          <div className="big">{fmtTime(latest?.created_at)}</div>
          <div className="sub">Device time: {fmtTime(latest?.device_time)} · Age: {age(latest?.created_at)}</div>
          <div className="sub">Station: {fmt(latest?.station_id)} · Boot: {fmt(latest?.boot_id)} · Packet: {fmt(latest?.packet_number)}</div>
        </article>

        <article className="card">
          <div className="cardTitle">🔁 Route</div>
          <div className="big route">{routeLabel(latest?.route)}</div>
          <div className="sub">Direct uploads: {stats.directCount} · Relay uploads: {stats.relayCount}</div>
          <div className="sub">Route switches in range: {stats.routes.length}</div>
        </article>

        <article className="card">
          <div className="cardTitle">📶 WiFi link</div>
          <div className={`big ${wifi.cls}`}>{bars(wifi.bars)} {wifi.label}</div>
          <div className="sub">RSSI: {fmt(latest?.rssi, " dBm")}</div>
          <div className="sub">Network name: not logged by firmware</div>
        </article>

        <article className="card">
          <div className="cardTitle">📡 Outdoor RF / LoRa</div>
          {routeIsDirect && !isValid(latest?.lora_rssi) ? (
            <>
              <div className="big muted">Standby</div>
              <div className="sub">Latest row came by direct WiFi, so relay RSSI/SNR is not attached to this database row.</div>
            </>
          ) : (
            <>
              <div className={`big ${rf.cls}`}>{bars(rf.bars)} {rf.label}</div>
              <div className="sub">RSSI: {fmt(latest?.lora_rssi, " dBm")} · SNR: {fmt(latest?.lora_snr, " dB")}</div>
            </>
          )}
        </article>
      </section>

      <section className="sectionTitle">
        <h2>All latest sensor readings</h2>
        <p>Values inserted in the last database row.</p>
      </section>
      <section className="grid sensorGrid">
        <Info icon="🌡️" title="Temperature" value={num(latest?.temperature, 1, " °C")} sub="BME280" />
        <Info icon="💧" title="Humidity" value={num(latest?.humidity, 1, " %")} sub="BME280" />
        <Info icon="🧭" title="Pressure" value={num(latest?.pressure, 1, " hPa")} sub="BME280" />
        <Info icon="🌫️" title="PM1.0" value={int(latest?.pm1_0, " µg/m³")} sub="PMS7003" />
        <Info icon="🌁" title="PM2.5" value={int(latest?.pm2_5, " µg/m³")} sub="PMS7003" />
        <Info icon="🏜️" title="PM10" value={int(latest?.pm10, " µg/m³")} sub="PMS7003" />
        <Info icon="💨" title="Wind speed" value={num(latest?.wind_speed, 1, " km/h")} sub={`Avg ${num(latest?.wind_speed_avg, 1, " km/h")} · Gust ${num(latest?.wind_gust, 1, " km/h")}`} />
        <Info icon="🧭" title="Wind direction" value={num(latest?.wind_direction, 1, "°")} sub={`Avg ${num(latest?.wind_direction_avg, 1, "°")}`} />
        <Info icon="☀️" title="UV / sun" value={num(latest?.uv_index, 1)} sub={`Peak ${num(latest?.uv_peak, 1)}`} />
        <Info icon="🔋" title="Battery" value={`${num(latest?.battery_voltage, 3, " V")} · ${num(latest?.battery_percent, 1, "%")}`} sub="10Ah solar battery estimate" />
        <Info icon="⚡" title="Current draw" value={num(latest?.battery_current, 1, " mA")} sub="Board + sensors" />
        <Info icon="🔌" title="Power use" value={num(asPowerW(latest), 2, " W")} sub={fmt(latest?.power_measurement_type)} />
      </section>

      <section className="sectionTitle">
        <h2>Routing and update timeline</h2>
        <p>Detected from database timestamps and route values. A gap means the database did not receive records for longer than expected.</p>
      </section>
      <section className="grid twoCol">
        <Timeline title="Route switches" icon="🔀" empty="No route switches detected in this range." items={stats.routes.map(e => ({
          key: `${e.time}-${e.from}-${e.to}`,
          title: `${routeLabel(e.from)} → ${routeLabel(e.to)}`,
          sub: `${fmtTime(e.time)} · Packet ${fmt(e.row.packet_number)} · Boot ${fmt(e.row.boot_id)}`,
          cls: e.to === "relay" ? "warn" : "ok",
        }))} />

        <Timeline title="Database update gaps" icon="⏱️" empty="No update gaps detected in this range." items={stats.gaps.map(g => ({
          key: `${g.from.id}-${g.to.id}`,
          title: `${duration(g.durationMs)} gap · about ${g.missed} missed cycle${g.missed === 1 ? "" : "s"}`,
          sub: `${shortTime(g.from.created_at)} → ${shortTime(g.to.created_at)}`,
          cls: g.durationMs > 20 * 60 * 1000 ? "bad" : "warn",
        }))} />
      </section>

      <section className="sectionTitle">
        <h2>Power and reliability events</h2>
        <p>Highest power/current, lowest battery, boot changes, and sensor health failures in the selected range.</p>
      </section>
      <section className="grid eventGrid">
        <EventCard icon="⚡" title="Highest power use" value={stats.maxPower ? `${stats.maxPower.value.toFixed(2)} W` : "--"} sub={stats.maxPower ? fmtTime(rowTime(stats.maxPower.row)) : "No data"} />
        <EventCard icon="🔌" title="Highest current" value={stats.maxCurrent ? `${stats.maxCurrent.value.toFixed(1)} mA` : "--"} sub={stats.maxCurrent ? fmtTime(rowTime(stats.maxCurrent.row)) : "No data"} />
        <EventCard icon="🔋" title="Lowest battery" value={stats.minBattery ? `${stats.minBattery.value.toFixed(1)}%` : "--"} sub={stats.minBattery ? `${num(stats.minBattery.row.battery_voltage, 3, " V")} · ${fmtTime(rowTime(stats.minBattery.row))}` : "No data"} />
        <EventCard icon="🌡️" title="Highest temperature" value={stats.maxTemp ? `${stats.maxTemp.value.toFixed(1)} °C` : "--"} sub={stats.maxTemp ? fmtTime(rowTime(stats.maxTemp.row)) : "No data"} />
        <EventCard icon="🌁" title="Highest PM2.5" value={stats.maxPM25 ? `${stats.maxPM25.value.toFixed(0)} µg/m³` : "--"} sub={stats.maxPM25 ? fmtTime(rowTime(stats.maxPM25.row)) : "No data"} />
        <EventCard icon="💨" title="Highest gust" value={stats.maxWind ? `${stats.maxWind.value.toFixed(1)} km/h` : "--"} sub={stats.maxWind ? fmtTime(rowTime(stats.maxWind.row)) : "No data"} />
      </section>

      <section className="grid twoCol">
        <Timeline title="Boot / restart timeline" icon="🔁" empty="No boot changes detected." items={stats.boots.slice(0, 12).map(e => ({
          key: `${e.time}-${e.boot}`,
          title: `Boot ${e.boot}`,
          sub: `${fmtTime(e.time)} · Packet ${fmt(e.packet)} · ${fmt(e.firmware)}`,
          cls: "muted",
        }))} />

        <article className="card">
          <div className="cardTitle">🧪 Health counters</div>
          <div className="healthGrid">
            <Health name="BME280" value={latest?.bme_ok} failCount={stats.bmeFailCount} />
            <Health name="PMS7003" value={latest?.pms_ok} failCount={stats.pmsFailCount} />
            <Health name="INA219" value={latest?.ina_ok} failCount={stats.inaFailCount} />
            <Health name="MT6701" value={latest?.mt6701_ok} failCount={stats.mtFailCount} />
            <Health name="LoRa" value={latest?.lora_ok} failCount={stats.loraFailCount} />
            <Health name="WiFi" value={latest?.wifi_ok} failCount={stats.wifiFailCount} />
          </div>
          <div className="note">Counters show how many database rows in the selected range reported a false health flag.</div>
        </article>
      </section>

      <section className="sectionTitle">
        <h2>Raw received records</h2>
        <p>Full sensor and operations table. This is intentionally technical.</p>
      </section>
      <section className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Device time</th>
              <th>Age</th>
              <th>Route</th>
              <th>Station</th>
              <th>Boot</th>
              <th>Packet</th>
              <th>Temp</th>
              <th>RH</th>
              <th>Pressure</th>
              <th>PM1</th>
              <th>PM2.5</th>
              <th>PM10</th>
              <th>Wind</th>
              <th>Gust</th>
              <th>Dir</th>
              <th>UV</th>
              <th>UV peak</th>
              <th>Battery</th>
              <th>Current</th>
              <th>Power</th>
              <th>WiFi RSSI</th>
              <th>LoRa RSSI</th>
              <th>LoRa SNR</th>
              <th>Heap</th>
              <th>Queue</th>
              <th>Samples</th>
              <th>Health</th>
              <th>Firmware</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id || `${r.created_at}-${r.packet_number}`}>
                <td>{fmtTime(r.created_at)}</td>
                <td>{fmtTime(r.device_time)}</td>
                <td>{age(r.created_at)}</td>
                <td>{routeLabel(r.route)}</td>
                <td>{fmt(r.station_id)}</td>
                <td className="mono">{fmt(r.boot_id)}</td>
                <td>{fmt(r.packet_number)}</td>
                <td>{num(r.temperature, 1, "°C")}</td>
                <td>{num(r.humidity, 1, "%")}</td>
                <td>{num(r.pressure, 1, " hPa")}</td>
                <td>{int(r.pm1_0)}</td>
                <td>{int(r.pm2_5)}</td>
                <td>{int(r.pm10)}</td>
                <td>{num(r.wind_speed, 1)}</td>
                <td>{num(r.wind_gust, 1)}</td>
                <td>{num(r.wind_direction, 1, "°")}</td>
                <td>{num(r.uv_index, 1)}</td>
                <td>{num(r.uv_peak, 1)}</td>
                <td>{num(r.battery_voltage, 3, "V")} / {num(r.battery_percent, 1, "%")}</td>
                <td>{num(r.battery_current, 1, "mA")}</td>
                <td>{num(asPowerW(r), 2, "W")}</td>
                <td>{fmt(r.rssi)}</td>
                <td>{fmt(r.lora_rssi)}</td>
                <td>{fmt(r.lora_snr)}</td>
                <td>{fmt(r.free_heap)}</td>
                <td>{fmt(r.queue_count)}</td>
                <td>{fmt(r.sample_count)}</td>
                <td className="mono">B:{boolText(r.bme_ok)} P:{boolText(r.pms_ok)} I:{boolText(r.ina_ok)} M:{boolText(r.mt6701_ok)} L:{boolText(r.lora_ok)} W:{boolText(r.wifi_ok)}</td>
                <td>{fmt(r.firmware_version)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Info({ icon, title, value, sub }) {
  return (
    <article className="card info">
      <div className="icon">{icon}</div>
      <div>
        <div className="cardTitle">{title}</div>
        <div className="big">{value}</div>
        <div className="sub">{sub}</div>
      </div>
    </article>
  );
}

function EventCard({ icon, title, value, sub }) {
  return (
    <article className="card">
      <div className="cardTitle">{icon} {title}</div>
      <div className="big">{value}</div>
      <div className="sub">{sub}</div>
    </article>
  );
}

function Timeline({ title, icon, items, empty }) {
  return (
    <article className="card timelineCard">
      <div className="cardTitle">{icon} {title}</div>
      {items.length === 0 ? <p className="note">{empty}</p> : (
        <div className="timeline">
          {items.slice(0, 14).map(item => (
            <div key={item.key} className={`timelineItem ${item.cls || ""}`}>
              <strong>{item.title}</strong>
              <span>{item.sub}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Health({ name, value, failCount }) {
  return (
    <div className="healthItem">
      <span>{name}</span>
      <strong className={sensorClass(value)}>{boolText(value)}</strong>
      <small>{failCount} fails</small>
    </div>
  );
}

const css = `
* { box-sizing: border-box; }
body { margin:0; background:#07111f; color:#e5eef8; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
main { max-width: 1480px; margin: 0 auto; padding: 24px; }
.hero { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:18px; }
h1 { margin:0; font-size:38px; letter-spacing:-.03em; }
h2 { margin:0; font-size:22px; letter-spacing:-.02em; }
p { margin:4px 0; color:#94a3b8; }
.kicker { text-transform:uppercase; letter-spacing:.16em; color:#38bdf8; font-size:12px; font-weight:900; }
.back { color:#dbeafe; border:1px solid #334155; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:800; background:#0f1b2d; }
.controls { display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
button { border:1px solid #334155; background:#111f34; color:#dbeafe; border-radius:999px; padding:9px 13px; cursor:pointer; font-weight:800; }
button.active { background:#2563eb; border-color:#60a5fa; }
.pill { border-radius:999px; padding:8px 12px; border:1px solid #334155; font-weight:900; }
.pill.ok, .ok { color:#22c55e; }
.pill.warn, .warn { color:#facc15; }
.pill.bad, .bad { color:#fb7185; }
.muted, .mutedText { color:#94a3b8; }
.error { background:#451a1a; color:#fecaca; border:1px solid #991b1b; padding:12px; border-radius:14px; margin-bottom:14px; }
.grid { display:grid; gap:12px; margin-bottom:22px; }
.summaryGrid { grid-template-columns: 1.6fr repeat(3, 1fr); }
.sensorGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.eventGrid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.twoCol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.card { background:linear-gradient(180deg, #0f1b2d, #0a1324); border:1px solid #23344f; border-radius:18px; padding:14px; box-shadow: 0 20px 40px rgba(0,0,0,.18); }
.card.wide { min-width:0; }
.cardTitle { color:#93c5fd; font-size:12px; text-transform:uppercase; letter-spacing:.08em; font-weight:900; margin-bottom:8px; }
.big { font-size:22px; color:#e5eef8; font-weight:950; letter-spacing:-.03em; overflow-wrap:anywhere; }
.big.route { color:#60a5fa; }
.sub { color:#93a8c2; font-size:13px; margin-top:5px; overflow-wrap:anywhere; }
.info { display:flex; gap:12px; align-items:flex-start; }
.icon { width:38px; height:38px; border-radius:14px; background:#101f35; border:1px solid #23344f; display:grid; place-items:center; font-size:22px; flex:0 0 auto; }
.sectionTitle { margin: 24px 0 10px; }
.bars { display:inline-flex; align-items:flex-end; gap:3px; margin-right:6px; vertical-align:middle; }
.bars i { width:5px; background:#26364f; border-radius:99px; display:block; }
.bars i:nth-child(1) { height:8px; }
.bars i:nth-child(2) { height:12px; }
.bars i:nth-child(3) { height:16px; }
.bars i:nth-child(4) { height:20px; }
.bars i:nth-child(5) { height:24px; }
.bars i.on { background:#22c55e; }
.timeline { display:flex; flex-direction:column; gap:9px; max-height:420px; overflow:auto; padding-right:4px; }
.timelineItem { border-left:3px solid #475569; padding:8px 10px; background:#091426; border-radius:12px; }
.timelineItem.ok { border-left-color:#22c55e; }
.timelineItem.warn { border-left-color:#f59e0b; }
.timelineItem.bad { border-left-color:#ef4444; }
.timelineItem strong { display:block; color:#e5eef8; font-size:14px; }
.timelineItem span { display:block; color:#93a8c2; font-size:12px; margin-top:3px; overflow-wrap:anywhere; }
.healthGrid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; }
.healthItem { background:#091426; border:1px solid #1d2d46; border-radius:12px; padding:10px; display:grid; gap:3px; }
.healthItem span { color:#93c5fd; font-size:12px; font-weight:900; text-transform:uppercase; }
.healthItem strong { font-size:18px; }
.healthItem small, .note { color:#93a8c2; font-size:12px; }
.tableWrap { overflow:auto; background:#0f1b2d; border:1px solid #23344f; border-radius:18px; margin-bottom:30px; }
table { border-collapse:collapse; width:100%; min-width:2200px; }
th, td { padding:10px 12px; border-bottom:1px solid #23344f; text-align:left; font-size:12px; white-space:nowrap; }
th { color:#93c5fd; background:#101f35; position:sticky; top:0; z-index:2; }
td { color:#dce8f5; }
tr:hover td { background:#132540; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; }
@media (max-width:1200px) { .summaryGrid, .sensorGrid { grid-template-columns: repeat(2, minmax(0,1fr)); } .eventGrid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
@media (max-width:820px) { main { padding:14px; } .hero { flex-direction:column; } .summaryGrid, .sensorGrid, .eventGrid, .twoCol { grid-template-columns: 1fr; } h1 { font-size:32px; } .big { font-size:20px; } }
`;
