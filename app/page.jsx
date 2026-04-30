"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid, Bar, BarChart, ComposedChart, Legend } from "recharts";

const SUPA = "https://yyvebygwvnkczaaduxns.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dmVieWd3dm5rY3phYWR1eG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjcxOTAsImV4cCI6MjA5MjM0MzE5MH0.uY2oxDEQJNRIVAD_GH1r5fgrDKaUWQ4RLOg5vunYAx0";

const WIND_DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const degToCompass = d => WIND_DIRS[Math.round(d/22.5)%16];
const fmtTime = d => new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const fmtDate = d => new Date(d).toLocaleDateString([],{month:"short",day:"numeric"});
const fmtDateTime = d => new Date(d).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

const sensorOK = v => v !== null && v !== undefined && v > -900 && v !== -1;
const dotColor = (v, lastUpdate) => {
  if (!sensorOK(v)) return "#ef4444";
  const age = (Date.now() - new Date(lastUpdate).getTime()) / 60000;
  return age > 10 ? "#eab308" : "#22c55e";
};

const pmColor = v => v <= 12 ? "#22c55e" : v <= 35 ? "#eab308" : v <= 55 ? "#f97316" : "#ef4444";
const pmLabel = v => v <= 12 ? "Good" : v <= 35 ? "Moderate" : v <= 55 ? "Unhealthy (SG)" : "Unhealthy";
const uvColor = v => v < 3 ? "#22c55e" : v < 6 ? "#eab308" : v < 8 ? "#f97316" : v < 11 ? "#ef4444" : "#a855f7";
const uvLabel = v => v < 3 ? "Low" : v < 6 ? "Moderate" : v < 8 ? "High" : v < 11 ? "Very High" : "Extreme";
const beaufort = k => k<1?0:k<6?1:k<12?2:k<20?3:k<29?4:k<39?5:k<50?6:k<62?7:k<75?8:k<89?9:k<103?10:k<118?11:12;
const beaufortDesc = b => ["Calm","Light air","Light breeze","Gentle breeze","Moderate breeze","Fresh breeze","Strong breeze","Near gale","Gale","Strong gale","Storm","Violent storm","Hurricane"][b] || "";
const feelsLike = (t,h,w) => {
  if(t>27&&h>40) return -8.78+1.61*t+2.34*h-0.15*t*h-0.01*t*t-0.02*h*h+0.002*t*t*h+0.0007*t*h*h-0.0000036*t*t*h*h;
  if(t<10&&w>4.8) return 13.12+0.62*t-11.37*Math.pow(w,0.16)+0.40*t*Math.pow(w,0.16);
  return t;
};
const dewPoint = (t,h) => { const a=17.27,b=237.7,g=(a*t/(b+t))+Math.log(h/100); return (b*g)/(a-g); };
const battPct = v => Math.min(100,Math.max(0,Math.round(((v-2.5)/(3.65-2.5))*100)));

async function fetchSupa(path) {
  const r = await fetch(`${SUPA}${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return r.ok ? r.json() : [];
}

// ============================================================
// MINI SPARKLINE
// ============================================================
function Spark({ data, dataKey, color, h = 40 }) {
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  return (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// STATUS DOT
// ============================================================
function Dot({ value, lastUpdate }) {
  const c = dotColor(value, lastUpdate);
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:c, marginLeft:6, verticalAlign:"middle", animation: c==="#22c55e"?"pulse 2s infinite":"none" }} />;
}

// ============================================================
// METRIC CARD (tappable)
// ============================================================
function MetricCard({ title, value, unit, sub, color, sparkData, sparkKey, dot, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"border-color 0.2s", position:"relative" }}
      onMouseEnter={e => e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>{title}</span>
        {dot}
      </div>
      <div style={{ fontSize:26, fontWeight:700, color: color||"#f1f5f9", lineHeight:1.1 }}>
        {value}<span style={{ fontSize:13, color:"#64748b", marginLeft:3 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
      {sparkData && <Spark data={sparkData} dataKey={sparkKey} color={color||"#3b82f6"} h={30} />}
      <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap for details →</div>
    </div>
  );
}

// ============================================================
// WIND COMPASS SVG
// ============================================================
function WindCompass({ direction, speed, size = 140 }) {
  const r=size/2-12, cx=size/2, cy=size/2;
  const rad=(direction-90)*Math.PI/180;
  const ax=cx+r*0.7*Math.cos(rad), ay=cy+r*0.7*Math.sin(rad);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:"100%", maxWidth:size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2" />
      {[["N",0],["E",90],["S",180],["W",270]].map(([l,a])=>{
        const ar=(a-90)*Math.PI/180;
        return <text key={l} x={cx+(r+10)*Math.cos(ar)} y={cy+(r+10)*Math.sin(ar)} fill="#94a3b8" fontSize="10" textAnchor="middle" dominantBaseline="middle">{l}</text>;
      })}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ax} cy={ay} r="4" fill="#f59e0b" />
      <text x={cx} y={cy+4} fill="#f1f5f9" fontSize="12" textAnchor="middle" fontWeight="bold">{speed?.toFixed(1)}</text>
    </svg>
  );
}

// ============================================================
// DETAIL PAGE — Generic with time range selector
// ============================================================
function DetailPage({ title, current, unit, color, onBack, renderExtras, chartConfig }) {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    let interval, limit, groupBy;
    if (range === "24h") { interval = "24 hours"; limit = 500; }
    else if (range === "7d") { interval = "7 days"; limit = 2500; }
    else { interval = "30 days"; limit = 10000; }

    const ts = new Date(Date.now() - (range==="24h"?86400000:range==="7d"?604800000:2592000000)).toISOString();

    fetchSupa(`/rest/v1/weather_readings?created_at=gte.${ts}&order=created_at.asc&limit=${limit}`)
      .then(rows => {
        let processed = rows;
        if (range === "7d" || range === "30d") {
          // Group by hour (7d) or day (30d)
          const groups = {};
          rows.forEach(r => {
            const d = new Date(r.created_at);
            const key = range==="7d"
              ? d.toISOString().slice(0,13)
              : d.toISOString().slice(0,10);
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
          });
          processed = Object.entries(groups).map(([k,g]) => {
            const avg = field => {
              const vals = g.map(r=>r[field]).filter(v=>sensorOK(v));
              return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
            };
            const max = field => {
              const vals = g.map(r=>r[field]).filter(v=>sensorOK(v));
              return vals.length ? Math.max(...vals) : null;
            };
            const min = field => {
              const vals = g.map(r=>r[field]).filter(v=>sensorOK(v));
              return vals.length ? Math.min(...vals) : null;
            };
            return { created_at: g[0].created_at, ...Object.fromEntries(
              chartConfig.fields.flatMap(f => [
                [f, avg(f)], [f+"_max", max(f)], [f+"_min", min(f)]
              ])
            )};
          });
        }

        // Compute stats
        const primary = chartConfig.fields[0];
        const vals = rows.map(r => r[primary]).filter(v => sensorOK(v));
        if (vals.length) {
          const mn = Math.min(...vals), mx = Math.max(...vals);
          const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
          const mnRow = rows.find(r => r[primary] === mn);
          const mxRow = rows.find(r => r[primary] === mx);
          setStats({ avg, min: mn, max: mx, minTime: mnRow?.created_at, maxTime: mxRow?.created_at, count: vals.length });
        }
        setData(processed);
        setLoading(false);
      });
  }, [range]);

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:14 }}>← Back</button>
        <h2 style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{title}</h2>
      </div>

      {renderExtras && renderExtras()}

      {/* Time range selector */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {["24h","7d","30d"].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ background: range===r ? color+"33" : "#1e293b", border: range===r ? `1px solid ${color}` : "1px solid #334155",
              color: range===r ? color : "#94a3b8", borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight: range===r ? 700 : 400 }}>
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:16, marginBottom:16 }}>
        {loading ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading...</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="created_at" tickFormatter={range==="30d" ? fmtDate : fmtTime} stroke="#475569" fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke="#475569" fontSize={10} domain={["auto","auto"]} />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, fontSize:12 }}
                labelFormatter={fmtDateTime} />
              {(range==="7d"||range==="30d") && chartConfig.fields[0]+"_min" in (data[0]||{}) &&
                <Area type="monotone" dataKey={chartConfig.fields[0]+"_max"} stroke="none" fill={color+"22"} />
              }
              {chartConfig.fields.map((f,i) => (
                <Line key={f} type="monotone" dataKey={f} stroke={chartConfig.colors?.[i]||color} dot={false} strokeWidth={2} name={chartConfig.labels?.[i]||f} />
              ))}
              {chartConfig.bars?.map((f,i) => (
                <Bar key={f} dataKey={f} fill={chartConfig.barColors?.[i]||"#f59e0b"} opacity={0.6} name={chartConfig.barLabels?.[i]||f} />
              ))}
              {chartConfig.fields.length > 1 && <Legend />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
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

// ============================================================
// CONNECTION ROUTING DIAGRAM
// ============================================================
function RouteDiagram({ route, outdoorWifi, indoorWifi }) {
  const isDirect = route === "direct";
  return (
    <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, fontSize:11 }}>
      <div style={{ color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>DATA ROUTE</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, opacity: isDirect ? 1 : 0.3 }}>
        <span>☀️ Outdoor</span>
        <span style={{ color: isDirect ? "#22c55e" : "#475569" }}>──WiFi──▶</span>
        <span>☁️ Supabase</span>
        {isDirect && <span style={{ color:"#22c55e", fontWeight:700, marginLeft:8 }}>● ACTIVE</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, opacity: !isDirect ? 1 : 0.3 }}>
        <span>☀️ Outdoor</span>
        <span style={{ color: !isDirect ? "#3b82f6" : "#475569" }}>──LoRa──▶</span>
        <span>📡 Indoor</span>
        <span style={{ color: !isDirect ? "#3b82f6" : "#475569" }}>──WiFi──▶</span>
        <span>☁️ Supabase</span>
        {!isDirect && <span style={{ color:"#3b82f6", fontWeight:700, marginLeft:8 }}>● ACTIVE</span>}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [page, setPage] = useState("home");
  const [tick, setTick] = useState(0);

  const fetchCurrent = useCallback(async () => {
    try {
      const data = await fetchSupa("/rest/v1/weather_readings?order=created_at.desc&limit=60");
      if (data.length) {
        setCurrent(data[0]);
        setHistory([...data].reverse());
        setStatus("live");
      } else { setStatus("no-data"); }
    } catch { setStatus("error"); }
  }, []);

  useEffect(() => {
    fetchCurrent();
    const i1 = setInterval(fetchCurrent, 10000);
    const i2 = setInterval(() => setTick(t=>t+1), 1000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchCurrent]);

  const ago = current ? Math.round((Date.now() - new Date(current.created_at).getTime())/1000) : null;
  const fl = current ? feelsLike(current.temperature, current.humidity, current.wind_speed||0) : 0;
  const dp = current ? dewPoint(current.temperature, current.humidity) : 0;

  if (!current && status !== "live") {
    return (
      <div style={{ minHeight:"100vh", background:"#020617", color:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", fontFamily:"system-ui" }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <div style={{ fontSize:20, marginBottom:8 }}>{status==="no-data"?"Waiting for data...":status==="error"?"Connection error":"Connecting..."}</div>
        <div style={{ fontSize:13, color:"#64748b" }}>Ensure the weather station is powered on</div>
      </div>
    );
  }

  // ---- DETAIL PAGES ----
  if (page !== "home" && current) {
    const configs = {
      temperature: { title:"Temperature", unit:"°C", color:"#f59e0b", fields:["temperature"], labels:["Temperature"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>FEELS LIKE</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#f59e0b" }}>{fl.toFixed(1)}°C</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>DEW POINT</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#3b82f6" }}>{dp.toFixed(1)}°C</div>
            </div>
          </div>
        )},
      humidity: { title:"Humidity", unit:"%", color:"#3b82f6", fields:["humidity"], labels:["Humidity"] },
      pressure: { title:"Pressure", unit:"hPa", color:"#8b5cf6", fields:["pressure"], labels:["Pressure"] },
      wind: { title:"Wind", unit:"km/h", color:"#f59e0b", fields:["wind_speed_avg","wind_gust"], labels:["Average","Gust"], colors:["#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <WindCompass direction={current.wind_direction||0} speed={current.wind_speed||0} size={160} />
              <div style={{ color:"#f59e0b", fontWeight:700, marginTop:4 }}>{degToCompass(current.wind_direction||0)} ({(current.wind_direction||0).toFixed(0)}°)</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, color:"#64748b" }}>BEAUFORT SCALE</div>
              <div style={{ fontSize:28, fontWeight:700, color:"#f59e0b" }}>Force {beaufort(current.wind_speed||0)}</div>
              <div style={{ fontSize:13, color:"#94a3b8" }}>{beaufortDesc(beaufort(current.wind_speed||0))}</div>
              <div style={{ fontSize:10, color:"#64748b", marginTop:12 }}>GUST</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#ef4444" }}>{(current.wind_gust||0).toFixed(1)} km/h</div>
            </div>
          </div>
        )},
      "air-quality": { title:"Air Quality", unit:"µg/m³", color: pmColor(current?.pm2_5||0), fields:["pm1_0","pm2_5","pm10"], labels:["PM1.0","PM2.5","PM10"], colors:["#22c55e","#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ background: pmColor(current.pm2_5)+"15", border:`1px solid ${pmColor(current.pm2_5)}44`, borderRadius:10, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:28, fontWeight:700, color:pmColor(current.pm2_5) }}>{current.pm2_5}</span>
            <span style={{ fontSize:13, color:"#94a3b8", marginLeft:8 }}>µg/m³ PM2.5</span>
            <span style={{ background:pmColor(current.pm2_5)+"33", color:pmColor(current.pm2_5), padding:"2px 10px", borderRadius:6, fontSize:12, fontWeight:700, marginLeft:12 }}>{pmLabel(current.pm2_5)}</span>
          </div>
        )},
      uv: { title:"UV Index", unit:"", color: uvColor(current?.uv_index||0), fields:["uv_index","uv_peak"], labels:["UV Index","UV Peak"], colors:[uvColor(current?.uv_index||0),"#a855f7"],
        extras: () => (
          <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:32, fontWeight:700, color:uvColor(current.uv_index) }}>{(current.uv_index||0).toFixed(1)}</span>
            <span style={{ fontSize:14, color:"#94a3b8", marginLeft:8 }}>{uvLabel(current.uv_index||0)}</span>
            <div style={{ height:8, background:"#1e293b", borderRadius:4, marginTop:10, overflow:"hidden" }}>
              <div style={{ width:Math.min(100,(current.uv_index||0)/12*100)+"%", height:"100%", background:"linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444,#a855f7)", borderRadius:4 }} />
            </div>
          </div>
        )},
      battery: { title:"Battery", unit:"V", color:"#22c55e", fields:["battery_voltage"], labels:["Voltage"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>VOLTAGE</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#22c55e" }}>{(current.battery_voltage||0).toFixed(3)}V</div>
              <div style={{ fontSize:11, color:"#64748b" }}>{battPct(current.battery_voltage||0)}%</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>CURRENT</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#3b82f6" }}>{(current.battery_current||0).toFixed(1)}mA</div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b" }}>POWER</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#f59e0b" }}>{(current.battery_power||0).toFixed(1)}mW</div>
            </div>
          </div>
        )},
      solar: { title:"Solar Power", unit:"W", color:"#f59e0b", fields:["solar_watts"], labels:["Solar Watts"] },
      signal: { title:"Signal Strength", unit:"dBm", color:"#8b5cf6", fields:["rssi"], labels:["WiFi RSSI"],
        extras: () => current.lora_rssi ? (
          <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:10, color:"#64748b" }}>LORA SIGNAL</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#8b5cf6" }}>{current.lora_rssi} dBm / {(current.lora_snr||0).toFixed(1)} dB SNR</div>
          </div>
        ) : null },
    };

    const cfg = configs[page];
    if (cfg) {
      return (
        <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617,#0f172a,#020617)", color:"#f1f5f9", fontFamily:"system-ui", padding:"20px 16px" }}>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          <DetailPage title={cfg.title} current={current[cfg.fields[0]]} unit={cfg.unit} color={cfg.color} onBack={() => setPage("home")}
            renderExtras={cfg.extras} chartConfig={{ fields: cfg.fields, labels: cfg.labels, colors: cfg.colors, bars: cfg.bars, barColors: cfg.barColors, barLabels: cfg.barLabels }} />
        </div>
      );
    }
  }

  // ---- HOME DASHBOARD ----
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617,#0f172a,#020617)", color:"#f1f5f9", fontFamily:"system-ui", padding:"20px 16px" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{ maxWidth:900, margin:"0 auto 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0, background:"linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>SOLAR WEATHER STATION</h1>
          <div style={{ fontSize:11, color:"#64748b" }}>IZKI, OMAN — SCHOOL PROJECT</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: status==="live"?"#22c55e":"#ef4444", animation: status==="live"?"pulse 2s infinite":"none" }} />
          <span style={{ fontSize:11, color:"#64748b" }}>{status==="live" ? `LIVE — ${ago}s ago` : "OFFLINE"}</span>
        </div>
      </div>

      {current && (
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, animation:"fadeIn .5s ease" }}>
          <MetricCard title="Temperature" value={(current.temperature||0).toFixed(1)} unit="°C" color="#f59e0b"
            sub={`Feels ${fl.toFixed(1)}°C`} sparkData={history} sparkKey="temperature"
            dot={<Dot value={current.temperature} lastUpdate={current.created_at} />} onClick={() => setPage("temperature")} />

          <MetricCard title="Humidity" value={(current.humidity||0).toFixed(0)} unit="%" color="#3b82f6"
            sub={`Dew ${dp.toFixed(1)}°C`} sparkData={history} sparkKey="humidity"
            dot={<Dot value={current.humidity} lastUpdate={current.created_at} />} onClick={() => setPage("humidity")} />

          <MetricCard title="Pressure" value={(current.pressure||0).toFixed(1)} unit="hPa" color="#8b5cf6"
            sparkData={history} sparkKey="pressure"
            dot={<Dot value={current.pressure} lastUpdate={current.created_at} />} onClick={() => setPage("pressure")} />

          {/* Wind card */}
          <div onClick={() => setPage("wind")} style={{ background:"linear-gradient(145deg,#0f172a,#1e293b)", border:"1px solid #334155", borderRadius:12, padding:"14px 16px", cursor:"pointer", position:"relative" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#64748b"} onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>WIND</span>
              <Dot value={current.wind_speed} lastUpdate={current.created_at} />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", margin:"4px 0" }}>
              <WindCompass direction={current.wind_direction||0} speed={current.wind_speed_avg||current.wind_speed||0} size={120} />
            </div>
            <div style={{ textAlign:"center", fontSize:11, color:"#94a3b8" }}>
              {degToCompass(current.wind_direction||0)} | Gust: {(current.wind_gust||0).toFixed(1)}
            </div>
            <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color:"#475569" }}>tap →</div>
          </div>

          <MetricCard title="Air Quality" value={current.pm2_5 >= 0 ? current.pm2_5 : "--"} unit="µg/m³"
            color={pmColor(current.pm2_5||0)} sub={`PM2.5 — ${pmLabel(current.pm2_5||0)}`}
            sparkData={history} sparkKey="pm2_5"
            dot={<Dot value={current.pm2_5} lastUpdate={current.created_at} />} onClick={() => setPage("air-quality")} />

          <MetricCard title="UV Index" value={(current.uv_index||0).toFixed(1)} unit=""
            color={uvColor(current.uv_index||0)} sub={uvLabel(current.uv_index||0)}
            sparkData={history} sparkKey="uv_index"
            dot={<Dot value={current.uv_index} lastUpdate={current.created_at} />} onClick={() => setPage("uv")} />

          {/* Battery + Solar + Signal row */}
          <MetricCard title="Battery" value={(current.battery_voltage||0).toFixed(2)} unit="V"
            color={current.battery_voltage > 3.1 ? "#22c55e" : "#ef4444"}
            sub={`${battPct(current.battery_voltage||0)}% | ${(current.battery_current||0).toFixed(0)}mA`}
            sparkData={history} sparkKey="battery_voltage"
            dot={<Dot value={current.battery_voltage} lastUpdate={current.created_at} />} onClick={() => setPage("battery")} />

          <MetricCard title="Solar" value={(current.solar_watts||0).toFixed(1)} unit="W"
            color="#f59e0b" sub={`${(current.battery_power||0).toFixed(0)}mW`}
            sparkData={history} sparkKey="solar_watts"
            dot={<Dot value={1} lastUpdate={current.created_at} />} onClick={() => setPage("solar")} />

          <MetricCard title="Signal" value={current.rssi||0} unit="dBm"
            color={current.rssi > -70 ? "#22c55e" : current.rssi > -85 ? "#eab308" : "#ef4444"}
            sub={current.lora_rssi ? `LoRa: ${current.lora_rssi}dBm` : "Direct WiFi"}
            sparkData={history} sparkKey="rssi"
            dot={<Dot value={1} lastUpdate={current.created_at} />} onClick={() => setPage("signal")} />

          {/* Route + Status — full width */}
          <div style={{ gridColumn:"span 3" }}>
            <RouteDiagram route={current.route||"direct"} outdoorWifi={current.outdoor_wifi} indoorWifi={current.indoor_wifi} />
          </div>

          {/* Footer */}
          <div style={{ gridColumn:"span 3", textAlign:"center", padding:8, fontSize:11, color:"#475569" }}>
            {current.created_at && `Last: ${fmtDateTime(current.created_at)}`}
            {current.uptime_minutes != null && ` | Up: ${Math.floor(current.uptime_minutes/60)}h${current.uptime_minutes%60}m`}
            {current.packet_number && ` | Pkt #${current.packet_number}`}
            {current.firmware_version && ` | FW ${current.firmware_version}`}
            {" | Powered by solar energy ☀"}
          </div>
        </div>
      )}
    </div>
  );
}
