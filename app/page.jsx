"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const OMAN_TZ = "Asia/Muscat";
const WIND_DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const DETAIL_PAGE_KEYS = new Set(["temperature","humidity","pressure","wind","air-quality","uv","battery","power","signal"]);

function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > -900 && Number(v) !== -1;
}

function n(v, fallback = 0) {
  return isValid(v) ? Number(v) : fallback;
}

function display(v, digits = 1) {
  return isValid(v) ? Number(v).toFixed(digits) : "--";
}

function displayInt(v) {
  return isValid(v) ? Math.round(Number(v)).toString() : "--";
}

function degToCompass(d) {
  if (!isValid(d)) return "--";
  return WIND_DIRS[Math.round(Number(d) / 22.5) % 16];
}

function fmtTime(d) {
  if (!d) return "--";
  return new Date(d).toLocaleTimeString("en-OM", { timeZone: OMAN_TZ, hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-OM", { timeZone: OMAN_TZ, month: "short", day: "numeric" });
}

function fmtDayDate(d) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-OM", { timeZone: OMAN_TZ, weekday: "short", day: "numeric" });
}

function fmtChartTick(d, range) {
  if (range === "24h") return fmtTime(d);
  if (range === "7d") return fmtDayDate(d);
  return fmtDate(d);
}

function chartRangeLabel(range) {
  if (range === "24h") return "5-minute readings across the last 24 hours";
  if (range === "7d") return "Daily averages across the last 7 days";
  return "Daily averages across the last 30 days";
}

function localDayKey(d) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: OMAN_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(d));
  const get = type => parts.find(p => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fmtDateTime(d) {
  if (!d) return "--";
  return new Date(d).toLocaleString("en-OM", { timeZone: OMAN_TZ, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ageSeconds(d) {
  if (!d) return Infinity;
  return Math.round((Date.now() - new Date(d).getTime()) / 1000);
}

function sensorOK(v) {
  return isValid(v);
}

function dotColor(v, lastUpdate) {
  if (!sensorOK(v)) return "#ef4444";
  const age = ageSeconds(lastUpdate) / 60;
  return age > 20 ? "#ef4444" : age > 7 ? "#eab308" : "#22c55e";
}

function stationLabel(lastUpdate) {
  const age = ageSeconds(lastUpdate);
  if (!Number.isFinite(age)) return "WAITING";
  if (age <= 420) return `LIVE — ${age}s ago`;
  if (age <= 1200) return `DELAYED — ${Math.round(age / 60)}m ago`;
  return `OFFLINE — ${Math.round(age / 60)}m ago`;
}

function stationColor(lastUpdate) {
  const age = ageSeconds(lastUpdate);
  if (!Number.isFinite(age) || age > 1200) return "#ef4444";
  if (age > 420) return "#eab308";
  return "#22c55e";
}

function pmColor(v) {
  if (!isValid(v)) return "#64748b";
  const x = Number(v);
  return x <= 12 ? "#22c55e" : x <= 35 ? "#eab308" : x <= 55 ? "#f97316" : "#ef4444";
}

function pmLabel(v) {
  if (!isValid(v)) return "No reading";
  const x = Number(v);
  return x <= 12 ? "Good" : x <= 35 ? "Moderate" : x <= 55 ? "Unhealthy for sensitive groups" : "Poor";
}

function pmAdvice(v) {
  if (!isValid(v)) return "Air-quality sensor is not reporting yet.";
  const x = Number(v);
  if (x <= 12) return "Air is clear for normal outdoor activity.";
  if (x <= 35) return "Sensitive students should reduce hard outdoor activity.";
  if (x <= 55) return "Consider moving intense activity indoors.";
  return "Outdoor activity is not recommended.";
}

function uvColor(v) {
  if (!isValid(v)) return "#64748b";
  const x = Number(v);
  return x < 3 ? "#22c55e" : x < 6 ? "#eab308" : x < 8 ? "#f97316" : x < 11 ? "#ef4444" : "#a855f7";
}

function uvLabel(v) {
  if (!isValid(v)) return "No reading";
  const x = Number(v);
  return x < 3 ? "Low" : x < 6 ? "Moderate" : x < 8 ? "High" : x < 11 ? "Very high" : "Extreme";
}

function uvAdvice(v) {
  if (!isValid(v)) return "UV sensor is not reporting yet.";
  const x = Number(v);
  if (x < 3) return "UV is low. Normal sun protection is enough.";
  if (x < 6) return "Use shade, hats, and sunscreen for longer outdoor time.";
  if (x < 8) return "High UV. Prefer shade and avoid long midday exposure.";
  if (x < 11) return "Very high UV. Keep activities short and use strong sun protection.";
  return "Extreme UV. Avoid direct sun where possible.";
}

function windAdvice(v) {
  if (!isValid(v)) return "Wind sensor is not reporting yet.";
  const x = Number(v);
  if (x < 20) return "Wind is light and comfortable.";
  if (x < 39) return "Breezy. Secure papers, light objects, and shade covers.";
  if (x < 50) return "Windy. Avoid loose equipment and check outdoor setups.";
  return "Strong wind. Outdoor activities and temporary structures need caution.";
}

function activityGuidance(row) {
  if (!row) return { icon:"⏳", title:"Waiting for readings", message:"The station has not sent data yet.", color:"#64748b", points:[] };
  let level = 0;
  const points = [];
  const pm = Number(row.pm2_5);
  if (isValid(row.pm2_5)) {
    if (pm > 55) { level = Math.max(level, 3); points.push("Air quality is poor. Move outdoor activity indoors."); }
    else if (pm > 35) { level = Math.max(level, 2); points.push("Air quality is unhealthy for sensitive students."); }
    else if (pm > 12) { level = Math.max(level, 1); points.push("Air quality is moderate. Sensitive students should take it easy."); }
    else points.push("Air quality is good.");
  }
  const uv = Number(row.uv_index);
  if (isValid(row.uv_index)) {
    if (uv >= 11) { level = Math.max(level, 3); points.push("Extreme UV. Avoid direct sun where possible."); }
    else if (uv >= 8) { level = Math.max(level, 2); points.push("Very high UV. Use shade, hats, and sunscreen."); }
    else if (uv >= 6) { level = Math.max(level, 2); points.push("High UV. Keep outdoor time shorter at midday."); }
    else if (uv >= 3) { level = Math.max(level, 1); points.push("Moderate UV. Sun protection is recommended."); }
    else points.push("UV is low.");
  }
  const wind = Number(row.wind_gust ?? row.wind_speed_avg ?? row.wind_speed);
  if (isValid(wind)) {
    if (wind >= 50) { level = Math.max(level, 3); points.push("Strong wind. Avoid loose outdoor equipment."); }
    else if (wind >= 39) { level = Math.max(level, 2); points.push("Windy. Secure light objects and check shade covers."); }
    else if (wind >= 25) { level = Math.max(level, 1); points.push("Breezy conditions. Light objects may move."); }
  }
  const temp = Number(row.temperature);
  if (isValid(row.temperature)) {
    if (temp >= 42) { level = Math.max(level, 3); points.push("Extreme heat. Keep activity indoors or very short."); }
    else if (temp >= 38) { level = Math.max(level, 2); points.push("Very hot. Hydration and shade breaks are important."); }
    else if (temp >= 34) { level = Math.max(level, 1); points.push("Hot weather. Drink water and use shade."); }
  }
  const presets = [
    { icon:"✅", title:"Good for outdoor activity", message:"Conditions look suitable for normal outdoor activity.", color:"#22c55e" },
    { icon:"🟡", title:"Outdoor activity is okay with care", message:"Most activities can continue, but use sensible precautions.", color:"#eab308" },
    { icon:"⚠️", title:"Limit intense outdoor activity", message:"Prefer shade, shorter sessions, and extra breaks.", color:"#f97316" },
    { icon:"🚫", title:"Move sensitive activity indoors", message:"Conditions are not ideal for outdoor activity.", color:"#ef4444" },
  ];
  return { ...presets[level], points: points.slice(0, 3) };
}

function beaufort(k) {
  const x = n(k, 0);
  return x < 1 ? 0 : x < 6 ? 1 : x < 12 ? 2 : x < 20 ? 3 : x < 29 ? 4 : x < 39 ? 5 : x < 50 ? 6 : x < 62 ? 7 : x < 75 ? 8 : x < 89 ? 9 : x < 103 ? 10 : x < 118 ? 11 : 12;
}

function beaufortDesc(b) {
  return ["Calm","Light air","Light breeze","Gentle breeze","Moderate breeze","Fresh breeze","Strong breeze","Near gale","Gale","Strong gale","Storm","Violent storm","Hurricane"][b] || "";
}

function feelsLike(t, h, w) {
  if (!isValid(t) || !isValid(h)) return null;
  const tt = Number(t), hh = Number(h), ww = n(w, 0);
  if (tt > 27 && hh > 40) return -8.78 + 1.61 * tt + 2.34 * hh - 0.15 * tt * hh - 0.01 * tt * tt - 0.02 * hh * hh + 0.002 * tt * tt * hh + 0.0007 * tt * hh * hh - 0.0000036 * tt * tt * hh * hh;
  if (tt < 10 && ww > 4.8) return 13.12 + 0.62 * tt - 11.37 * Math.pow(ww, 0.16) + 0.40 * tt * Math.pow(ww, 0.16);
  return tt;
}

function dewPoint(t, h) {
  if (!isValid(t) || !isValid(h) || Number(h) <= 0) return null;
  const a = 17.27, b = 237.7;
  const g = (a * Number(t) / (b + Number(t))) + Math.log(Number(h) / 100);
  return (b * g) / (a - g);
}

function battPctFromVoltage(v) {
  if (!isValid(v)) return null;
  return Math.min(100, Math.max(0, Math.round(((Number(v) - 2.9) / (3.65 - 2.9)) * 100)));
}

function batteryPercent(row) {
  if (!row) return null;
  if (isValid(row.battery_percent)) return Math.round(Number(row.battery_percent));
  return battPctFromVoltage(row.battery_voltage);
}

function systemLoadWatts(row) {
  if (!row) return null;
  if (isValid(row.system_load_watts)) return Number(row.system_load_watts);
  if (isValid(row.battery_power)) return Number(row.battery_power) / 1000.0;
  return null;
}

function uptimeText(minutes) {
  if (!isValid(minutes)) return "--";
  const m = Math.max(0, Math.round(Number(minutes)));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

function wifiQuality(rssi) {
  if (!isValid(rssi)) return { label:"Unknown", bars:0, color:"#64748b" };
  const x = Number(rssi);
  if (x >= -60) return { label:"Excellent", bars:5, color:"#22c55e" };
  if (x >= -70) return { label:"Good", bars:4, color:"#22c55e" };
  if (x >= -80) return { label:"Fair", bars:3, color:"#eab308" };
  if (x >= -90) return { label:"Weak", bars:2, color:"#f97316" };
  return { label:"Poor", bars:1, color:"#ef4444" };
}

function rfQuality(row) {
  if (!row) return { label:"No RF", bars:0, color:"#64748b", text:"--" };
  if (isValid(row.lora_rssi)) {
    const x = Number(row.lora_rssi);
    if (x >= -70) return { label:"Excellent", bars:5, color:"#22c55e", text:`${Math.round(x)} dBm` };
    if (x >= -90) return { label:"Good", bars:4, color:"#22c55e", text:`${Math.round(x)} dBm` };
    if (x >= -105) return { label:"Fair", bars:3, color:"#eab308", text:`${Math.round(x)} dBm` };
    if (x >= -115) return { label:"Weak", bars:2, color:"#f97316", text:`${Math.round(x)} dBm` };
    return { label:"Poor", bars:1, color:"#ef4444", text:`${Math.round(x)} dBm` };
  }
  if ((row.route || "") === "direct") return { label:"Direct WiFi", bars:0, color:"#3b82f6", text:"Outdoor uploaded directly" };
  return { label:"Waiting", bars:0, color:"#64748b", text:"No relay RF yet" };
}

function routeFriendly(route) {
  if (route === "direct") return "Direct upload";
  if (route === "relay") return "Indoor relay";
  if (route === "queued") return "Queued";
  return route || "Unknown";
}

function batteryStateLabel(pct) {
  if (pct == null) return { label:"Unknown", color:"#64748b" };
  if (pct >= 60) return { label:"Good", color:"#22c55e" };
  if (pct >= 30) return { label:"Normal", color:"#eab308" };
  if (pct >= 15) return { label:"Low", color:"#f97316" };
  return { label:"Critical", color:"#ef4444" };
}

async function fetchLatestAndHistory() {
  const [latestRes, historyRes] = await Promise.all([
    fetch("/api/latest", { cache: "no-store" }).then(r => r.json()),
    fetch("/api/history?hours=24&limit=720", { cache: "no-store" }).then(r => r.json()),
  ]);
  if (!latestRes.ok) throw new Error(latestRes.error?.error || "Could not load latest data");
  return {
    current: latestRes.reading || null,
    history: historyRes.ok ? historyRes.rows || [] : [],
  };
}

async function fetchHistoryRange(range) {
  const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720;
  const limit = range === "24h" ? 720 : range === "7d" ? 2500 : 3000;
  const res = await fetch(`/api/history?hours=${hours}&limit=${limit}`, { cache: "no-store" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.error || "Could not load history");
  return data.rows || [];
}

function Spark({ data, dataKey, color, h = 40 }) {
  const rows = (data || []).filter(r => isValid(r[dataKey]));
  if (rows.length < 2) return <div style={{ height: h }} />;
  return (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={rows}>
        <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Dot({ value, lastUpdate }) {
  const c = dotColor(value, lastUpdate);
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:c, marginLeft:6, verticalAlign:"middle", animation: c==="#22c55e"?"pulse 2s infinite":"none" }} />;
}

function MetricCard({ icon, title, value, unit, sub, color, sparkData, sparkKey, dot, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"border-color 0.2s", position:"relative", minHeight:138 }}
      onMouseEnter={e => e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:28, height:28, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:10, background:(color||"#3b82f6")+"18", border:`1px solid ${(color||"#3b82f6")}55`, fontSize:16 }}>{icon}</span>
          <span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>{title}</span>
        </div>
        {dot}
      </div>
      <div style={{ fontSize:26, fontWeight:800, color: color||"#f1f5f9", lineHeight:1.1 }}>
        {value}<span style={{ fontSize:13, color:"#64748b", marginLeft:3 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>{sub}</div>}
      {sparkData && sparkKey && <Spark data={sparkData} dataKey={sparkKey} color={color||"#3b82f6"} h={30} />}
      <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap for details →</div>
    </div>
  );
}

function SignalBars({ bars, color }) {
  return (
    <span style={{ display:"inline-flex", gap:2, alignItems:"flex-end", height:14 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ width:4, height:4 + i*2, borderRadius:2, background:i <= bars ? color : "#334155", opacity:i <= bars ? 1 : .55 }} />
      ))}
    </span>
  );
}

function StationStatusStrip({ row, battPct, loadW, onOpen }) {
  const wifi = wifiQuality(row?.rssi);
  const rf = rfQuality(row);
  const batt = batteryStateLabel(battPct);
  return (
    <div className="wide" style={{ gridColumn:"span 3", background:"linear-gradient(145deg,#08111f,#0f172a)", border:"1px solid #1e3a5f", borderRadius:14, padding:"12px 14px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
      <button onClick={() => onOpen("battery")} style={statusButtonStyle}>
        <div style={statusLabelStyle}>🔋 Battery</div>
        <div style={{ ...statusValueStyle, color:batt.color }}>{battPct == null ? "--" : `${battPct}%`}</div>
        <div style={statusSubStyle}>{batt.label} · {display(row?.battery_voltage,2)}V</div>
      </button>
      <button onClick={() => onOpen("power")} style={statusButtonStyle}>
        <div style={statusLabelStyle}>⚡ Power use</div>
        <div style={{ ...statusValueStyle, color:"#f59e0b" }}>{loadW == null ? "--" : `${loadW.toFixed(2)}W`}</div>
        <div style={statusSubStyle}>{display(row?.battery_current,0)}mA load</div>
      </button>
      <button onClick={() => onOpen("signal")} style={statusButtonStyle}>
        <div style={statusLabelStyle}>📶 Signal</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <SignalBars bars={wifi.bars} color={wifi.color} />
          <span style={{ ...statusValueStyle, color:wifi.color, fontSize:16 }}>{wifi.label}</span>
        </div>
        <div style={statusSubStyle}>WiFi {displayInt(row?.rssi)} dBm</div>
      </button>
      <button onClick={() => onOpen("signal")} style={statusButtonStyle}>
        <div style={statusLabelStyle}>🛰️ Data route</div>
        <div style={{ ...statusValueStyle, color: row?.route === "relay" ? "#3b82f6" : "#22c55e", fontSize:16 }}>{routeFriendly(row?.route)}</div>
        <div style={statusSubStyle}>RF: {rf.label}</div>
      </button>
    </div>
  );
}

const statusButtonStyle = {
  background:"#020617",
  border:"1px solid #1e293b",
  borderRadius:12,
  padding:"10px 8px",
  textAlign:"center",
  cursor:"pointer",
  color:"inherit",
  minHeight:84,
};
const statusLabelStyle = { fontSize:10, color:"#94a3b8", letterSpacing:.6, textTransform:"uppercase", marginBottom:5 };
const statusValueStyle = { fontSize:18, lineHeight:1.1, fontWeight:900 };
const statusSubStyle = { fontSize:10, color:"#64748b", marginTop:5, lineHeight:1.25 };

function StationHealthPanel({ row, battPct, loadW, onOpen }) {
  const wifi = wifiQuality(row?.rssi);
  const rf = rfQuality(row);
  const routeIsRelay = row?.route === "relay";
  const rfCard = isValid(row?.lora_rssi)
    ? { value: rf.label, sub: rf.text, color: rf.color, bars: rf.bars }
    : { value: routeIsRelay ? "Waiting" : "Standby", sub: routeIsRelay ? "Relay signal not reported yet" : "Direct WiFi active", color: routeIsRelay ? "#eab308" : "#64748b", bars: 0 };
  const routeCard = row?.route === "relay"
    ? { value:"Indoor relay", sub:"Indoor unit forwarded the reading", color:"#3b82f6" }
    : row?.route === "direct"
      ? { value:"Direct upload", sub:"Outdoor station sent the reading", color:"#22c55e" }
      : { value: routeFriendly(row?.route), sub:"Waiting for route", color:"#64748b" };

  const items = [
    { icon:"🔋", label:"Battery", value:battPct == null ? "--" : `${battPct}%`, sub:`${display(row?.battery_voltage,3)}V · 10Ah solar battery`, color:batteryStateLabel(battPct).color, page:"battery" },
    { icon:"⚡", label:"Power use", value:loadW == null ? "--" : `${loadW.toFixed(2)}W`, sub:`Board + sensors · ${display(row?.battery_current,1)}mA`, color:"#f59e0b", page:"power" },
    { icon:"📶", label:"WiFi signal", value:wifi.label, sub:`${displayInt(row?.rssi)} dBm`, color:wifi.color, page:"signal", bars:wifi.bars },
    { icon:"🛰️", label:"RF link", value:rfCard.value, sub:rfCard.sub, color:rfCard.color, page:"signal", bars:rfCard.bars },
    { icon:"🔁", label:"Data route", value:routeCard.value, sub:routeCard.sub, color:routeCard.color, page:"signal" },
  ];
  return (
    <div className="wide" style={{ gridColumn:"span 3", background:"#0f172a", border:"1px solid #334155", borderRadius:14, padding:14 }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:12, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>Station health</div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Battery, power, connection, and data delivery status.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }} className="healthGrid">
        {items.map(item => (
          <button key={item.label} onClick={() => item.page && onOpen(item.page)} style={{ background:"#020617", border:"1px solid #1e293b", borderRadius:10, padding:"10px 8px", textAlign:"left", cursor:item.page ? "pointer" : "default", color:"inherit", minHeight:88 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
              <span style={{ width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:8, background:item.color+"18", border:`1px solid ${item.color}44`, fontSize:14 }}>{item.icon}</span>
              <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:.6 }}>{item.label}</div>
            </div>
            <div style={{ fontSize:15, fontWeight:900, color:item.color, marginTop:4, display:"flex", gap:6, alignItems:"center" }}>
              {item.bars != null && <SignalBars bars={item.bars} color={item.color} />}
              <span>{item.value}</span>
            </div>
            <div style={{ fontSize:10, color:"#64748b", marginTop:5, lineHeight:1.2 }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WindDirectionDial({ direction, size = 86, color = "#f59e0b" }) {
  const dir = n(direction, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 9;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:size, height:size, flex:"0 0 auto" }}>
      <circle cx={cx} cy={cy} r={r} fill="#020617" stroke="#334155" strokeWidth="2" />
      <text x={cx} y={14} fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="700">N</text>
      <text x={size-12} y={cy+3} fill="#64748b" fontSize="8" textAnchor="middle">E</text>
      <text x={cx} y={size-8} fill="#64748b" fontSize="8" textAnchor="middle">S</text>
      <text x={12} y={cy+3} fill="#64748b" fontSize="8" textAnchor="middle">W</text>
      <g transform={`rotate(${dir} ${cx} ${cy})`}>
        <line x1={cx} y1={cy+18} x2={cx} y2={cy-r+13} stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d={`M ${cx} ${cy-r+5} L ${cx-7} ${cy-r+20} L ${cx+7} ${cy-r+20} Z`} fill={color} />
      </g>
      <circle cx={cx} cy={cy} r="4" fill="#f1f5f9" />
    </svg>
  );
}

function WindSummaryPanel({ row, compact = false }) {
  const speed = isValid(row?.wind_speed_avg) ? row.wind_speed_avg : row?.wind_speed;
  const gust = row?.wind_gust;
  const direction = row?.wind_direction;
  const compass = degToCompass(direction);
  return (
    <div style={{ display:"grid", gridTemplateColumns: compact ? "1fr auto" : "1.2fr .8fr", gap:12, alignItems:"center" }}>
      <div>
        <div style={{ fontSize: compact ? 34 : 42, fontWeight:900, color:"#f59e0b", lineHeight:1 }}>
          {display(speed,1)}<span style={{ fontSize:13, color:"#94a3b8", marginLeft:4 }}>km/h</span>
        </div>
        <div style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>Average wind speed</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
          <span style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b44", borderRadius:999, padding:"3px 8px", fontSize:11, fontWeight:800 }}>
            ↗ From {compass} {isValid(direction) ? `(${display(direction,0)}°)` : ""}
          </span>
          <span style={{ background:"#ef444422", color:"#fca5a5", border:"1px solid #ef444444", borderRadius:999, padding:"3px 8px", fontSize:11, fontWeight:700 }}>
            Gust {display(gust,1)} km/h
          </span>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <WindDirectionDial direction={direction} size={compact ? 82 : 124} />
        <div style={{ color:"#f59e0b", fontWeight:900, fontSize: compact ? 16 : 22, marginTop:4 }}>{compass}</div>
      </div>
    </div>
  );
}

function aggregateRows(rows, range, fields) {
  const sorted = [...(rows || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (range === "24h") return sorted;

  // Weather apps usually show 7-day and 30-day history as daily points, not dense time-of-day ticks.
  // Group by local Oman calendar day so the x-axis reads as days/dates.
  const groups = {};
  sorted.forEach(r => {
    const key = localDayKey(r.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.entries(groups).map(([key, g]) => {
    const out = { created_at: g[Math.floor(g.length / 2)]?.created_at || g[0].created_at, day_key: key };
    fields.forEach(field => {
      const vals = g.map(r => r[field]).filter(isValid).map(Number);
      out[field] = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
      out[field + "_max"] = vals.length ? Math.max(...vals) : null;
      out[field + "_min"] = vals.length ? Math.min(...vals) : null;
    });
    return out;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function DetailPage({ title, unit, color, onBack, renderExtras, chartConfig }) {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  // Important: the parent dashboard re-renders every second to update the live age text.
  // Arrays/objects created during those renders get new identities, so depending directly
  // on chartConfig.fields causes this page to refetch and remount the chart every second.
  // Stable keys make the chart fetch only when the selected metric or range changes.
  const fieldsKey = (chartConfig.fields || []).join("|");
  const barsKey = (chartConfig.bars || []).join("|");

  useEffect(() => {
    let alive = true;
    const fields = [...(chartConfig.fields || [])];
    setLoading(true);
    setError("");
    fetchHistoryRange(range)
      .then(rows => {
        if (!alive) return;
        const processed = aggregateRows(rows, range, fields);
        const primary = fields[0];
        const vals = primary ? rows.map(r => r[primary]).filter(isValid).map(Number) : [];
        if (vals.length) {
          const mn = Math.min(...vals), mx = Math.max(...vals);
          const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
          const mnRow = rows.find(r => Number(r[primary]) === mn);
          const mxRow = rows.find(r => Number(r[primary]) === mx);
          setStats({ avg, min: mn, max: mx, minTime: mnRow?.created_at, maxTime: mxRow?.created_at, count: vals.length });
        } else {
          setStats(null);
        }
        setData(processed);
        setLoading(false);
      })
      .catch(e => {
        if (!alive) return;
        setError(e.message || "Could not load history");
        setLoading(false);
      });
    return () => { alive = false; };
  }, [range, fieldsKey, barsKey]);

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"#0f172a", border:"1px solid #334155", color:"#f1f5f9", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:14, fontWeight:700 }}>← Dashboard</button>
        <div>
          <div style={{ fontSize:10, color:"#64748b", letterSpacing:1, textTransform:"uppercase" }}>Details</div>
          <h2 style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{title}</h2>
        </div>
      </div>

      {renderExtras && renderExtras()}

      <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        {["24h","7d","30d"].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ background: range===r ? color+"33" : "#1e293b", border: range===r ? `1px solid ${color}` : "1px solid #334155",
              color: range===r ? color : "#94a3b8", borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight: range===r ? 700 : 400 }}>
            {r}
          </button>
        ))}
      </div>
      <div style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>📈 {chartRangeLabel(range)}</div>

      <div style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:16, marginBottom:16 }}>
        {error ? <div style={{ textAlign:"center", padding:40, color:"#ef4444" }}>{error}</div> : loading ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading...</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="created_at" tickFormatter={(value) => fmtChartTick(value, range)} stroke="#475569" fontSize={10} interval="preserveStartEnd" minTickGap={range === "24h" ? 26 : 16} tickMargin={8} />
              <YAxis stroke="#475569" fontSize={10} domain={["auto","auto"]} />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, fontSize:12, color:"#f1f5f9" }} labelFormatter={fmtDateTime} />
              {(range==="7d"||range==="30d") && data[0] && (chartConfig.fields[0]+"_max") in data[0] &&
                <Area type="monotone" dataKey={chartConfig.fields[0]+"_max"} stroke="none" fill={color+"22"} />
              }
              {chartConfig.fields.map((f,i) => (
                <Line key={f} type="monotone" dataKey={f} stroke={chartConfig.colors?.[i]||color} dot={false} strokeWidth={2} name={chartConfig.labels?.[i]||f} connectNulls />
              ))}
              {chartConfig.bars?.map((f,i) => (
                <Bar key={f} dataKey={f} fill={chartConfig.barColors?.[i]||"#f59e0b"} opacity={0.6} name={chartConfig.barLabels?.[i]||f} />
              ))}
              {(chartConfig.fields.length > 1 || chartConfig.bars) && <Legend />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
          {[
            { label:"Average", value: stats.avg.toFixed(1), sub: range },
            { label:"Minimum", value: stats.min.toFixed(1), sub: stats.minTime ? fmtDateTime(stats.minTime) : "" },
            { label:"Maximum", value: stats.max.toFixed(1), sub: stats.maxTime ? fmtDateTime(stats.maxTime) : "" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:1, textTransform:"uppercase" }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color }}>{s.value}<span style={{ fontSize:11, color:"#64748b" }}> {unit}</span></div>
              <div style={{ fontSize:10, color:"#475569" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteDiagram({ route }) {
  const isDirect = route === "direct";
  const isRelay = route === "relay";
  const activeColor = isDirect ? "#22c55e" : isRelay ? "#3b82f6" : "#eab308";
  return (
    <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, fontSize:11 }}>
      <div style={{ color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>DATA ROUTE</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, opacity: isDirect ? 1 : 0.35, flexWrap:"wrap" }}>
        <span>☀️ Outdoor</span>
        <span style={{ color: isDirect ? "#22c55e" : "#475569" }}>──WiFi──▶</span>
        <span>☁️ Cloud</span>
        {isDirect && <span style={{ color:activeColor, fontWeight:700, marginLeft:8 }}>● ACTIVE</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, opacity: isRelay ? 1 : 0.35, flexWrap:"wrap" }}>
        <span>☀️ Outdoor</span>
        <span style={{ color: isRelay ? "#3b82f6" : "#475569" }}>──LoRa──▶</span>
        <span>📡 Indoor</span>
        <span style={{ color: isRelay ? "#3b82f6" : "#475569" }}>──WiFi──▶</span>
        <span>☁️ Cloud</span>
        {isRelay && <span style={{ color:activeColor, fontWeight:700, marginLeft:8 }}>● ACTIVE</span>}
      </div>
      {!isDirect && !isRelay && <div style={{ color:"#eab308", marginTop:6 }}>Route: {route || "unknown"}</div>}
    </div>
  );
}

export default function App() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [page, setPage] = useState("home");
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");

  const openPage = useCallback((next) => {
    if (!DETAIL_PAGE_KEYS.has(next)) return;
    if (typeof window !== "undefined") {
      window.history.pushState({ page: next }, "", `#${next}`);
    }
    setPage(next);
  }, []);

  const goHome = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState({ page: "home" }, "", window.location.pathname + window.location.search);
    }
    setPage("home");
  }, []);

  useEffect(() => {
    const syncFromLocation = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setPage(DETAIL_PAGE_KEYS.has(hash) ? hash : "home");
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, []);

  const fetchCurrent = useCallback(async () => {
    try {
      const data = await fetchLatestAndHistory();
      if (data.current) {
        setCurrent(data.current);
        setHistory(data.history || []);
        setStatus("live");
        setError("");
      } else {
        setStatus("no-data");
      }
    } catch (e) {
      setStatus("error");
      setError(e.message || "Connection error");
    }
  }, []);

  useEffect(() => {
    fetchCurrent();
    const i1 = setInterval(fetchCurrent, 15000);
    const i2 = setInterval(() => setTick(t=>t+1), 1000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchCurrent]);

  const ago = current ? ageSeconds(current.created_at) : null;
  const fl = current ? feelsLike(current.temperature, current.humidity, current.wind_speed || 0) : null;
  const dp = current ? dewPoint(current.temperature, current.humidity) : null;
  const battPct = current ? batteryPercent(current) : null;
  const loadW = current ? systemLoadWatts(current) : null;
  const guidance = current ? activityGuidance(current) : activityGuidance(null);
  // Keep the one-second tick active so the live age text refreshes.
  void tick;

  if (!current && status !== "live") {
    return (
      <div style={{ minHeight:"100vh", background:"#020617", color:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", fontFamily:"system-ui" }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <div style={{ fontSize:20, marginBottom:8 }}>{status==="no-data"?"Waiting for data...":status==="error"?"Connection error":"Connecting..."}</div>
        <div style={{ fontSize:13, color:"#64748b" }}>{error || "Ensure the weather station is powered on"}</div>
      </div>
    );
  }

  if (page !== "home" && current) {
    const configs = {
      temperature: { title:"Temperature", unit:"°C", color:"#f59e0b", fields:["temperature"], labels:["Temperature"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>FEELS LIKE</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#f59e0b" }}>{fl == null ? "--" : fl.toFixed(1)}°C</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>DEW POINT</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#3b82f6" }}>{dp == null ? "--" : dp.toFixed(1)}°C</div>
            </div>
          </div>
        )},
      humidity: { title:"Humidity", unit:"%", color:"#3b82f6", fields:["humidity"], labels:["Humidity"] },
      pressure: { title:"Pressure", unit:"hPa", color:"#8b5cf6", fields:["pressure"], labels:["Pressure"] },
      wind: { title:"Wind", unit:"km/h", color:"#f59e0b", fields:["wind_speed_avg","wind_gust"], labels:["Average","Gust"], colors:["#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1.4fr .8fr", gap:12, marginBottom:16 }} className="detailGrid">
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:16 }}>
              <WindSummaryPanel row={current} />
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:1, textTransform:"uppercase" }}>Wind comfort</div>
              <div style={{ fontSize:28, fontWeight:900, color:"#f59e0b" }}>Force {beaufort(current.wind_speed_avg || current.wind_speed)}</div>
              <div style={{ fontSize:13, color:"#94a3b8", marginBottom:10 }}>{beaufortDesc(beaufort(current.wind_speed_avg || current.wind_speed))}</div>
              <div style={{ fontSize:12, color:"#cbd5e1", lineHeight:1.45 }}>🌬️ {windAdvice(current.wind_gust || current.wind_speed_avg || current.wind_speed)}</div>
            </div>
          </div>
        )},
      "air-quality": { title:"Air Quality", unit:"µg/m³", color: pmColor(current?.pm2_5), fields:["pm1_0","pm2_5","pm10"], labels:["PM1.0","PM2.5","PM10"], colors:["#22c55e","#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ background: pmColor(current.pm2_5)+"15", border:`1px solid ${pmColor(current.pm2_5)}44`, borderRadius:10, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:28, fontWeight:700, color:pmColor(current.pm2_5) }}>{displayInt(current.pm2_5)}</span>
            <span style={{ fontSize:13, color:"#94a3b8", marginLeft:8 }}>µg/m³ PM2.5</span>
            <span style={{ background:pmColor(current.pm2_5)+"33", color:pmColor(current.pm2_5), padding:"2px 10px", borderRadius:6, fontSize:12, fontWeight:700, marginLeft:12 }}>{pmLabel(current.pm2_5)}</span>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:8 }}>{pmAdvice(current.pm2_5)}</div>
          </div>
        )},
      uv: { title:"UV Index", unit:"", color: uvColor(current?.uv_index), fields:["uv_index","uv_peak"], labels:["UV Index","UV Peak"], colors:[uvColor(current?.uv_index),"#a855f7"],
        extras: () => (
          <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:32, fontWeight:700, color:uvColor(current.uv_index) }}>{display(current.uv_index, 1)}</span>
            <span style={{ fontSize:14, color:"#94a3b8", marginLeft:8 }}>{uvLabel(current.uv_index)}</span>
            <div style={{ height:8, background:"#1e293b", borderRadius:4, marginTop:10, overflow:"hidden" }}>
              <div style={{ width:Math.min(100,n(current.uv_index,0)/12*100)+"%", height:"100%", background:"linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444,#a855f7)", borderRadius:4 }} />
            </div>
          </div>
        )},
      battery: { title:"Battery & Load", unit:"V", color:"#22c55e", fields:["battery_voltage"], labels:["Voltage"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>BATTERY</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#22c55e" }}>{display(current.battery_voltage, 3)}V</div>
              <div style={{ fontSize:11, color:"#64748b" }}>{battPct == null ? "--" : battPct}% · 10Ah solar battery</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>LOAD CURRENT</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#3b82f6" }}>{display(current.battery_current, 1)}mA</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>SYSTEM LOAD</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#f59e0b" }}>{loadW == null ? "--" : loadW.toFixed(2)}W</div>
            </div>
          </div>
        )},
      power: { title:"Power Use", unit:"W", color:"#f59e0b", fields:["system_load_watts"], labels:["System Load"] },
      signal: { title:"Signal Strength", unit:"dBm", color:"#8b5cf6", fields:["rssi"], labels:["WiFi RSSI"],
        extras: () => (
          <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:10, color:"#64748b" }}>TECHNICAL STATUS</div>
            <div style={{ fontSize:14, color:"#94a3b8", lineHeight:1.8 }}>
              Route: <b style={{ color:"#f1f5f9" }}>{current.route || "--"}</b><br />
              WiFi RSSI: <b style={{ color:"#f1f5f9" }}>{displayInt(current.rssi)} dBm</b><br />
              LoRa: <b style={{ color:"#f1f5f9" }}>{isValid(current.lora_rssi) ? `${current.lora_rssi} dBm / ${display(current.lora_snr,1)} dB` : "--"}</b><br />
              Packet: <b style={{ color:"#f1f5f9" }}>#{current.packet_number || "--"}</b><br />
              Firmware: <b style={{ color:"#f1f5f9" }}>{current.firmware_version || "--"}</b>
            </div>
          </div>
        )},
    };

    const cfg = configs[page];
    if (cfg) {
      return (
        <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617,#0f172a,#020617)", color:"#f1f5f9", fontFamily:"system-ui", padding:"20px 16px" }}>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} *{box-sizing:border-box}`}</style>
          <DetailPage title={cfg.title} unit={cfg.unit} color={cfg.color} onBack={goHome}
            renderExtras={cfg.extras} chartConfig={{ fields: cfg.fields, labels: cfg.labels, colors: cfg.colors, bars: cfg.bars, barColors: cfg.barColors, barLabels: cfg.barLabels }} />
        </div>
      );
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617,#0f172a,#020617)", color:"#f1f5f9", fontFamily:"system-ui", padding:"20px 16px" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box;margin:0;padding:0} @media(max-width:820px){.dashGrid{grid-template-columns:1fr!important}.wide{grid-column:span 1!important}.headerWrap{align-items:flex-start!important}.statsLine{display:block!important}.detailGrid{grid-template-columns:1fr!important}.healthGrid{grid-template-columns:repeat(2,1fr)!important}} @media(max-width:560px){.wide{display:block!important}.wide>div{margin-bottom:8px}.healthGrid{display:grid!important;grid-template-columns:1fr!important}.healthGrid>button{margin-bottom:0!important}}`}</style>

      <div className="headerWrap" style={{ maxWidth:900, margin:"0 auto 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0, background:"linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>SOLAR WEATHER STATION</h1>
          <div style={{ fontSize:11, color:"#64748b" }}>IZKI, OMAN — SCHOOL PROJECT</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:stationColor(current?.created_at), animation: ageSeconds(current?.created_at)<=420?"pulse 2s infinite":"none" }} />
          <span style={{ fontSize:11, color:"#64748b" }}>{stationLabel(current?.created_at)}</span>
        </div>
      </div>

      {error && <div style={{ maxWidth:900, margin:"0 auto 12px", background:"#451a1a", border:"1px solid #991b1b", color:"#fecaca", padding:12, borderRadius:10, fontSize:13 }}>{error}</div>}

      {current && (
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, animation:"fadeIn .5s ease" }} className="dashGrid">
          <div className="wide" style={{ gridColumn:"span 3", background:guidance.color+"15", border:`1px solid ${guidance.color}55`, borderRadius:14, padding:"14px 16px", display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:32 }}>{guidance.icon}</div>
            <div>
              <div style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>OUTDOOR ACTIVITY GUIDANCE</div>
              <div style={{ fontSize:17, fontWeight:900, color:guidance.color }}>{guidance.title}</div>
              <div style={{ fontSize:12, color:"#cbd5e1", marginTop:2 }}>{guidance.message}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {guidance.points.map((p, i) => (
                  <span key={i} style={{ border:"1px solid #334155", background:"#020617", borderRadius:999, padding:"3px 8px", fontSize:10, color:"#94a3b8" }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right", minWidth:86 }}>
              <div style={{ color:pmColor(current.pm2_5), fontWeight:900, fontSize:22 }}>🌫️ {displayInt(current.pm2_5)}</div>
              <div style={{ color:uvColor(current.uv_index), fontWeight:800, fontSize:16 }}>☀️ UV {display(current.uv_index,1)}</div>
            </div>
          </div>

          <MetricCard icon="🌡️" title="Temperature" value={display(current.temperature,1)} unit="°C" color="#f59e0b"
            sub={`Feels ${fl == null ? "--" : fl.toFixed(1)}°C`} sparkData={history} sparkKey="temperature"
            dot={<Dot value={current.temperature} lastUpdate={current.created_at} />} onClick={() => openPage("temperature")} />

          <MetricCard icon="💧" title="Humidity" value={display(current.humidity,0)} unit="%" color="#3b82f6"
            sub={`Dew ${dp == null ? "--" : dp.toFixed(1)}°C`} sparkData={history} sparkKey="humidity"
            dot={<Dot value={current.humidity} lastUpdate={current.created_at} />} onClick={() => openPage("humidity")} />

          <MetricCard icon="🧭" title="Pressure" value={display(current.pressure,1)} unit="hPa" color="#8b5cf6"
            sparkData={history} sparkKey="pressure"
            dot={<Dot value={current.pressure} lastUpdate={current.created_at} />} onClick={() => openPage("pressure")} />

          <div onClick={() => openPage("wind")} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", position:"relative", minHeight:132 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ width:28, height:28, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:10, background:"#f59e0b18", border:"1px solid #f59e0b55", fontSize:16 }}>🌬️</span><span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>Wind</span></div>
              <Dot value={current.wind_speed_avg || current.wind_speed} lastUpdate={current.created_at} />
            </div>
            <WindSummaryPanel row={current} compact />
            <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap for details →</div>
          </div>

          <MetricCard icon="🌫️" title="Air Quality" value={displayInt(current.pm2_5)} unit="µg/m³"
            color={pmColor(current.pm2_5)} sub={`PM2.5 — ${pmLabel(current.pm2_5)}`}
            sparkData={history} sparkKey="pm2_5"
            dot={<Dot value={current.pm2_5} lastUpdate={current.created_at} />} onClick={() => openPage("air-quality")} />

          <MetricCard icon="☀️" title="UV Index" value={display(current.uv_index,1)} unit=""
            color={uvColor(current.uv_index)} sub={uvLabel(current.uv_index)}
            sparkData={history} sparkKey="uv_index"
            dot={<Dot value={current.uv_index} lastUpdate={current.created_at} />} onClick={() => openPage("uv")} />

          <StationHealthPanel row={current} battPct={battPct} loadW={loadW} onOpen={openPage} />

          <div className="wide" style={{ gridColumn:"span 3", textAlign:"center", padding:8, fontSize:11, color:"#475569" }}>
            <span className="statsLine">{current.created_at && `Last: ${fmtDateTime(current.created_at)} Oman time`}</span>
            {current.uptime_minutes != null && <span className="statsLine">{` | Up: ${uptimeText(current.uptime_minutes)}`}</span>}
            {current.packet_number && <span className="statsLine">{` | Pkt #${current.packet_number}`}</span>}
            {current.firmware_version && <span className="statsLine">{` | FW ${current.firmware_version}`}</span>}
            <span className="statsLine">{" | Solar powered ☀"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
