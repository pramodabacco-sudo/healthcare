// client/src/pages/doctor/DoctorOPDRevenue.jsx
// The "Revenue" tab inside DoctorOPDLayout.
//
// Today/All-Time cards use /opd/patients/stats. The date-range chart section
// fetches the full patient list once (/opd/patients, already unpaginated —
// same endpoint OPDPatientList.jsx uses) and buckets/filters it CLIENT-SIDE
// by day, so range/preset changes are instant with zero extra network calls.
//
// Requires `recharts` — if it's not already a dependency, run:
//   npm install recharts
import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import { StatCard } from "../../components/UI";
import {
  IndianRupee, Wallet, Loader2, TrendingUp, Calendar, BarChart3,
  ChevronDown, Check, Users2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const COLORS = {
  revenue: "#5b9bd5", // muted blue — matches the reference chart's tone
  cash: "#5b9bd5",    // muted blue
  upi: "#70ad8f",     // muted sage green
};

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function firstOfMonth(monthsBack = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(1);
  return d;
}
function lastOfMonth(monthsBack = 1) {
  const d = new Date();
  d.setDate(1); // avoid month-length overflow bugs
  d.setMonth(d.getMonth() - monthsBack + 1);
  d.setDate(0);
  return d;
}
function firstOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  return d;
}
function fmtLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtRangeDisplay(fromStr, toStr) {
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const from = new Date(fromStr).toLocaleDateString("en-IN", opts);
  const to = new Date(toStr).toLocaleDateString("en-IN", opts);
  return fromStr === toStr ? from : `${from} – ${to}`;
}

const PRESETS = [
  { key: "today",     label: "Today",          from: () => new Date(),          to: () => new Date() },
  { key: "yesterday", label: "Yesterday",      from: () => daysAgo(1),          to: () => daysAgo(1) },
  { key: "7d",        label: "Last 7 Days",    from: () => daysAgo(6),          to: () => new Date() },
  { key: "30d",       label: "Last 30 Days",   from: () => daysAgo(29),         to: () => new Date() },
  { key: "month",     label: "This Month",     from: () => firstOfMonth(0),     to: () => new Date() },
  { key: "lastmonth", label: "Last Month",     from: () => firstOfMonth(1),     to: () => lastOfMonth(1) },
  { key: "year",      label: "This Year",      from: () => firstOfYear(),       to: () => new Date() },
];

// Every calendar day between from/to inclusive, as YYYY-MM-DD strings.
function dateRangeArray(fromStr, toStr) {
  const out = [];
  let cur = new Date(fromStr);
  const end = new Date(toStr);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || cur > end) return out;
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// ── Modern date-range picker: trigger button + popover with presets on the
// left and a custom From/To pair on the right, closes on outside-click
// (same overlay pattern NotificationBell.jsx already uses in this app). ──
function DateRangePicker({ preset, rangeFrom, rangeTo, onPreset, onCustomApply }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(rangeFrom);
  const [draftTo, setDraftTo] = useState(rangeTo);

  useEffect(() => {
    setDraftFrom(rangeFrom);
    setDraftTo(rangeTo);
  }, [rangeFrom, rangeTo, open]);

  const activePresetLabel = PRESETS.find((p) => p.key === preset)?.label;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-teal-400 dark:hover:border-teal-500 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-teal-500" />
        <span>{activePresetLabel || fmtRangeDisplay(rangeFrom, rangeTo)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(92vw,420px)] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col sm:flex-row">
            {/* Presets */}
            <div className="sm:w-40 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 p-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { onPreset(p); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    preset === p.key
                      ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {p.label}
                  {preset === p.key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div className="flex-1 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Custom Range</p>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom}
                  max={toDateStr(new Date())}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <button
                onClick={() => { onCustomApply(draftFrom, draftTo); setOpen(false); }}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-xs font-semibold py-2 rounded-lg hover:scale-[1.02] transition-transform shadow-md shadow-teal-500/20"
              >
                Apply Range
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DoctorOPDRevenue() {
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState("7d");
  const [rangeFrom, setRangeFrom] = useState(toDateStr(daysAgo(6)));
  const [rangeTo, setRangeTo] = useState(toDateStr(new Date()));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [statsData, patientsData] = await Promise.all([
          api.get("/opd/patients/stats"),
          api.get("/opd/patients"),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setPatients(patientsData.patients || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load revenue data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handlePreset = (p) => {
    setPreset(p.key);
    setRangeFrom(toDateStr(p.from()));
    setRangeTo(toDateStr(p.to()));
  };

  const handleCustomApply = (from, to) => {
    setPreset("custom");
    setRangeFrom(from);
    setRangeTo(to);
  };

  // Per-day revenue/cash/upi for every day in the selected range, plus
  // range-wide totals. Recomputed only when patients or the range changes.
  const { chartData, rangeTotals } = useMemo(() => {
    const days = dateRangeArray(rangeFrom, rangeTo);
    const byDate = new Map(days.map((d) => [d, { date: d, label: fmtLabel(d), revenue: 0, cash: 0, upi: 0, patients: 0 }]));

    for (const p of patients) {
      const bucket = byDate.get(p.visitDate);
      if (!bucket) continue; // outside selected range
      bucket.revenue += p.total || 0;
      bucket.cash += p.cash || 0;
      bucket.upi += p.upi || 0;
      bucket.patients += 1;
    }

    const data = Array.from(byDate.values());
    const totals = data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        cash: acc.cash + d.cash,
        upi: acc.upi + d.upi,
        patients: acc.patients + d.patients,
      }),
      { revenue: 0, cash: 0, upi: 0, patients: 0 }
    );

    return { chartData: data, rangeTotals: totals };
  }, [patients, rangeFrom, rangeTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading revenue...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
        {error}
      </div>
    );
  }

  const { todayRevenue, todayCash, todayUpi, totalRevenue, totalPatients, seenToday } = stats;
  const avgPerPatientToday = seenToday > 0 ? todayRevenue / seenToday : 0;
  const avgPerPatientOverall = totalPatients > 0 ? totalRevenue / totalPatients : 0;

  return (
    <div className="space-y-6">
      {/* Today */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Today</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={IndianRupee} label="Today's Revenue" value={`₹${todayRevenue.toLocaleString()}`} color="teal" />
          <StatCard icon={Wallet} label="Cash Collected" value={`₹${todayCash.toLocaleString()}`} color="yellow" />
          <StatCard icon={Wallet} label="UPI Collected" value={`₹${todayUpi.toLocaleString()}`} color="purple" />
        </div>
      </div>

      {/* All time */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">All Time</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} color="blue" />
          <StatCard
            icon={TrendingUp}
            label="Avg. per Patient Today"
            value={`₹${avgPerPatientToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            color="cyan"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. per Patient (All Time)"
            value={`₹${avgPerPatientOverall.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            color="cyan"
          />
        </div>
      </div>

      {/* Date range + charts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
              <BarChart3 className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Revenue Over Time</h3>
          </div>
          <div className="sm:ml-auto">
            <DateRangePicker
              preset={preset}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              onPreset={handlePreset}
              onCustomApply={handleCustomApply}
            />
          </div>
        </div>

        {/* Range summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={IndianRupee} label="Revenue" value={`₹${rangeTotals.revenue.toLocaleString()}`} color="teal" />
          <StatCard icon={Wallet} label="Cash" value={`₹${rangeTotals.cash.toLocaleString()}`} color="yellow" />
          <StatCard icon={Wallet} label="UPI" value={`₹${rangeTotals.upi.toLocaleString()}`} color="purple" />
          <StatCard icon={Users2} label="Patients Seen" value={rangeTotals.patients} color="blue" />
        </div>

        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
            Select a valid date range to see charts.
          </p>
        ) : (
          <div className="space-y-8">
            {/* Revenue over time — gradient-filled area chart */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Revenue Trend</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.revenue} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.revenue}
                    strokeWidth={2.5}
                    fill="url(#revenueFill)"
                    dot={{ r: 3, strokeWidth: 0, fill: COLORS.revenue }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cash vs UPI breakdown */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Cash vs UPI</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) => [`₹${value.toLocaleString()}`, name === "cash" ? "Cash" : "UPI"]}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(v) => (v === "cash" ? "Cash" : "UPI")}
                    iconType="circle"
                  />
                  <Bar dataKey="cash" stackId="a" fill={COLORS.cash} radius={[0, 0, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="upi" stackId="a" fill={COLORS.upi} radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Figures reflect Cash + UPI actually collected, same numbers shown on the Receptionist side — this is a read-only view.
      </p>
    </div>
  );
}