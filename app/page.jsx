"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function MetricCard({ title, value, unit, sub, color, sparkData, sparkKey, dot, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"border-color 0.2s", position:"relative", minHeight:132 }}
      onMouseEnter={e => e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>{title}</span>
        {dot}
      </div>
      <div style={{ fontSize:26, fontWeight:700, color: color||"#f1f5f9", lineHeight:1.1 }}>
        {value}<span style={{ fontSize:13, color:"#64748b", marginLeft:3 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
      {sparkData && sparkKey && <Spark data={sparkData} dataKey={sparkKey} color={color||"#3b82f6"} h={30} />}
      <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap for details →</div>
    </div>
  );
}

function WindCompass({ direction, speed, size = 140 }) {
  const dir = n(direction, 0);
  const r = size / 2 - 12, cx = size / 2, cy = size / 2;
  const rad = (dir - 90) * Math.PI / 180;
  const ax = cx + r * 0.7 * Math.cos(rad), ay = cy + r * 0.7 * Math.sin(rad);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:"100%", maxWidth:size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2" />
      {[["N",0],["E",90],["S",180],["W",270]].map(([l,a])=>{
        const ar = (a - 90) * Math.PI / 180;
        return <text key={l} x={cx+(r+10)*Math.cos(ar)} y={cy+(r+10)*Math.sin(ar)} fill="#94a3b8" fontSize="10" textAnchor="middle" dominantBaseline="middle">{l}</text>;
      })}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ax} cy={ay} r="4" fill="#f59e0b" />
      <text x={cx} y={cy+4} fill="#f1f5f9" fontSize="12" textAnchor="middle" fontWeight="bold">{display(speed, 1)}</text>
    </svg>
  );
}

function aggregateRows(rows, range, fields) {
  if (range === "24h") return rows;
  const groups = {};
  rows.forEach(r => {
    const d = new Date(r.created_at);
    const key = range === "7d" ? d.toISOString().slice(0, 13) : d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.entries(groups).map(([, g]) => {
    const out = { created_at: g[0].created_at };
    fields.forEach(field => {
      const vals = g.map(r => r[field]).filter(isValid).map(Number);
      out[field] = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
      out[field + "_max"] = vals.length ? Math.max(...vals) : null;
      out[field + "_min"] = vals.length ? Math.min(...vals) : null;
    });
    return out;
  });
}

function DetailPage({ title, unit, color, onBack, renderExtras, chartConfig }) {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchHistoryRange(range)
      .then(rows => {
        if (!alive) return;
        const processed = aggregateRows(rows, range, chartConfig.fields);
        const primary = chartConfig.fields[0];
        const vals = rows.map(r => r[primary]).filter(isValid).map(Number);
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
  }, [range, chartConfig.fields]);

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:14 }}>← Back</button>
        <h2 style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{title}</h2>
      </div>

      {renderExtras && renderExtras()}

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {["24h","7d","30d"].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ background: range===r ? color+"33" : "#1e293b", border: range===r ? `1px solid ${color}` : "1px solid #334155",
              color: range===r ? color : "#94a3b8", borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight: range===r ? 700 : 400 }}>
            {r}
          </button>
        ))}
      </div>

      <div style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:16, marginBottom:16 }}>
        {error ? <div style={{ textAlign:"center", padding:40, color:"#ef4444" }}>{error}</div> : loading ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading...</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="created_at" tickFormatter={range==="30d" ? fmtDate : fmtTime} stroke="#475569" fontSize={10} interval="preserveStartEnd" />
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <WindCompass direction={current.wind_direction} speed={current.wind_speed} size={160} />
              <div style={{ color:"#f59e0b", fontWeight:700, marginTop:4 }}>{degToCompass(current.wind_direction)} ({display(current.wind_direction, 0)}°)</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>BEAUFORT SCALE</div>
              <div style={{ fontSize:28, fontWeight:700, color:"#f59e0b" }}>Force {beaufort(current.wind_speed)}</div>
              <div style={{ fontSize:13, color:"#94a3b8" }}>{beaufortDesc(beaufort(current.wind_speed))}</div>
              <div style={{ fontSize:10, color:"#64748b", marginTop:12 }}>GUST</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#ef4444" }}>{display(current.wind_gust, 1)} km/h</div>
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
          <DetailPage title={cfg.title} unit={cfg.unit} color={cfg.color} onBack={() => setPage("home")}
            renderExtras={cfg.extras} chartConfig={{ fields: cfg.fields, labels: cfg.labels, colors: cfg.colors, bars: cfg.bars, barColors: cfg.barColors, barLabels: cfg.barLabels }} />
        </div>
      );
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617,#0f172a,#020617)", color:"#f1f5f9", fontFamily:"system-ui", padding:"20px 16px" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box;margin:0;padding:0} @media(max-width:820px){.dashGrid{grid-template-columns:1fr!important}.wide{grid-column:span 1!important}.headerWrap{align-items:flex-start!important}.statsLine{display:block!important}}`}</style>

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
          <div className="wide" style={{ gridColumn:"span 3", background:pmColor(current.pm2_5)+"15", border:`1px solid ${pmColor(current.pm2_5)}55`, borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>OUTDOOR ACTIVITY GUIDANCE</div>
              <div style={{ fontSize:16, fontWeight:800, color:pmColor(current.pm2_5) }}>{pmLabel(current.pm2_5)}</div>
              <div style={{ fontSize:12, color:"#94a3b8" }}>{pmAdvice(current.pm2_5)}</div>
            </div>
            <div style={{ textAlign:"right", color:pmColor(current.pm2_5), fontWeight:800, fontSize:24 }}>{displayInt(current.pm2_5)}<span style={{ fontSize:12, color:"#94a3b8", marginLeft:4 }}>PM2.5</span></div>
          </div>

          <MetricCard title="Temperature" value={display(current.temperature,1)} unit="°C" color="#f59e0b"
            sub={`Feels ${fl == null ? "--" : fl.toFixed(1)}°C`} sparkData={history} sparkKey="temperature"
            dot={<Dot value={current.temperature} lastUpdate={current.created_at} />} onClick={() => setPage("temperature")} />

          <MetricCard title="Humidity" value={display(current.humidity,0)} unit="%" color="#3b82f6"
            sub={`Dew ${dp == null ? "--" : dp.toFixed(1)}°C`} sparkData={history} sparkKey="humidity"
            dot={<Dot value={current.humidity} lastUpdate={current.created_at} />} onClick={() => setPage("humidity")} />

          <MetricCard title="Pressure" value={display(current.pressure,1)} unit="hPa" color="#8b5cf6"
            sparkData={history} sparkKey="pressure"
            dot={<Dot value={current.pressure} lastUpdate={current.created_at} />} onClick={() => setPage("pressure")} />

          <div onClick={() => setPage("wind")} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", position:"relative", minHeight:132 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>WIND</span>
              <Dot value={current.wind_speed} lastUpdate={current.created_at} />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", margin:"4px 0" }}>
              <WindCompass direction={current.wind_direction} speed={isValid(current.wind_speed_avg) ? current.wind_speed_avg : current.wind_speed} size={120} />
            </div>
            <div style={{ textAlign:"center", fontSize:11, color:"#94a3b8" }}>
              {degToCompass(current.wind_direction)} | Gust: {display(current.wind_gust,1)}
            </div>
            <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap →</div>
          </div>

          <MetricCard title="Air Quality" value={displayInt(current.pm2_5)} unit="µg/m³"
            color={pmColor(current.pm2_5)} sub={`PM2.5 — ${pmLabel(current.pm2_5)}`}
            sparkData={history} sparkKey="pm2_5"
            dot={<Dot value={current.pm2_5} lastUpdate={current.created_at} />} onClick={() => setPage("air-quality")} />

          <MetricCard title="UV Index" value={display(current.uv_index,1)} unit=""
            color={uvColor(current.uv_index)} sub={uvLabel(current.uv_index)}
            sparkData={history} sparkKey="uv_index"
            dot={<Dot value={current.uv_index} lastUpdate={current.created_at} />} onClick={() => setPage("uv")} />

          <MetricCard title="Battery" value={display(current.battery_voltage,2)} unit="V"
            color={n(current.battery_voltage,0) > 3.1 ? "#22c55e" : "#ef4444"}
            sub={`${battPct == null ? "--" : battPct}% | ${display(current.battery_current,0)}mA load`}
            sparkData={history} sparkKey="battery_voltage"
            dot={<Dot value={current.battery_voltage} lastUpdate={current.created_at} />} onClick={() => setPage("battery")} />

          <MetricCard title="Power Use" value={loadW == null ? "--" : loadW.toFixed(2)} unit="W"
            color="#f59e0b" sub="board + sensors from 10Ah battery"
            sparkData={history} sparkKey="system_load_watts"
            dot={<Dot value={current.battery_voltage} lastUpdate={current.created_at} />} onClick={() => setPage("power")} />

          <MetricCard title="Signal" value={displayInt(current.rssi)} unit="dBm"
            color={n(current.rssi,-100) > -70 ? "#22c55e" : n(current.rssi,-100) > -85 ? "#eab308" : "#ef4444"}
            sub={isValid(current.lora_rssi) ? `LoRa: ${current.lora_rssi}dBm` : (current.route === "direct" ? "Direct WiFi" : "Relay status")}
            sparkData={history} sparkKey="rssi"
            dot={<Dot value={current.rssi || 1} lastUpdate={current.created_at} />} onClick={() => setPage("signal")} />

          <div style={{ gridColumn:"span 3" }} className="wide">
            <RouteDiagram route={current.route || "direct"} />
          </div>

          <div className="wide" style={{ gridColumn:"span 3", textAlign:"center", padding:8, fontSize:11, color:"#475569" }}>
            <span className="statsLine">{current.created_at && `Last: ${fmtDateTime(current.created_at)} Oman time`}</span>
            {current.uptime_minutes != null && <span className="statsLine">{` | Up: ${Math.floor(current.uptime_minutes/60)}h${current.uptime_minutes%60}m`}</span>}
            {current.packet_number && <span className="statsLine">{` | Pkt #${current.packet_number}`}</span>}
            {current.firmware_version && <span className="statsLine">{` | FW ${current.firmware_version}`}</span>}
            <span className="statsLine">{" | Solar powered ☀"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
