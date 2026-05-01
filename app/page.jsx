"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const OMAN_TZ = "Asia/Muscat";
const WIND_DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > -900 && Number(v) !== -1;
}

function num(v, digits = 1) {
  return isValid(v) ? Number(v).toFixed(digits) : "--";
}

function degToCompass(d) {
  if (!isValid(d)) return "--";
  return WIND_DIRS[Math.round(Number(d) / 22.5) % 16];
}

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("en-OM", { timeZone: OMAN_TZ, hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-OM", {
    timeZone: OMAN_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ageMinutes(value) {
  if (!value) return Infinity;
  return (Date.now() - new Date(value).getTime()) / 60000;
}

function statusForAge(createdAt) {
  const age = ageMinutes(createdAt);
  if (!Number.isFinite(age)) return { text: "No data yet", tone: "bad" };
  if (age <= 7) return { text: "Live", tone: "good" };
  if (age <= 20) return { text: "Delayed", tone: "warn" };
  return { text: "Offline / stale", tone: "bad" };
}

function pmStatus(pm25) {
  const v = Number(pm25);
  if (!isValid(v)) return { text: "No reading", tone: "muted", advice: "Air-quality sensor is not reporting yet." };
  if (v <= 12) return { text: "Good", tone: "good", advice: "Air is clear for normal outdoor activity." };
  if (v <= 35) return { text: "Moderate", tone: "warn", advice: "Sensitive students should reduce hard outdoor activity." };
  if (v <= 55) return { text: "Unhealthy for sensitive groups", tone: "alert", advice: "Consider moving intense activity indoors." };
  return { text: "Poor air quality", tone: "bad", advice: "Outdoor activity is not recommended." };
}

function uvStatus(uv) {
  const v = Number(uv);
  if (!isValid(v)) return { text: "No reading", tone: "muted" };
  if (v < 3) return { text: "Low", tone: "good" };
  if (v < 6) return { text: "Moderate", tone: "warn" };
  if (v < 8) return { text: "High", tone: "alert" };
  if (v < 11) return { text: "Very high", tone: "bad" };
  return { text: "Extreme", tone: "bad" };
}

function batteryStatus(pct, volts) {
  if (isValid(pct)) {
    const v = Number(pct);
    if (v >= 45) return { text: "Healthy", tone: "good" };
    if (v >= 20) return { text: "Low", tone: "warn" };
    return { text: "Very low", tone: "bad" };
  }
  if (isValid(volts)) {
    const v = Number(volts);
    if (v >= 3.25) return { text: "Healthy", tone: "good" };
    if (v >= 3.05) return { text: "Low", tone: "warn" };
    return { text: "Very low", tone: "bad" };
  }
  return { text: "No reading", tone: "muted" };
}

function toneClass(tone) {
  return `tone-${tone || "muted"}`;
}

function Card({ title, value, unit, subtitle, tone = "muted", children }) {
  return (
    <section className={`card ${toneClass(tone)}`}>
      <div className="card-title">{title}</div>
      <div className="card-value">{value}<span>{unit}</span></div>
      {subtitle && <div className="card-subtitle">{subtitle}</div>}
      {children}
    </section>
  );
}

function WindCompass({ direction, speed }) {
  const deg = isValid(direction) ? Number(direction) : 0;
  return (
    <div className="compass">
      <div className="compass-dial">
        <div className="compass-arrow" style={{ transform: `rotate(${deg}deg)` }}>▲</div>
        <div className="compass-n">N</div>
        <div className="compass-e">E</div>
        <div className="compass-s">S</div>
        <div className="compass-w">W</div>
      </div>
      <div className="compass-label">{num(speed, 1)} km/h · {degToCompass(direction)}</div>
    </div>
  );
}

function SmallChart({ rows, dataKey, label }) {
  const data = rows
    .filter(r => isValid(r[dataKey]))
    .map(r => ({ time: formatTime(r.created_at), value: Number(r[dataKey]) }));

  if (data.length < 2) return <div className="empty-chart">Not enough history yet</div>;

  return (
    <div className="chart">
      <div className="chart-title">{label} — last 24 hours</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} width={42} domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HomePage() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [selectedChart, setSelectedChart] = useState("temperature");

  async function load() {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch("/api/latest", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/history?hours=24&limit=720", { cache: "no-store" }).then(r => r.json()),
      ]);
      if (!latestRes.ok) throw new Error(latestRes.error?.error || "Could not load latest data");
      setLatest(latestRes.reading);
      setHistory(historyRes.ok ? historyRes.rows || [] : []);
      setError("");
    } catch (e) {
      setError(e.message || "Dashboard connection error");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const stationStatus = statusForAge(latest?.created_at);
  const pm = pmStatus(latest?.pm2_5);
  const uv = uvStatus(latest?.uv_index);
  const batt = batteryStatus(latest?.battery_percent, latest?.battery_voltage);

  const routeText = useMemo(() => {
    if (!latest) return "Waiting for station";
    if (latest.route === "relay") return "Outdoor → LoRa → Indoor relay → Cloud";
    if (latest.route === "direct") return "Outdoor station → WiFi → Cloud";
    return "Route unknown";
  }, [latest]);

  if (!latest) {
    return (
      <main className="page center">
        <style>{css}</style>
        <div className="loading-card">
          <h1>School Solar Weather Station</h1>
          <p>{error || "Waiting for the first reading..."}</p>
          <button onClick={load}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <style>{css}</style>

      <header className="hero">
        <div>
          <div className="eyebrow">Solar-powered school weather station</div>
          <h1>Live Weather & Air Quality</h1>
          <p>Useful outdoor-condition information for students, teachers, and visitors.</p>
        </div>
        <div className={`status-pill ${toneClass(stationStatus.tone)}`}>
          <strong>{stationStatus.text}</strong>
          <span>Last update: {formatDateTime(latest.created_at)}</span>
        </div>
      </header>

      {error && <div className="notice bad">{error}</div>}

      <section className={`advice ${toneClass(pm.tone)}`}>
        <div>
          <strong>Outdoor activity guidance: {pm.text}</strong>
          <p>{pm.advice}</p>
        </div>
        <div className="advice-number">{num(latest.pm2_5, 0)}<span> PM2.5</span></div>
      </section>

      <section className="grid">
        <Card title="Temperature" value={num(latest.temperature, 1)} unit="°C" subtitle={`Feels local · Humidity ${num(latest.humidity, 0)}%`} tone="warn" />
        <Card title="Humidity" value={num(latest.humidity, 0)} unit="%" subtitle="Relative humidity" tone="good" />
        <Card title="Pressure" value={num(latest.pressure, 1)} unit="hPa" subtitle="Local barometric pressure" tone="muted" />

        <Card title="Wind" value={num(latest.wind_speed_avg ?? latest.wind_speed, 1)} unit="km/h" subtitle={`Direction ${degToCompass(latest.wind_direction)} · Gust ${num(latest.wind_gust, 1)} km/h`} tone="alert">
          <WindCompass direction={latest.wind_direction} speed={latest.wind_speed_avg ?? latest.wind_speed} />
        </Card>

        <Card title="Air Quality" value={num(latest.pm2_5, 0)} unit="µg/m³" subtitle={`${pm.text} · PM10 ${num(latest.pm10, 0)} µg/m³`} tone={pm.tone} />
        <Card title="Sun Intensity" value={num(latest.uv_index, 1)} unit="" subtitle={`${uv.text} · measured from solar panel signal`} tone={uv.tone} />

        <Card title="Battery" value={isValid(latest.battery_percent) ? num(latest.battery_percent, 0) : num(latest.battery_voltage, 2)} unit={isValid(latest.battery_percent) ? "%" : "V"} subtitle={`${batt.text} · ${num(latest.battery_voltage, 3)} V`} tone={batt.tone} />
        <Card title="System Load" value={isValid(latest.system_load_watts) ? num(latest.system_load_watts, 2) : num((latest.battery_power || 0) / 1000, 2)} unit="W" subtitle={`${num(latest.battery_current, 0)} mA used by board + sensors`} tone="muted" />
        <Card title="Signal" value={num(latest.rssi, 0)} unit="dBm" subtitle={routeText} tone={latest.rssi > -75 ? "good" : "warn"} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Today’s trend</h2>
          <div className="tabs">
            {[
              ["temperature", "Temperature"],
              ["pm2_5", "Air quality"],
              ["battery_voltage", "Battery"],
              ["wind_speed_avg", "Wind"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setSelectedChart(key)} className={selectedChart === key ? "active" : ""}>{label}</button>
            ))}
          </div>
        </div>
        <SmallChart rows={history} dataKey={selectedChart} label={selectedChart.replaceAll("_", " ")} />
      </section>

      <section className="panel simple">
        <h2>Station status</h2>
        <div className="status-grid">
          <div><strong>Data route</strong><span>{routeText}</span></div>
          <div><strong>Outdoor firmware</strong><span>{latest.firmware_version || "--"}</span></div>
          <div><strong>Packet number</strong><span>{latest.packet_number ?? "--"}</span></div>
          <div><strong>Queued packets</strong><span>{latest.queue_count ?? 0}</span></div>
        </div>
      </section>

      <footer>
        <span>Times shown in Oman time · 10Ah solar-rechargeable battery · Last station time: {formatDateTime(latest.device_time || latest.created_at)}</span>
      </footer>
    </main>
  );
}

const css = `
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #eef6ff;
  color: #102033;
}
* { box-sizing: border-box; }
body { background: linear-gradient(180deg, #eaf6ff 0%, #f8fbff 55%, #eef6ff 100%); }
.page { min-height: 100vh; padding: 24px; max-width: 1180px; margin: 0 auto; }
.center { display: grid; place-items: center; }
.loading-card { background: white; border-radius: 24px; padding: 28px; box-shadow: 0 18px 60px rgba(25, 62, 100, .14); text-align: center; }
button { border: 0; border-radius: 999px; padding: 10px 16px; background: #d9eaff; color: #12385f; font-weight: 700; cursor: pointer; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 18px; }
.eyebrow { font-size: 13px; text-transform: uppercase; letter-spacing: .12em; font-weight: 800; color: #2f75b5; }
h1 { margin: 6px 0 6px; font-size: clamp(32px, 5vw, 56px); line-height: 1; color: #102033; }
h2 { margin: 0; font-size: 21px; }
p { margin: 0; color: #55708d; }
.status-pill { min-width: 210px; background: white; border-radius: 18px; padding: 14px 16px; box-shadow: 0 12px 32px rgba(25, 62, 100, .10); border-left: 6px solid #9aaec2; }
.status-pill strong { display: block; font-size: 18px; }
.status-pill span { font-size: 13px; color: #60758c; }
.notice, .advice { border-radius: 22px; padding: 16px 18px; margin-bottom: 18px; background: white; box-shadow: 0 10px 30px rgba(25, 62, 100, .10); }
.advice { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.advice strong { font-size: 20px; }
.advice p { margin-top: 4px; }
.advice-number { font-size: 36px; font-weight: 900; white-space: nowrap; }
.advice-number span { font-size: 14px; font-weight: 700; color: #5f7489; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.card { background: rgba(255,255,255,.92); border-radius: 22px; padding: 18px; box-shadow: 0 12px 36px rgba(25, 62, 100, .10); border: 1px solid rgba(35, 86, 135, .08); min-height: 150px; }
.card-title { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; font-weight: 900; color: #60758c; }
.card-value { margin-top: 8px; font-size: 38px; line-height: 1; font-weight: 900; }
.card-value span { font-size: 15px; margin-left: 5px; color: #687f96; }
.card-subtitle { margin-top: 8px; color: #5c7188; font-size: 14px; }
.tone-good { border-color: rgba(21, 128, 61, .28); }
.tone-good .card-value, .tone-good strong, .tone-good.advice, .tone-good.status-pill { color: #15803d; border-left-color: #22c55e; }
.tone-warn { border-color: rgba(202, 138, 4, .28); }
.tone-warn .card-value, .tone-warn strong, .tone-warn.advice, .tone-warn.status-pill { color: #b45309; border-left-color: #f59e0b; }
.tone-alert { border-color: rgba(234, 88, 12, .30); }
.tone-alert .card-value, .tone-alert strong, .tone-alert.advice { color: #ea580c; border-left-color: #fb923c; }
.tone-bad { border-color: rgba(220, 38, 38, .30); }
.tone-bad .card-value, .tone-bad strong, .tone-bad.advice, .tone-bad.status-pill { color: #dc2626; border-left-color: #ef4444; }
.tone-muted .card-value { color: #24517a; }
.compass { margin-top: 12px; display: flex; align-items: center; gap: 14px; }
.compass-dial { width: 88px; height: 88px; border-radius: 50%; border: 2px solid #cbd9e8; position: relative; display: grid; place-items: center; background: #f7fbff; }
.compass-arrow { color: #ea580c; transform-origin: 50% 55%; font-size: 24px; transition: transform .3s; }
.compass-n,.compass-e,.compass-s,.compass-w { position: absolute; font-size: 10px; font-weight: 900; color: #7890a8; }
.compass-n { top: 4px; left: 50%; transform: translateX(-50%); }
.compass-s { bottom: 4px; left: 50%; transform: translateX(-50%); }
.compass-e { right: 6px; top: 50%; transform: translateY(-50%); }
.compass-w { left: 6px; top: 50%; transform: translateY(-50%); }
.compass-label { font-weight: 800; color: #2f4b66; }
.panel { background: rgba(255,255,255,.94); border-radius: 24px; padding: 18px; margin-top: 16px; box-shadow: 0 12px 36px rgba(25, 62, 100, .10); }
.panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tabs button { background: #eef5ff; color: #345a7f; padding: 8px 12px; }
.tabs button.active { background: #1f6fb2; color: white; }
.chart-title { color: #60758c; font-size: 13px; margin-bottom: 8px; text-transform: capitalize; }
.empty-chart { height: 180px; display: grid; place-items: center; color: #71869b; background: #f5f9ff; border-radius: 16px; }
.status-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-top: 12px; }
.status-grid div { background: #f5f9ff; border-radius: 16px; padding: 12px; }
.status-grid strong { display:block; color:#345a7f; }
.status-grid span { display:block; margin-top:4px; color:#60758c; overflow-wrap:anywhere; }
footer { padding: 20px 4px 0; color: #6a7f93; font-size: 13px; text-align: center; }
@media (max-width: 880px) {
  .hero { flex-direction: column; align-items: stretch; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .status-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 560px) {
  .page { padding: 14px; }
  .grid { grid-template-columns: 1fr; }
  .advice { flex-direction: column; align-items: flex-start; }
  .panel-header { flex-direction: column; align-items: flex-start; }
  .status-grid { grid-template-columns: 1fr; }
}
`;
