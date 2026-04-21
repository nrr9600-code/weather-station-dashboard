"use client";
import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://yyvebygwvnkczaaduxns.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dmVieWd3dm5rY3phYWR1eG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjcxOTAsImV4cCI6MjA5MjM0MzE5MH0.uY2oxDEQJNRIVAD_GH1r5fgrDKaUWQ4RLOg5vunYAx0";

const WIND_DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const degToCompass = (d) => WIND_DIRS[Math.round(d / 22.5) % 16];

const pmColor = (v) => v <= 12 ? "#22c55e" : v <= 35 ? "#eab308" : v <= 55 ? "#f97316" : "#ef4444";
const pmLabel = (v) => v <= 12 ? "Good" : v <= 35 ? "Moderate" : v <= 55 ? "Unhealthy (SG)" : "Unhealthy";
const uvColor = (v) => v < 3 ? "#22c55e" : v < 6 ? "#eab308" : v < 8 ? "#f97316" : v < 11 ? "#ef4444" : "#a855f7";

function WindCompass({ direction, speed }) {
  const r = 58, cx = 70, cy = 70;
  const rad = (direction - 90) * Math.PI / 180;
  const ax = cx + r * 0.7 * Math.cos(rad);
  const ay = cy + r * 0.7 * Math.sin(rad);
  const dirs = [["N",0],["E",90],["S",180],["W",270]];
  return (
    <svg viewBox="0 0 140 140" style={{ width: "100%", maxWidth: 180 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={r*0.7} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3"/>
      <circle cx={cx} cy={cy} r={r*0.35} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,4"/>
      {dirs.map(([l,a]) => {
        const ar = (a-90)*Math.PI/180;
        return <text key={l} x={cx+(r+10)*Math.cos(ar)} y={cy+(r+10)*Math.sin(ar)} fill="#94a3b8" fontSize="10" textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace">{l}</text>;
      })}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <circle cx={ax} cy={ay} r="4" fill="#f59e0b"/>
      <circle cx={cx} cy={cy} r="3" fill="#475569"/>
      <text x={cx} y={cy+2} fill="#f1f5f9" fontSize="11" textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace" fontWeight="bold">{speed?.toFixed(1)}</text>
    </svg>
  );
}

function Gauge({ value, min, max, unit, label, color, decimals = 1 }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#f1f5f9", fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
        {value?.toFixed(decimals)}
        <span style={{ fontSize: 13, color: "#64748b", marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ height: 4, background: "#1e293b", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color || "#3b82f6", borderRadius: 2, transition: "width 0.6s ease" }}/>
      </div>
    </div>
  );
}

function Sparkline({ data, color, height = 40 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - mn) / range) * 80 - 10}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height, display: "block", marginTop: 6 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

function Card({ children, span = 1, style = {} }) {
  return (
    <div style={{
      background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
      border: "1px solid #334155",
      borderRadius: 12,
      padding: "16px 18px",
      gridColumn: `span ${span}`,
      ...style
    }}>
      {children}
    </div>
  );
}

export default function WeatherDashboard() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/weather_readings?order=created_at.desc&limit=50`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (data.length > 0) {
        setCurrent(data[0]);
        setHistory([...data].reverse());
        setLastUpdate(new Date());
        setStatus("live");
      } else {
        setStatus("no-data");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 5000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => { clearInterval(dataInterval); clearInterval(tickInterval); };
  }, [fetchData]);

  const ago = lastUpdate ? Math.round((Date.now() - lastUpdate) / 1000) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%)",
      color: "#f1f5f9",
      fontFamily: "'Space Mono', 'JetBrains Mono', monospace",
      padding: "20px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: 0, background: "linear-gradient(90deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SOLAR WEATHER STATION
          </h1>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>IZKI, OMAN — SCHOOL PROJECT</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: status === "live" ? "#22c55e" : status === "error" ? "#ef4444" : "#eab308",
            animation: status === "live" ? "pulse 2s infinite" : "none"
          }}/>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            {status === "live" ? `LIVE — ${ago}s ago` : status === "error" ? "CONNECTION ERROR" : status === "no-data" ? "NO DATA YET" : "CONNECTING..."}
          </span>
        </div>
      </div>

      {!current ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>
            {status === "no-data" ? "Waiting for first data packet..." : status === "error" ? "Cannot reach Supabase" : "Connecting..."}
          </div>
          <div style={{ fontSize: 12 }}>Make sure the ESP32 is sending data</div>
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, animation: "fadeIn 0.5s ease" }}>
          
          {/* Temperature */}
          <Card>
            <Gauge value={current.temperature} min={0} max={55} unit="°C" label="Temperature" color="#f59e0b"/>
            <Sparkline data={history.map(h => h.temperature)} color="#f59e0b" height={30}/>
          </Card>

          {/* Humidity */}
          <Card>
            <Gauge value={current.humidity} min={0} max={100} unit="%" label="Humidity" color="#3b82f6"/>
            <Sparkline data={history.map(h => h.humidity)} color="#3b82f6" height={30}/>
          </Card>

          {/* Pressure */}
          <Card>
            <Gauge value={current.pressure} min={930} max={1050} unit="hPa" label="Pressure" color="#8b5cf6"/>
            <Sparkline data={history.map(h => h.pressure)} color="#8b5cf6" height={30}/>
          </Card>

          {/* Wind */}
          <Card>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>WIND</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WindCompass direction={current.wind_direction} speed={current.wind_speed}/>
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                {degToCompass(current.wind_direction)} ({current.wind_direction?.toFixed(0)}°)
              </span>
              <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>
                {current.wind_speed?.toFixed(1)} km/h
              </span>
            </div>
          </Card>

          {/* Air Quality */}
          <Card>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>AIR QUALITY</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: pmColor(current.pm2_5) }}>{current.pm2_5}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>µg/m³ PM2.5</span>
            </div>
            <div style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 4,
              background: pmColor(current.pm2_5) + "22", color: pmColor(current.pm2_5),
              fontSize: 11, fontWeight: 700, marginBottom: 8
            }}>
              {pmLabel(current.pm2_5)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
              <span>PM1.0: {current.pm1_0}</span>
              <span>PM10: {current.pm10}</span>
            </div>
            <Sparkline data={history.map(h => h.pm2_5)} color={pmColor(current.pm2_5)} height={25}/>
          </Card>

          {/* UV Index */}
          <Card>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>UV INDEX</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: uvColor(current.uv_index) }}>{current.uv_index?.toFixed(1)}</div>
            <div style={{ height: 6, background: "#1e293b", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
              <div style={{
                width: Math.min(100, (current.uv_index / 12) * 100) + "%", height: "100%",
                background: "linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444, #a855f7)",
                borderRadius: 3, transition: "width 0.6s ease"
              }}/>
            </div>
            <Sparkline data={history.map(h => h.uv_index)} color={uvColor(current.uv_index)} height={25}/>
          </Card>

          {/* Station Status — full width */}
          <Card span={3}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>BATTERY</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: current.battery_voltage > 3.1 ? "#22c55e" : "#ef4444" }}>
                  {current.battery_voltage?.toFixed(2)}<span style={{ fontSize: 11, color: "#64748b" }}> V</span>
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {Math.min(100, Math.max(0, Math.round(((current.battery_voltage - 2.5) / (3.65 - 2.5)) * 100)))}%
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>SOLAR</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>
                  {current.solar_watts?.toFixed(1)}<span style={{ fontSize: 11, color: "#64748b" }}> W</span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>SIGNAL</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: current.rssi > -70 ? "#22c55e" : current.rssi > -85 ? "#eab308" : "#ef4444" }}>
                  {current.rssi}<span style={{ fontSize: 11, color: "#64748b" }}> dBm</span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>UPTIME</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#8b5cf6" }}>
                  {current.uptime_minutes >= 60 ? Math.floor(current.uptime_minutes/60) + "h " + (current.uptime_minutes%60) + "m" : current.uptime_minutes + "m"}
                </div>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <Card span={3} style={{ textAlign: "center", padding: "10px 18px", background: "transparent", border: "1px solid #1e293b" }}>
            <span style={{ fontSize: 11, color: "#475569" }}>
              Last reading: {new Date(current.created_at).toLocaleString()} — Powered entirely by solar energy
            </span>
          </Card>
        </div>
      )}
    </div>
  );
}
