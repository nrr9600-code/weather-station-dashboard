// Shared server-side battery normalization for the weather dashboard.
// Firmware values are kept as `battery_percent_raw`; public/debug views use the
// calibrated estimate calculated from battery_voltage so direct and relay rows
// stay consistent without reflashing the indoor relay.

const LIFEPO4_1S_SOC_TABLE = [
  [3.600, 100],
  [3.500, 98],
  [3.450, 95],
  [3.400, 90],
  [3.360, 82],
  [3.340, 75],
  [3.320, 65],
  [3.300, 50],
  [3.280, 40],
  [3.250, 28],
  [3.220, 18],
  [3.200, 12],
  [3.100, 5],
  [2.900, 0],
].sort((a, b) => a[0] - b[0]);

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function estimateBatteryPercentFromVoltage(voltage) {
  const v = finiteNumber(voltage);
  if (v === null || v < 0) return null;

  const table = LIFEPO4_1S_SOC_TABLE;
  if (v <= table[0][0]) return table[0][1];
  if (v >= table[table.length - 1][0]) return table[table.length - 1][1];

  for (let i = 1; i < table.length; i += 1) {
    const [v0, p0] = table[i - 1];
    const [v1, p1] = table[i];
    if (v <= v1) {
      const ratio = (v - v0) / (v1 - v0);
      return Math.max(0, Math.min(100, p0 + ratio * (p1 - p0)));
    }
  }
  return null;
}

export function normalizeBatteryRow(row) {
  if (!row || typeof row !== "object") return row;
  const raw = row.battery_percent;
  const calibrated = estimateBatteryPercentFromVoltage(row.battery_voltage);
  return {
    ...row,
    battery_percent_raw: raw,
    battery_percent: calibrated ?? raw ?? null,
  };
}

export function normalizeBatteryRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeBatteryRow) : [];
}
