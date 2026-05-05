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
const WIND_DIRS_AR = ["ش","ش ش ق","ش ق","ق ش ق","ق","ق ج ق","ج ق","ج ج ق","ج","ج ج غ","ج غ","غ ج غ","غ","غ ش غ","ش غ","ش ش غ"];
const DETAIL_PAGE_KEYS = new Set(["temperature","humidity","pressure","wind","air-quality","uv","battery","power","signal"]);

const I18N = {
  en: {
    langName: "English",
    switchLang: "عربي",
    title: "Solar Weather Station",
    location: "Izki, Oman — School Project",
    connecting: "Connecting...",
    waiting: "Waiting for data...",
    connError: "Connection error",
    ensureOn: "Ensure the weather station is powered on",
    live: "Live",
    delayed: "Delayed",
    offline: "Offline",
    agoSec: "s ago",
    agoMin: "m ago",
    details: "Details",
    dashboard: "Dashboard",
    loading: "Loading...",
    avg: "Average",
    min: "Minimum",
    max: "Maximum",
    temp: "Temperature",
    humidity: "Humidity",
    pressure: "Pressure",
    wind: "Wind",
    airQuality: "Air Quality",
    uvIndex: "UV Index",
    feels: "Feels",
    feelsLike: "Feels like",
    dew: "Dew",
    dewPoint: "Dew point",
    windComfort: "Wind comfort",
    averageWind: "Average wind speed",
    gust: "Gust",
    from: "From",
    pm25: "PM2.5",
    uvPeak: "UV Peak",
    batteryLoad: "Battery & Load",
    battery: "Battery",
    loadCurrent: "Load current",
    systemLoad: "System load",
    powerUse: "Power Use",
    signalStrength: "Signal Strength",
    technicalStatus: "Technical status",
    route: "Route",
    wifiRssi: "WiFi RSSI",
    lora: "LoRa",
    packet: "Packet",
    firmware: "Firmware",
    activityTitle: "Outdoor Activity Guidance",
    stationHealth: "Station health",
    stationHealthSub: "Battery, power, connection, and data delivery status.",
    wifiSignal: "WiFi signal",
    rfLink: "RF link",
    dataRoute: "Data route",
    solarBattery: "10Ah solar battery",
    boardSensors: "Board + sensors",
    directUpload: "Direct upload",
    indoorRelay: "Indoor relay",
    queued: "Queued",
    unknown: "Unknown",
    standby: "Standby",
    waitingRelay: "Waiting",
    directWifiActive: "Direct WiFi active",
    relayNoSignal: "Relay signal not reported yet",
    directRouteSub: "Outdoor station sent the reading",
    relayRouteSub: "Indoor unit forwarded the reading",
    waitingRoute: "Waiting for route",
    noReading: "No reading",
    good: "Good",
    normal: "Normal",
    low: "Low",
    critical: "Critical",
    excellent: "Excellent",
    fair: "Fair",
    weak: "Weak",
    poor: "Poor",
    moderate: "Moderate",
    unhealthySensitive: "Unhealthy for sensitive groups",
    lowUv: "Low",
    high: "High",
    veryHigh: "Very high",
    extreme: "Extreme",
    last: "Last",
    up: "Up",
    pkt: "Pkt",
    fw: "FW",
    solarPowered: "Solar powered",
    tapDetails: "tap for details →",
    chart24: "5-minute readings across the last 24 hours",
    chart72: "Hourly average readings across the last 72 hours",
    chart7: "Daily averages across the last 7 days",
    chart30: "Daily averages across the last 30 days",
    themeHot: "Hot sun mode",
    themeWind: "Windy mode",
    themeHaze: "Hazy air mode",
    themeDay: "Day mode",
    themeNight: "Night theme",
    modeNormal: "Normal conditions",
  },
  ar: {
    langName: "العربية",
    switchLang: "EN",
    title: "محطة الطقس الشمسية",
    location: "إزكي، عُمان — مشروع مدرسي",
    connecting: "جارٍ الاتصال...",
    waiting: "بانتظار البيانات...",
    connError: "خطأ في الاتصال",
    ensureOn: "تأكد أن محطة الطقس تعمل",
    live: "مباشر",
    delayed: "متأخر",
    offline: "متوقف",
    agoSec: "ث مضت",
    agoMin: "د مضت",
    details: "التفاصيل",
    dashboard: "لوحة الطقس",
    loading: "جارٍ التحميل...",
    avg: "المتوسط",
    min: "الأدنى",
    max: "الأعلى",
    temp: "درجة الحرارة",
    humidity: "الرطوبة",
    pressure: "الضغط الجوي",
    wind: "الرياح",
    airQuality: "جودة الهواء",
    uvIndex: "مؤشر الأشعة فوق البنفسجية",
    feels: "المحسوسة",
    feelsLike: "درجة الحرارة المحسوسة",
    dew: "الندى",
    dewPoint: "نقطة الندى",
    windComfort: "حالة الرياح",
    averageWind: "متوسط سرعة الرياح",
    gust: "هبات",
    from: "من",
    pm25: "الجسيمات الدقيقة PM2.5",
    uvPeak: "أعلى مؤشر UV",
    batteryLoad: "البطارية والاستهلاك",
    battery: "البطارية",
    loadCurrent: "تيار الحمل",
    systemLoad: "استهلاك النظام",
    powerUse: "استهلاك الطاقة",
    signalStrength: "قوة الإشارة",
    technicalStatus: "الحالة التقنية",
    route: "مسار البيانات",
    wifiRssi: "إشارة WiFi",
    lora: "LoRa",
    packet: "الحزمة",
    firmware: "البرنامج",
    activityTitle: "توصيات الأنشطة الخارجية",
    stationHealth: "حالة المحطة",
    stationHealthSub: "البطارية، الطاقة، الاتصال، ووصول البيانات.",
    wifiSignal: "إشارة WiFi",
    rfLink: "رابط RF",
    dataRoute: "مسار البيانات",
    solarBattery: "بطارية شمسية 10Ah",
    boardSensors: "اللوحة + الحساسات",
    directUpload: "رفع مباشر",
    indoorRelay: "عبر الوحدة الداخلية",
    queued: "في الانتظار",
    unknown: "غير معروف",
    standby: "احتياطي",
    waitingRelay: "بانتظار الإشارة",
    directWifiActive: "الرفع المباشر نشط",
    relayNoSignal: "لم تُسجل إشارة الترحيل بعد",
    directRouteSub: "الوحدة الخارجية أرسلت القراءة مباشرة",
    relayRouteSub: "الوحدة الداخلية مررت القراءة",
    waitingRoute: "بانتظار تحديد المسار",
    noReading: "لا توجد قراءة",
    good: "جيد",
    normal: "طبيعي",
    low: "منخفض",
    critical: "حرج",
    excellent: "ممتاز",
    fair: "مقبول",
    weak: "ضعيف",
    poor: "سيئ",
    moderate: "متوسط",
    unhealthySensitive: "غير صحي للفئات الحساسة",
    lowUv: "منخفض",
    high: "مرتفع",
    veryHigh: "مرتفع جدًا",
    extreme: "شديد الخطورة",
    last: "آخر تحديث",
    up: "تشغيل",
    pkt: "حزمة",
    fw: "إصدار",
    solarPowered: "تعمل بالطاقة الشمسية",
    tapDetails: "اضغط للتفاصيل ←",
    chart24: "قراءات كل 5 دقائق خلال آخر 24 ساعة",
    chart72: "متوسطات كل ساعة خلال آخر 72 ساعة",
    chart7: "متوسطات يومية خلال آخر 7 أيام",
    chart30: "متوسطات يومية خلال آخر 30 يومًا",
    themeHot: "وضع الحرارة العالية",
    themeWind: "وضع الرياح",
    themeHaze: "وضع الغبار والضباب",
    themeDay: "وضع النهار",
    themeNight: "النمط الليلي",
    modeNormal: "ظروف طبيعية",
  }
};

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

function localeFor(lang) {
  return lang === "ar" ? "ar-OM-u-nu-latn" : "en-OM";
}

function degToCompass(d, lang = "en") {
  if (!isValid(d)) return "--";
  const idx = Math.round(Number(d) / 22.5) % 16;
  return lang === "ar" ? WIND_DIRS_AR[idx] : WIND_DIRS[idx];
}

function fmtTime(d, lang = "en") {
  if (!d) return "--";
  return new Date(d).toLocaleTimeString(localeFor(lang), { timeZone: OMAN_TZ, hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d, lang = "en") {
  if (!d) return "--";
  return new Date(d).toLocaleDateString(localeFor(lang), { timeZone: OMAN_TZ, month: "short", day: "numeric" });
}

function fmtDayDate(d, lang = "en") {
  if (!d) return "--";
  return new Date(d).toLocaleDateString(localeFor(lang), { timeZone: OMAN_TZ, weekday: "short", day: "numeric" });
}

function fmtHourDate(d, lang = "en") {
  if (!d) return "--";
  const dt = new Date(d);
  const day = dt.toLocaleDateString(localeFor(lang), { timeZone: OMAN_TZ, weekday: "short", day: "numeric" });
  const hour = dt.toLocaleTimeString(localeFor(lang), { timeZone: OMAN_TZ, hour: "2-digit", minute: "2-digit" });
  return `${day} ${hour}`;
}

function fmtChartTick(d, range, lang = "en") {
  if (range === "24h") return fmtTime(d, lang);
  if (range === "72h") return fmtHourDate(d, lang);
  if (range === "7d") return fmtDayDate(d, lang);
  return fmtDate(d, lang);
}

function chartRangeLabel(range, t) {
  if (range === "24h") return t.chart24;
  if (range === "72h") return t.chart72;
  if (range === "7d") return t.chart7;
  return t.chart30;
}

function localDayKey(d) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: OMAN_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(d));
  const get = type => parts.find(p => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function localHourKey(d) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: OMAN_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date(d));
  const get = type => parts.find(p => p.type === type)?.value || "00";
  const hr = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hr}`;
}

function fmtDateTime(d, lang = "en") {
  if (!d) return "--";
  return new Date(d).toLocaleString(localeFor(lang), { timeZone: OMAN_TZ, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function omanHourAt(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: OMAN_TZ, hour: "2-digit", hour12: false }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === "hour")?.value || 0);
  return hour === 24 ? 0 : hour;
}

function isCurrentOmanNight() {
  const hour = omanHourAt(new Date());
  return hour >= 18 || hour < 6;
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

function formatAgeDuration(totalSeconds, lang = "en") {
  if (!Number.isFinite(totalSeconds)) return "--";
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec < 60) {
    return lang === "ar" ? `${sec} ثانية` : `${sec}s`;
  }

  const minutes = Math.floor(sec / 60);
  if (minutes < 60) {
    return lang === "ar" ? `${minutes} دقيقة` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    if (lang === "ar") return mins ? `${hours} ساعة و${mins} دقيقة` : `${hours} ساعة`;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (lang === "ar") return remHours ? `${days} يوم و${remHours} ساعة` : `${days} يوم`;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

function agoText(totalSeconds, lang = "en") {
  const duration = formatAgeDuration(totalSeconds, lang);
  return lang === "ar" ? `قبل ${duration}` : `${duration} ago`;
}

function stationLabel(lastUpdate, t, lang = "en") {
  const age = ageSeconds(lastUpdate);
  if (!Number.isFinite(age)) return t.waiting.toUpperCase();
  const ago = agoText(age, lang);
  if (age <= 420) return `${t.live} — ${ago}`;
  if (age <= 1200) return `${t.delayed} — ${ago}`;
  return `${t.offline} — ${ago}`;
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

function pmLabel(v, t) {
  if (!isValid(v)) return t.noReading;
  const x = Number(v);
  return x <= 12 ? t.good : x <= 35 ? t.moderate : x <= 55 ? t.unhealthySensitive : t.poor;
}

function pmAdvice(v, lang) {
  if (!isValid(v)) return lang === "ar" ? "حساس جودة الهواء لا يرسل قراءة حاليًا." : "Air-quality sensor is not reporting yet.";
  const x = Number(v);
  if (lang === "ar") {
    if (x <= 12) return "جودة الهواء مناسبة للأنشطة الخارجية المعتادة.";
    if (x <= 35) return "الأفضل أن يخفف الطلاب الحساسون النشاط الشديد في الخارج.";
    if (x <= 55) return "يُفضل نقل الأنشطة الشديدة إلى الداخل للفئات الحساسة.";
    return "لا يُنصح بالأنشطة الخارجية حاليًا.";
  }
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

function uvLabel(v, t) {
  if (!isValid(v)) return t.noReading;
  const x = Number(v);
  return x < 3 ? t.lowUv : x < 6 ? t.moderate : x < 8 ? t.high : x < 11 ? t.veryHigh : t.extreme;
}

function uvAdvice(v, lang) {
  if (!isValid(v)) return lang === "ar" ? "قراءة الأشعة فوق البنفسجية غير متوفرة حاليًا." : "UV sensor is not reporting yet.";
  const x = Number(v);
  if (lang === "ar") {
    if (x < 3) return "مستوى UV منخفض. تكفي الحماية المعتادة من الشمس.";
    if (x < 6) return "استخدم الظل والقبعات وواقي الشمس عند البقاء خارجًا لفترة أطول.";
    if (x < 8) return "UV مرتفع. يُفضل الظل وتقليل التعرض وقت الظهيرة.";
    if (x < 11) return "UV مرتفع جدًا. اجعل الأنشطة قصيرة مع حماية قوية من الشمس.";
    return "UV شديد الخطورة. تجنب الشمس المباشرة قدر الإمكان.";
  }
  if (x < 3) return "UV is low. Normal sun protection is enough.";
  if (x < 6) return "Use shade, hats, and sunscreen for longer outdoor time.";
  if (x < 8) return "High UV. Prefer shade and avoid long midday exposure.";
  if (x < 11) return "Very high UV. Keep activities short and use strong sun protection.";
  return "Extreme UV. Avoid direct sun where possible.";
}

function windAdvice(v, lang) {
  if (!isValid(v)) return lang === "ar" ? "حساس الرياح لا يرسل قراءة حاليًا." : "Wind sensor is not reporting yet.";
  const x = Number(v);
  if (lang === "ar") {
    if (x < 20) return "الرياح خفيفة ومريحة.";
    if (x < 39) return "الجو عليل. ثبّت الأوراق والأجسام الخفيفة.";
    if (x < 50) return "الرياح نشطة. انتبه للمعدات والمظلات الخارجية.";
    return "رياح قوية. الأنشطة والهياكل المؤقتة تحتاج إلى حذر.";
  }
  if (x < 20) return "Wind is light and comfortable.";
  if (x < 39) return "Breezy. Secure papers, light objects, and shade covers.";
  if (x < 50) return "Windy. Avoid loose equipment and check outdoor setups.";
  return "Strong wind. Outdoor activities and temporary structures need caution.";
}

function activityGuidance(row, lang, t, opts = {}) {
  const isNight = !!opts.isNight;
  const isFresh = opts.isFresh !== false;
  if (!row) return { icon:"⏳", title:t.waiting, message: lang === "ar" ? "لم ترسل المحطة بيانات بعد." : "The station has not sent data yet.", color:"#64748b", points:[] };
  if (!isFresh) {
    return {
      icon:"📡",
      title: lang === "ar" ? "المحطة غير محدثة" : "Station is not updating",
      message: lang === "ar" ? "تُعرض آخر قراءة معروفة. تحقق من الظروف يدويًا قبل الأنشطة الخارجية." : "Showing the last known reading. Check conditions manually before outdoor activity.",
      color:"#eab308",
      points:[]
    };
  }
  let level = 0;
  const points = [];
  const add = (en, ar) => points.push(lang === "ar" ? ar : en);

  const pm = Number(row.pm2_5);
  if (isValid(row.pm2_5)) {
    if (pm > 55) { level = Math.max(level, 3); add("Air quality is poor. Move outdoor activity indoors.", "جودة الهواء سيئة. انقل الأنشطة الخارجية إلى الداخل."); }
    else if (pm > 35) { level = Math.max(level, 2); add("Air quality is unhealthy for sensitive students.", "جودة الهواء غير مناسبة للطلاب الحساسين."); }
    else if (pm > 12) { level = Math.max(level, 1); add("Air quality is moderate. Sensitive students should take it easy.", "جودة الهواء متوسطة. يُفضل تخفيف النشاط للطلاب الحساسين."); }
    else add("Air quality is good.", "جودة الهواء جيدة.");
  }
  const uv = Number(row.uv_index);
  if (!isNight && isValid(row.uv_index)) {
    if (uv >= 11) { level = Math.max(level, 3); add("Extreme UV. Avoid direct sun where possible.", "UV شديد الخطورة. تجنب الشمس المباشرة قدر الإمكان."); }
    else if (uv >= 8) { level = Math.max(level, 2); add("Very high UV. Use shade, hats, and sunscreen.", "UV مرتفع جدًا. استخدم الظل والقبعات وواقي الشمس."); }
    else if (uv >= 6) { level = Math.max(level, 2); add("High UV. Keep outdoor time shorter at midday.", "UV مرتفع. قلل وقت الخارج وقت الظهيرة."); }
    else if (uv >= 3) { level = Math.max(level, 1); add("Moderate UV. Sun protection is recommended.", "UV متوسط. يُنصح بالحماية من الشمس."); }
    else add("UV is low.", "UV منخفض.");
  } else if (isNight) {
    add("It is night now, so UV is not a concern.", "الوقت ليل الآن، لذلك لا توجد مشكلة من الأشعة فوق البنفسجية.");
  }
  const wind = Number(row.wind_gust ?? row.wind_speed_avg ?? row.wind_speed);
  if (isValid(wind)) {
    if (wind >= 50) { level = Math.max(level, 3); add("Strong wind. Avoid loose outdoor equipment.", "رياح قوية. تجنب المعدات الخارجية غير المثبتة."); }
    else if (wind >= 39) { level = Math.max(level, 2); add("Windy. Secure light objects and check shade covers.", "رياح نشطة. ثبّت الأشياء الخفيفة وتحقق من المظلات."); }
    else if (wind >= 25) { level = Math.max(level, 1); add("Breezy conditions. Light objects may move.", "أجواء عليلة. قد تتحرك الأشياء الخفيفة."); }
  }
  const temp = Number(row.temperature);
  if (isValid(row.temperature)) {
    if (temp >= 42) { level = Math.max(level, 3); add("Extreme heat. Keep activity indoors or very short.", "حرارة شديدة. اجعل النشاط في الداخل أو قصيرًا جدًا."); }
    else if (temp >= 38) { level = Math.max(level, 2); add(isNight ? "Very hot evening. Hydration and shorter outdoor time are important." : "Very hot. Hydration and shade breaks are important.", isNight ? "المساء حار جدًا. الماء وتقليل مدة البقاء في الخارج مهمان." : "الجو حار جدًا. الماء والظل ضروريان."); }
    else if (temp >= 34) { level = Math.max(level, 1); add(isNight ? "Warm evening. Drink water if staying outside." : "Hot weather. Drink water and use shade.", isNight ? "المساء دافئ. اشرب الماء عند البقاء خارجًا." : "الجو حار. اشرب الماء واستخدم الظل."); }
  }
  const presets = lang === "ar"
    ? [
        { icon:"✅", title:"مناسب للأنشطة الخارجية", message:"الظروف مناسبة للأنشطة الخارجية المعتادة.", color:"#22c55e" },
        { icon:"🟡", title:"الأنشطة الخارجية ممكنة مع الانتباه", message:"يمكن استمرار معظم الأنشطة مع احتياطات بسيطة.", color:"#eab308" },
        { icon:"⚠️", title:"قلل الأنشطة الخارجية الشديدة", message:"يفضل الظل، جلسات أقصر، واستراحات أكثر.", color:"#f97316" },
        { icon:"🚫", title:"انقل الأنشطة الحساسة إلى الداخل", message:"الظروف الحالية غير مناسبة للأنشطة الخارجية.", color:"#ef4444" },
      ]
    : [
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

function beaufortDesc(b, lang = "en") {
  const en = ["Calm","Light air","Light breeze","Gentle breeze","Moderate breeze","Fresh breeze","Strong breeze","Near gale","Gale","Strong gale","Storm","Violent storm","Hurricane"];
  const ar = ["هادئ","هواء خفيف","نسيم خفيف","نسيم لطيف","نسيم متوسط","نسيم نشط","رياح قوية","قريب من العاصفة","عاصف","عاصف جدًا","عاصفة","عاصفة عنيفة","إعصار"];
  return (lang === "ar" ? ar : en)[b] || "";
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

function uptimeText(minutes, lang = "en") {
  if (!isValid(minutes)) return "--";
  const m = Math.max(0, Math.round(Number(minutes)));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (lang === "ar") {
    if (d > 0) return `${d}ي ${h}س`;
    if (h > 0) return `${h}س ${mm}د`;
    return `${mm}د`;
  }
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

function wifiQuality(rssi, t) {
  if (!isValid(rssi)) return { label:t.unknown, bars:0, color:"#64748b" };
  const x = Number(rssi);
  if (x >= -60) return { label:t.excellent, bars:5, color:"#22c55e" };
  if (x >= -70) return { label:t.good, bars:4, color:"#22c55e" };
  if (x >= -80) return { label:t.fair, bars:3, color:"#eab308" };
  if (x >= -90) return { label:t.weak, bars:2, color:"#f97316" };
  return { label:t.poor, bars:1, color:"#ef4444" };
}

function rfQuality(row, t) {
  if (!row) return { label:t.unknown, bars:0, color:"#64748b", text:"--" };
  if (isValid(row.lora_rssi)) {
    const x = Number(row.lora_rssi);
    if (x >= -70) return { label:t.excellent, bars:5, color:"#22c55e", text:`${Math.round(x)} dBm` };
    if (x >= -90) return { label:t.good, bars:4, color:"#22c55e", text:`${Math.round(x)} dBm` };
    if (x >= -105) return { label:t.fair, bars:3, color:"#eab308", text:`${Math.round(x)} dBm` };
    if (x >= -115) return { label:t.weak, bars:2, color:"#f97316", text:`${Math.round(x)} dBm` };
    return { label:t.poor, bars:1, color:"#ef4444", text:`${Math.round(x)} dBm` };
  }
  if ((row.route || "") === "direct") return { label:t.standby, bars:0, color:"#64748b", text:t.directWifiActive };
  return { label:t.waitingRelay, bars:0, color:"#64748b", text:t.relayNoSignal };
}

function routeFriendly(route, t) {
  if (route === "direct") return t.directUpload;
  if (route === "relay") return t.indoorRelay;
  if (route === "queued") return t.queued;
  return route || t.unknown;
}

function batteryStateLabel(pct, t) {
  if (pct == null) return { label:t.unknown, color:"#64748b" };
  if (pct >= 60) return { label:t.good, color:"#22c55e" };
  if (pct >= 30) return { label:t.normal, color:"#eab308" };
  if (pct >= 15) return { label:t.low, color:"#f97316" };
  return { label:t.critical, color:"#ef4444" };
}

function weatherTheme(row, t) {
  const night = isCurrentOmanNight();
  const age = ageSeconds(row?.created_at);
  const isFresh = Number.isFinite(age) && age <= 20 * 60;

  const temp = isFresh ? n(row?.temperature, 0) : 0;
  const uv = isFresh ? n(row?.uv_index, 0) : 0;
  const pm = isFresh ? n(row?.pm2_5, 0) : 0;
  const wind = isFresh ? Math.max(n(row?.wind_gust, 0), n(row?.wind_speed_avg, 0), n(row?.wind_speed, 0)) : 0;

  let mode = "normal";
  let modeLabel = t.modeNormal;
  let modeIcon = night ? "🌙" : "☀️";
  let modeAccent = night ? "#60a5fa" : "#0ea5e9";

  if (isFresh) {
    if (pm > 55) {
      mode = "haze";
      modeLabel = t.themeHaze;
      modeIcon = "🌫️";
      modeAccent = "#eab308";
    } else if (temp >= 40 || uv >= 8) {
      mode = "heat";
      modeLabel = t.themeHot;
      modeIcon = "🔥";
      modeAccent = "#f97316";
    } else if (wind >= 35 && temp < 39) {
      mode = "wind";
      modeLabel = t.themeWind;
      modeIcon = "🌬️";
      modeAccent = "#22d3ee";
    }
  }

  const common = {
    mode,
    modeLabel,
    modeIcon,
    isFresh,
    text: night ? "#f8fafc" : "#f8fafc",
    muted: night ? "#94a3b8" : "#dbeafe",
    soft: night ? "#64748b" : "#bfdbfe",
    panel: night ? "rgba(15,23,42,.90)" : "rgba(12,74,110,.70)",
    panel2: night ? "rgba(2,6,23,.86)" : "rgba(8,47,73,.66)",
    border: night ? "rgba(51,65,85,.95)" : "rgba(125,211,252,.45)",
    chip: night ? "rgba(2,6,23,.72)" : "rgba(8,47,73,.55)",
    chartGrid: night ? "#1e293b" : "rgba(186,230,253,.22)",
    accent: modeAccent,
    card: night
      ? "linear-gradient(145deg,rgba(15,23,42,.96),rgba(30,41,59,.92))"
      : "linear-gradient(145deg,rgba(15,23,42,.80),rgba(12,74,110,.72))",
  };

  if (night) {
    return {
      ...common,
      key:"night",
      label:t.themeNight,
      icon:"🌙",
      bg:"linear-gradient(180deg,#020617,#0f172a 48%,#111827)",
      header:"linear-gradient(90deg,#60a5fa,#a78bfa)",
    };
  }

  return {
    ...common,
    key:"day",
    label:t.themeDay,
    icon:"☀️",
    bg:"linear-gradient(180deg,#0369a1,#38bdf8 46%,#fff7ed)",
    header:"linear-gradient(90deg,#f59e0b,#0ea5e9)",
  };
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
  const hours = range === "24h" ? 24 : range === "72h" ? 72 : range === "7d" ? 168 : 720;
  // 30 days at 5-minute sampling is about 8,640 rows. Request enough rows so
  // the daily 30-day chart does not get clipped to only the oldest few days.
  const limit = range === "24h" ? 720 : range === "72h" ? 1200 : range === "7d" ? 3000 : 12000;
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
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:c, marginInlineStart:6, verticalAlign:"middle", animation: c==="#22c55e"?"pulse 2s infinite":"none" }} />;
}

function MetricCard({ icon, title, value, unit, sub, color, sparkData, sparkKey, dot, onClick, theme, t }) {
  return (
    <div onClick={onClick} style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:16, padding:"14px 16px", cursor:"pointer", transition:"transform .2s, border-color .2s", position:"relative", minHeight:138, boxShadow:"0 10px 30px rgba(2,6,23,.20)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color || theme.accent; e.currentTarget.style.transform="translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.transform="none"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:30, height:30, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:11, background:(color||theme.accent)+"22", border:`1px solid ${(color||theme.accent)}66`, fontSize:17 }}>{icon}</span>
          <span style={{ fontSize:11, color:theme.muted, letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>{title}</span>
        </div>
        {dot}
      </div>
      <div style={{ fontSize:26, fontWeight:900, color: color||theme.text, lineHeight:1.1 }}>
        {value}<span style={{ fontSize:13, color:theme.soft, marginInlineStart:3 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:theme.muted, marginTop:3 }}>{sub}</div>}
      {sparkData && sparkKey && <Spark data={sparkData} dataKey={sparkKey} color={color||theme.accent} h={30} />}
      <div style={{ position:"absolute", bottom:8, insetInlineEnd:12, fontSize:10, color:theme.soft }}>{t.tapDetails}</div>
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

function StationHealthPanel({ row, battPct, loadW, onOpen, theme, t }) {
  const wifi = wifiQuality(row?.rssi, t);
  const rf = rfQuality(row, t);
  const routeIsRelay = row?.route === "relay";
  const rfCard = isValid(row?.lora_rssi)
    ? { value: rf.label, sub: rf.text, color: rf.color, bars: rf.bars }
    : { value: routeIsRelay ? t.waitingRelay : t.standby, sub: routeIsRelay ? t.relayNoSignal : t.directWifiActive, color: routeIsRelay ? "#eab308" : theme.soft, bars: 0 };
  const routeCard = row?.route === "relay"
    ? { value:t.indoorRelay, sub:t.relayRouteSub, color:"#3b82f6" }
    : row?.route === "direct"
      ? { value:t.directUpload, sub:t.directRouteSub, color:"#22c55e" }
      : { value: routeFriendly(row?.route, t), sub:t.waitingRoute, color:theme.soft };

  const items = [
    { icon:"🔋", label:t.battery, value:battPct == null ? "--" : `${battPct}%`, sub:`${display(row?.battery_voltage,3)}V · ${t.solarBattery}`, color:batteryStateLabel(battPct, t).color, page:"battery" },
    { icon:"⚡", label:t.powerUse, value:loadW == null ? "--" : `${loadW.toFixed(2)}W`, sub:`${t.boardSensors} · ${display(row?.battery_current,1)}mA`, color:"#f59e0b", page:"power" },
    { icon:"📶", label:t.wifiSignal, value:wifi.label, sub:`${displayInt(row?.rssi)} dBm`, color:wifi.color, page:"signal", bars:wifi.bars },
    { icon:"🛰️", label:t.rfLink, value:rfCard.value, sub:rfCard.sub, color:rfCard.color, page:"signal", bars:rfCard.bars },
    { icon:"🔁", label:t.dataRoute, value:routeCard.value, sub:routeCard.sub, color:routeCard.color, page:"signal" },
  ];
  return (
    <div className="wide" style={{ gridColumn:"span 3", background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:16, padding:14, backdropFilter:"blur(10px)" }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:12, color:theme.muted, letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>{t.stationHealth}</div>
        <div style={{ fontSize:11, color:theme.soft, marginTop:2 }}>{t.stationHealthSub}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }} className="healthGrid">
        {items.map(item => (
          <button key={item.label} onClick={() => item.page && onOpen(item.page)} style={{ background:theme.panel2, border:`1px solid ${theme.border}`, borderRadius:12, padding:"10px 8px", textAlign:"start", cursor:item.page ? "pointer" : "default", color:"inherit", minHeight:88 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
              <span style={{ width:25, height:25, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:9, background:item.color+"1f", border:`1px solid ${item.color}55`, fontSize:14 }}>{item.icon}</span>
              <div style={{ fontSize:10, color:theme.soft, textTransform:"uppercase", letterSpacing:.6 }}>{item.label}</div>
            </div>
            <div style={{ fontSize:15, fontWeight:900, color:item.color, marginTop:4, display:"flex", gap:6, alignItems:"center" }}>
              {item.bars != null && <SignalBars bars={item.bars} color={item.color} />}
              <span>{item.value}</span>
            </div>
            <div style={{ fontSize:10, color:theme.soft, marginTop:5, lineHeight:1.2 }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WindDirectionDial({ direction, size = 86, color = "#f59e0b", theme }) {
  const dir = n(direction, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 9;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:size, height:size, flex:"0 0 auto" }}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(2,6,23,.78)" stroke={theme?.border || "#334155"} strokeWidth="2" />
      <text x={cx} y={14} fill={theme?.muted || "#94a3b8"} fontSize="9" textAnchor="middle" fontWeight="700">N</text>
      <text x={size-12} y={cy+3} fill={theme?.soft || "#64748b"} fontSize="8" textAnchor="middle">E</text>
      <text x={cx} y={size-8} fill={theme?.soft || "#64748b"} fontSize="8" textAnchor="middle">S</text>
      <text x={12} y={cy+3} fill={theme?.soft || "#64748b"} fontSize="8" textAnchor="middle">W</text>
      <g transform={`rotate(${dir} ${cx} ${cy})`}>
        <line x1={cx} y1={cy+18} x2={cx} y2={cy-r+13} stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d={`M ${cx} ${cy-r+5} L ${cx-7} ${cy-r+20} L ${cx+7} ${cy-r+20} Z`} fill={color} />
      </g>
      <circle cx={cx} cy={cy} r="4" fill="#f1f5f9" />
    </svg>
  );
}

function WindSummaryPanel({ row, compact = false, theme, lang, t }) {
  const speed = isValid(row?.wind_speed_avg) ? row.wind_speed_avg : row?.wind_speed;
  const gust = row?.wind_gust;
  const direction = row?.wind_direction;
  const compass = degToCompass(direction, lang);
  return (
    <div style={{ display:"grid", gridTemplateColumns: compact ? "1fr auto" : "1.2fr .8fr", gap:12, alignItems:"center" }}>
      <div>
        <div style={{ fontSize: compact ? 34 : 42, fontWeight:900, color:"#f59e0b", lineHeight:1 }}>
          {display(speed,1)}<span style={{ fontSize:13, color:theme?.muted || "#94a3b8", marginInlineStart:4 }}>km/h</span>
        </div>
        <div style={{ fontSize:12, color:theme?.muted || "#94a3b8", marginTop:6 }}>{t.averageWind}</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
          <span style={{ background:"#f59e0b22", color:"#fbbf24", border:"1px solid #f59e0b55", borderRadius:999, padding:"3px 8px", fontSize:11, fontWeight:800 }}>
            ↗ {t.from} {compass} {isValid(direction) ? `(${display(direction,0)}°)` : ""}
          </span>
          <span style={{ background:"#ef444422", color:"#fca5a5", border:"1px solid #ef444455", borderRadius:999, padding:"3px 8px", fontSize:11, fontWeight:700 }}>
            {t.gust} {display(gust,1)} km/h
          </span>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <WindDirectionDial direction={direction} size={compact ? 82 : 124} theme={theme} />
        <div style={{ color:"#fbbf24", fontWeight:900, fontSize: compact ? 16 : 22, marginTop:4 }}>{compass}</div>
      </div>
    </div>
  );
}

function aggregateValueForField(field, values, range) {
  if (!values.length) return null;
  if (range !== "24h" && ["wind_gust", "uv_index", "uv_peak"].includes(field)) return Math.max(...values);
  if (range !== "24h" && field === "battery_voltage") return Math.min(...values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function aggregateRows(rows, range, fields) {
  const sorted = [...(rows || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (range === "24h") return sorted;

  const keyFn = range === "72h" ? localHourKey : localDayKey;
  const groups = {};
  sorted.forEach(r => {
    const key = keyFn(r.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.entries(groups).map(([key, g]) => {
    const middle = g[Math.floor(g.length / 2)] || g[0];
    // Keep the timestamp inside the local Oman bucket. For daily 7d/30d views,
    // the middle sample prevents timezone edge labels; for missing days we simply
    // omit the day and still show all days that have data.
    const out = { created_at: middle?.created_at || g[0].created_at, bucket_key: key };
    fields.forEach(field => {
      const vals = g.map(r => r[field]).filter(isValid).map(Number);
      out[field] = aggregateValueForField(field, vals, range);
      out[field + "_max"] = vals.length ? Math.max(...vals) : null;
      out[field + "_min"] = vals.length ? Math.min(...vals) : null;
      out[field + "_avg"] = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
    });
    return out;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function DetailPage({ title, unit, color, onBack, renderExtras, chartConfig, theme, lang, t }) {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const fieldsKey = (chartConfig.fields || []).join("|");
  const barsKey = (chartConfig.bars || []).join("|");

  useEffect(() => {
    let alive = true;
    const fields = Array.from(new Set([...(chartConfig.fields || []), ...(chartConfig.bars || [])]));
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
        <button onClick={onBack} style={{ background:theme.panel, border:`1px solid ${theme.border}`, color:theme.text, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:14, fontWeight:800 }}>{lang === "ar" ? `→ ${t.dashboard}` : `← ${t.dashboard}`}</button>
        <div>
          <div style={{ fontSize:10, color:theme.soft, letterSpacing:1, textTransform:"uppercase" }}>{t.details}</div>
          <h2 style={{ fontSize:20, fontWeight:800, color, margin:0 }}>{title}</h2>
        </div>
      </div>

      {renderExtras && renderExtras()}

      <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        {["24h","72h","7d","30d"].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{ background: range===r ? color+"33" : theme.panel, border: range===r ? `1px solid ${color}` : `1px solid ${theme.border}`,
              color: range===r ? color : theme.muted, borderRadius:9, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight: range===r ? 800 : 500 }}>
            {r}
          </button>
        ))}
      </div>
      <div style={{ fontSize:11, color:theme.soft, marginBottom:12 }}>📈 {chartRangeLabel(range, t)}</div>

      <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:14, padding:16, marginBottom:16 }}>
        {error ? <div style={{ textAlign:"center", padding:40, color:"#ef4444" }}>{error}</div> : loading ? <div style={{ textAlign:"center", padding:40, color:theme.soft }}>{t.loading}</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
              <XAxis dataKey="created_at" tickFormatter={(value) => fmtChartTick(value, range, lang)} stroke={theme.soft} fontSize={10} interval="preserveStartEnd" minTickGap={range === "24h" ? 26 : range === "72h" ? 20 : 16} tickMargin={8} />
              <YAxis stroke={theme.soft} fontSize={10} domain={["auto","auto"]} />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, fontSize:12, color:"#f1f5f9" }} labelFormatter={(v) => fmtDateTime(v, lang)} />
              {(range==="72h"||range==="7d"||range==="30d") && data[0] && (chartConfig.fields[0]+"_max") in data[0] &&
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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }} className="detailGrid">
          {[
            { label:t.avg, value: stats.avg.toFixed(1), sub: range },
            { label:t.min, value: stats.min.toFixed(1), sub: stats.minTime ? fmtDateTime(stats.minTime, lang) : "" },
            { label:t.max, value: stats.max.toFixed(1), sub: stats.maxTime ? fmtDateTime(stats.maxTime, lang) : "" },
          ].map((s,i) => (
            <div key={i} style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:theme.soft, letterSpacing:1, textTransform:"uppercase" }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color }}>{s.value}<span style={{ fontSize:11, color:theme.soft }}> {unit}</span></div>
              <div style={{ fontSize:10, color:theme.soft }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}
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
  const [lang, setLang] = useState("en");

  const t = I18N[lang];
  const theme = useMemo(() => weatherTheme(current, t), [current, t]);

  useEffect(() => {
    const saved = window.localStorage.getItem("weather_lang");
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === "ar" ? "en" : "ar";
      window.localStorage.setItem("weather_lang", next);
      return next;
    });
  }, []);

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
    const i2 = setInterval(() => setTick(tickValue=>tickValue+1), 1000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchCurrent]);

  const fl = current ? feelsLike(current.temperature, current.humidity, current.wind_speed || 0) : null;
  const dp = current ? dewPoint(current.temperature, current.humidity) : null;
  const battPct = current ? batteryPercent(current) : null;
  const loadW = current ? systemLoadWatts(current) : null;
  const guidance = current ? activityGuidance(current, lang, t, { isNight: theme.key === "night", isFresh: theme.isFresh }) : activityGuidance(null, lang, t);
  void tick;

  const pageShellStyle = {
    minHeight:"100vh",
    background:theme.bg,
    color:theme.text,
    fontFamily:"system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding:"20px 16px",
    direction: lang === "ar" ? "rtl" : "ltr",
    transition:"background .6s ease",
  };

  const globalCss = `
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    *{box-sizing:border-box;margin:0;padding:0}
    button{font-family:inherit}
    @media(max-width:820px){.dashGrid{grid-template-columns:1fr!important}.wide{grid-column:span 1!important}.headerWrap{align-items:flex-start!important}.statsLine{display:block!important}.detailGrid{grid-template-columns:1fr!important}.healthGrid{grid-template-columns:repeat(2,1fr)!important}}
    @media(max-width:560px){.wide{display:block!important}.wide>div{margin-bottom:8px}.healthGrid{display:grid!important;grid-template-columns:1fr!important}.healthGrid>button{margin-bottom:0!important}.activityBox{grid-template-columns:1fr!important;text-align:start!important}.activitySummary{text-align:start!important}}
  `;

  if (!current && status !== "live") {
    return (
      <div style={pageShellStyle}>
        <style>{globalCss}</style>
        <div style={{ minHeight:"calc(100vh - 40px)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
          <button onClick={toggleLang} style={{ position:"fixed", top:16, insetInlineEnd:16, border:`1px solid ${theme.border}`, background:theme.panel, color:theme.text, borderRadius:999, padding:"7px 12px", cursor:"pointer", fontWeight:800 }}>{t.switchLang}</button>
          <div style={{ fontSize:20, marginBottom:8 }}>{status==="no-data"?t.waiting:status==="error"?t.connError:t.connecting}</div>
          <div style={{ fontSize:13, color:theme.muted }}>{error || t.ensureOn}</div>
        </div>
      </div>
    );
  }

  if (page !== "home" && current) {
    const configs = {
      temperature: { title:t.temp, unit:"°C", color:"#f59e0b", fields:["temperature"], labels:[t.temp],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }} className="detailGrid">
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:theme.soft }}>{t.feelsLike}</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#f59e0b" }}>{fl == null ? "--" : fl.toFixed(1)}°C</div>
            </div>
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:theme.soft }}>{t.dewPoint}</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#3b82f6" }}>{dp == null ? "--" : dp.toFixed(1)}°C</div>
            </div>
          </div>
        )},
      humidity: { title:t.humidity, unit:"%", color:"#3b82f6", fields:["humidity"], labels:[t.humidity] },
      pressure: { title:t.pressure, unit:"hPa", color:"#8b5cf6", fields:["pressure"], labels:[t.pressure] },
      wind: { title:t.wind, unit:"km/h", color:"#f59e0b", fields:["wind_speed_avg","wind_gust"], labels:[t.avg,t.gust], colors:["#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1.4fr .8fr", gap:12, marginBottom:16 }} className="detailGrid">
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:16 }}>
              <WindSummaryPanel row={current} theme={theme} lang={lang} t={t} />
            </div>
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:theme.soft, letterSpacing:1, textTransform:"uppercase" }}>{t.windComfort}</div>
              <div style={{ fontSize:28, fontWeight:900, color:"#f59e0b" }}>Force {beaufort(current.wind_speed_avg || current.wind_speed)}</div>
              <div style={{ fontSize:13, color:theme.muted, marginBottom:10 }}>{beaufortDesc(beaufort(current.wind_speed_avg || current.wind_speed), lang)}</div>
              <div style={{ fontSize:12, color:theme.text, lineHeight:1.45 }}>🌬️ {windAdvice(current.wind_gust || current.wind_speed_avg || current.wind_speed, lang)}</div>
            </div>
          </div>
        )},
      "air-quality": { title:t.airQuality, unit:"µg/m³", color: pmColor(current?.pm2_5), fields:["pm1_0","pm2_5","pm10"], labels:["PM1.0","PM2.5","PM10"], colors:["#22c55e","#f59e0b","#ef4444"],
        extras: () => (
          <div style={{ background: pmColor(current.pm2_5)+"18", border:`1px solid ${pmColor(current.pm2_5)}55`, borderRadius:12, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:28, fontWeight:800, color:pmColor(current.pm2_5) }}>{displayInt(current.pm2_5)}</span>
            <span style={{ fontSize:13, color:theme.muted, marginInlineStart:8 }}>µg/m³ PM2.5</span>
            <span style={{ background:pmColor(current.pm2_5)+"33", color:pmColor(current.pm2_5), padding:"2px 10px", borderRadius:6, fontSize:12, fontWeight:800, marginInlineStart:12 }}>{pmLabel(current.pm2_5, t)}</span>
            <div style={{ fontSize:12, color:theme.muted, marginTop:8 }}>{pmAdvice(current.pm2_5, lang)}</div>
          </div>
        )},
      uv: { title:t.uvIndex, unit:"", color: uvColor(current?.uv_index), fields:["uv_index","uv_peak"], labels:[t.uvIndex,t.uvPeak], colors:[uvColor(current?.uv_index),"#a855f7"],
        extras: () => (
          <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, marginBottom:16 }}>
            <span style={{ fontSize:32, fontWeight:800, color:uvColor(current.uv_index) }}>{display(current.uv_index, 1)}</span>
            <span style={{ fontSize:14, color:theme.muted, marginInlineStart:8 }}>{uvLabel(current.uv_index, t)}</span>
            <div style={{ height:8, background:"#1e293b", borderRadius:4, marginTop:10, overflow:"hidden" }}>
              <div style={{ width:Math.min(100,n(current.uv_index,0)/12*100)+"%", height:"100%", background:"linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444,#a855f7)", borderRadius:4 }} />
            </div>
          </div>
        )},
      battery: { title:t.batteryLoad, unit:"V", color:"#22c55e", fields:["battery_voltage"], labels:[t.battery],
        extras: () => (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="detailGrid">
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:theme.soft }}>{t.battery}</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#22c55e" }}>{display(current.battery_voltage, 3)}V</div>
              <div style={{ fontSize:11, color:theme.soft }}>{battPct == null ? "--" : battPct}% · {t.solarBattery}</div>
            </div>
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:theme.soft }}>{t.loadCurrent}</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#3b82f6" }}>{display(current.battery_current, 1)}mA</div>
            </div>
            <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:theme.soft }}>{t.systemLoad}</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#f59e0b" }}>{loadW == null ? "--" : loadW.toFixed(2)}W</div>
            </div>
          </div>
        )},
      power: { title:t.powerUse, unit:"W", color:"#f59e0b", fields:["system_load_watts"], labels:[t.systemLoad] },
      signal: { title:t.signalStrength, unit:"dBm", color:"#8b5cf6", fields:["rssi"], labels:[t.wifiRssi],
        extras: () => (
          <div style={{ background:theme.panel, border:`1px solid ${theme.border}`, borderRadius:12, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:10, color:theme.soft }}>{t.technicalStatus}</div>
            <div style={{ fontSize:14, color:theme.muted, lineHeight:1.8 }}>
              {t.route}: <b style={{ color:theme.text }}>{routeFriendly(current.route, t)}</b><br />
              {t.wifiRssi}: <b style={{ color:theme.text }}>{displayInt(current.rssi)} dBm</b><br />
              {t.lora}: <b style={{ color:theme.text }}>{isValid(current.lora_rssi) ? `${current.lora_rssi} dBm / ${display(current.lora_snr,1)} dB` : "--"}</b><br />
              {t.packet}: <b style={{ color:theme.text }}>#{current.packet_number || "--"}</b><br />
              {t.firmware}: <b style={{ color:theme.text }}>{current.firmware_version || "--"}</b>
            </div>
          </div>
        )},
    };

    const cfg = configs[page];
    if (cfg) {
      return (
        <div style={pageShellStyle}>
          <style>{globalCss}</style>
          <DetailPage title={cfg.title} unit={cfg.unit} color={cfg.color} onBack={goHome}
            renderExtras={cfg.extras} chartConfig={{ fields: cfg.fields, labels: cfg.labels, colors: cfg.colors, bars: cfg.bars, barColors: cfg.barColors, barLabels: cfg.barLabels }} theme={theme} lang={lang} t={t} />
        </div>
      );
    }
  }

  return (
    <div style={pageShellStyle}>
      <style>{globalCss}</style>

      <div className="headerWrap" style={{ maxWidth:900, margin:"0 auto 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, margin:0, background:theme.header, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", textTransform: lang === "ar" ? "none" : "uppercase" }}>{t.title}</h1>
          <div style={{ fontSize:11, color:theme.muted }}>{t.location}</div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:6, border:`1px solid ${theme.border}`, background:theme.chip, borderRadius:999, padding:"3px 9px", color:theme.muted, fontSize:10 }}>
            <span>{theme.icon}</span><span>{theme.label}</span><span style={{ color:theme.soft }}>·</span><span>{theme.modeIcon}</span><span>{theme.modeLabel}</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", justifyContent: lang === "ar" ? "flex-start" : "flex-end" }}>
          <button onClick={toggleLang} style={{ border:`1px solid ${theme.border}`, background:theme.panel, color:theme.text, borderRadius:999, padding:"7px 12px", cursor:"pointer", fontWeight:900 }}>{t.switchLang}</button>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:theme.chip, border:`1px solid ${theme.border}`, borderRadius:999, padding:"7px 11px" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:stationColor(current?.created_at), animation: ageSeconds(current?.created_at)<=420?"pulse 2s infinite":"none" }} />
            <span style={{ fontSize:11, color:theme.muted }}>{stationLabel(current?.created_at, t, lang)}</span>
          </div>
        </div>
      </div>

      {error && <div style={{ maxWidth:900, margin:"0 auto 12px", background:"#451a1a", border:"1px solid #991b1b", color:"#fecaca", padding:12, borderRadius:10, fontSize:13 }}>{error}</div>}

      {current && (
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, animation:"fadeIn .5s ease" }} className="dashGrid">
          <div className="wide activityBox" style={{ gridColumn:"span 3", background:guidance.color+"18", border:`1px solid ${guidance.color}66`, borderRadius:16, padding:"14px 16px", display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:14, backdropFilter:"blur(10px)" }}>
            <div style={{ fontSize:32 }}>{guidance.icon}</div>
            <div>
              <div style={{ fontSize:11, color:theme.muted, letterSpacing:1, textTransform:"uppercase" }}>{t.activityTitle}</div>
              <div style={{ fontSize:17, fontWeight:900, color:guidance.color }}>{guidance.title}</div>
              <div style={{ fontSize:12, color:theme.text, marginTop:2 }}>{guidance.message}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {guidance.points.map((p, i) => (
                  <span key={i} style={{ border:`1px solid ${theme.border}`, background:theme.chip, borderRadius:999, padding:"3px 8px", fontSize:10, color:theme.muted }}>{p}</span>
                ))}
              </div>
            </div>
            <div className="activitySummary" style={{ textAlign:"end", minWidth:86 }}>
              <div style={{ color:pmColor(current.pm2_5), fontWeight:900, fontSize:22 }}>🌫️ {displayInt(current.pm2_5)}</div>
              <div style={{ color:uvColor(current.uv_index), fontWeight:800, fontSize:16 }}>☀️ UV {display(current.uv_index,1)}</div>
            </div>
          </div>

          <MetricCard icon="🌡️" title={t.temp} value={display(current.temperature,1)} unit="°C" color="#f59e0b" theme={theme} t={t}
            sub={`${t.feels} ${fl == null ? "--" : fl.toFixed(1)}°C`} sparkData={history} sparkKey="temperature"
            dot={<Dot value={current.temperature} lastUpdate={current.created_at} />} onClick={() => openPage("temperature")} />

          <MetricCard icon="💧" title={t.humidity} value={display(current.humidity,0)} unit="%" color="#3b82f6" theme={theme} t={t}
            sub={`${t.dew} ${dp == null ? "--" : dp.toFixed(1)}°C`} sparkData={history} sparkKey="humidity"
            dot={<Dot value={current.humidity} lastUpdate={current.created_at} />} onClick={() => openPage("humidity")} />

          <MetricCard icon="🌀" title={t.pressure} value={display(current.pressure,1)} unit="hPa" color="#8b5cf6" theme={theme} t={t}
            sparkData={history} sparkKey="pressure"
            dot={<Dot value={current.pressure} lastUpdate={current.created_at} />} onClick={() => openPage("pressure")} />

          <div onClick={() => openPage("wind")} style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:16, padding:"14px 16px", cursor:"pointer", position:"relative", minHeight:132, boxShadow:"0 10px 30px rgba(2,6,23,.20)" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#f59e0b"} onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ width:30, height:30, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:11, background:"#f59e0b22", border:"1px solid #f59e0b66", fontSize:17 }}>🌬️</span><span style={{ fontSize:11, color:theme.muted, letterSpacing:1, textTransform:"uppercase", fontWeight:800 }}>{t.wind}</span></div>
              <Dot value={current.wind_speed_avg || current.wind_speed} lastUpdate={current.created_at} />
            </div>
            <WindSummaryPanel row={current} compact theme={theme} lang={lang} t={t} />
            <div style={{ position:"absolute", bottom:8, insetInlineEnd:12, fontSize:10, color:theme.soft }}>{t.tapDetails}</div>
          </div>

          <MetricCard icon="🌫️" title={t.airQuality} value={displayInt(current.pm2_5)} unit="µg/m³"
            color={pmColor(current.pm2_5)} sub={`PM2.5 — ${pmLabel(current.pm2_5, t)}`} theme={theme} t={t}
            sparkData={history} sparkKey="pm2_5"
            dot={<Dot value={current.pm2_5} lastUpdate={current.created_at} />} onClick={() => openPage("air-quality")} />

          <MetricCard icon="☀️" title={t.uvIndex} value={display(current.uv_index,1)} unit=""
            color={uvColor(current.uv_index)} sub={uvLabel(current.uv_index, t)} theme={theme} t={t}
            sparkData={history} sparkKey="uv_index"
            dot={<Dot value={current.uv_index} lastUpdate={current.created_at} />} onClick={() => openPage("uv")} />

          <StationHealthPanel row={current} battPct={battPct} loadW={loadW} onOpen={openPage} theme={theme} t={t} />

          <div className="wide" style={{ gridColumn:"span 3", textAlign:"center", padding:8, fontSize:11, color:theme.soft }}>
            <span className="statsLine">{current.created_at && `${t.last}: ${fmtDateTime(current.created_at, lang)} Oman time`}</span>
            {current.uptime_minutes != null && <span className="statsLine">{` | ${t.up}: ${uptimeText(current.uptime_minutes, lang)}`}</span>}
            {current.packet_number && <span className="statsLine">{` | ${t.pkt} #${current.packet_number}`}</span>}
            {current.firmware_version && <span className="statsLine">{` | ${t.fw} ${current.firmware_version}`}</span>}
            <span className="statsLine">{` | ${t.solarPowered} ☀`}</span>
          </div>
        </div>
      )}
    </div>
  );
}
