"use client";

import { useContext, useEffect, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    MonitorDot,
    TrendingUp,
    XCircle,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { UserContext } from "@/components/dashboard-layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyStats {
    date: string;
    label: string;
    avgResponseMs: number | null;
    uptimePct: number | null;
    checksRan: number;
}

interface MonitorBreakdown {
    id: string;
    name: string;
    paused: boolean;
    status: "up" | "down" | "paused" | "pending";
    uptimePct: string | null;
    avgResponseMs: number | null;
}

interface Stats {
    totalWorkspaces: number;
    totalMonitors: number;
    activeMonitors: number;
    pausedMonitors: number;
    monitorsUp: number;
    monitorsDown: number;
    overallUptimePct: string | null;
    avgResponseMs: number | null;
    incidentsLast7d: number;
}

interface DashboardData {
    stats: Stats;
    dailyStats: DailyStats[];
    monitorBreakdown: MonitorBreakdown[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({
    title,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    title: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    icon: React.ElementType;
    accent?: "green" | "red" | "yellow" | "zinc";
}) {
    const subColor =
        accent === "green"
            ? "text-emerald-500"
            : accent === "red"
                ? "text-red-500"
                : accent === "yellow"
                    ? "text-amber-500"
                    : "text-zinc-500 dark:text-zinc-400";

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="size-4 text-zinc-500 dark:text-zinc-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
            </CardContent>
        </Card>
    );
}

function SkeletonCard() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </CardHeader>
            <CardContent>
                <div className="h-7 w-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1" />
                <div className="h-2.5 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </CardContent>
        </Card>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const user = useContext(UserContext);
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(`${API}/dashboard`, { credentials: "include" });
                if (!res.ok) throw new Error(`${res.status}`);
                const json: DashboardData = await res.json();
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled) setError("Could not load analytics. Make sure the backend is running.");
            }
        };

        load();
        const interval = setInterval(load, 60_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const s = data?.stats;

    // ── Derived values ────────────────────────────────────────────────────────
    const uptimeLabel = s?.overallUptimePct != null ? `${s.overallUptimePct}%` : "—";
    const respLabel = s?.avgResponseMs != null ? `${s.avgResponseMs} ms` : "—";

    const uptimeAccent: "green" | "red" | "yellow" | "zinc" =
        s?.overallUptimePct == null ? "zinc"
            : parseFloat(s.overallUptimePct) >= 99 ? "green"
                : parseFloat(s.overallUptimePct) >= 95 ? "yellow"
                    : "red";

    const respAccent: "green" | "red" | "yellow" | "zinc" =
        s?.avgResponseMs == null ? "zinc"
            : s.avgResponseMs <= 300 ? "green"
                : s.avgResponseMs <= 800 ? "yellow"
                    : "red";

    // Recharts-friendly: replace null with undefined so recharts skips the point
    const chartDaily = (data?.dailyStats ?? []).map((d) => ({
        ...d,
        avgResponseMs: d.avgResponseMs ?? undefined,
        uptimePct: d.uptimePct ?? undefined,
    }));

    const chartMonitors = (data?.monitorBreakdown ?? [])
        .filter((m) => !m.paused && m.uptimePct != null)
        .map((m) => ({
            name: m.name.length > 20 ? m.name.slice(0, 18) + "…" : m.name,
            uptimePct: parseFloat(m.uptimePct!),
            status: m.status,
        }))
        .sort((a, b) => b.uptimePct - a.uptimePct);

    return (
        <>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Overview
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Real-time analytics across all your monitors — last 7 days.
                </p>
            </div>

            {error && (
                <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* ── Stat cards ─────────────────────────────────────────────────── */}
            {!data ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Monitors"
                        value={s!.totalMonitors}
                        sub={
                            s!.totalMonitors === 0
                                ? "No monitors yet"
                                : `${s!.activeMonitors} active · ${s!.pausedMonitors} paused`
                        }
                        icon={MonitorDot}
                    />
                    <StatCard
                        title="Status Right Now"
                        value={
                            <span className="flex items-center gap-1.5">
                                {s!.monitorsDown > 0 ? (
                                    <XCircle className="size-5 text-red-500" />
                                ) : (
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                )}
                                {s!.monitorsUp} up · {s!.monitorsDown} down
                            </span>
                        }
                        sub={
                            s!.monitorsDown > 0
                                ? `${s!.monitorsDown} monitor${s!.monitorsDown > 1 ? "s" : ""} need attention`
                                : s!.activeMonitors > 0
                                    ? "All systems operational"
                                    : undefined
                        }
                        icon={Activity}
                        accent={s!.monitorsDown > 0 ? "red" : "green"}
                    />
                    <StatCard
                        title="Overall Uptime (7d)"
                        value={uptimeLabel}
                        sub={
                            s!.incidentsLast7d > 0
                                ? `${s!.incidentsLast7d} outage event${s!.incidentsLast7d > 1 ? "s" : ""} this week`
                                : s!.activeMonitors > 0
                                    ? "No outages this week"
                                    : undefined
                        }
                        icon={TrendingUp}
                        accent={uptimeAccent === "yellow" ? "yellow" : uptimeAccent}
                    />
                    <StatCard
                        title="Avg Response Time"
                        value={respLabel}
                        sub={
                            s!.avgResponseMs == null
                                ? "No checks yet"
                                : s!.avgResponseMs <= 300
                                    ? "Healthy response time"
                                    : s!.avgResponseMs <= 800
                                        ? "Slightly elevated"
                                        : "High latency detected"
                        }
                        icon={Clock}
                        accent={respAccent}
                    />
                </div>
            )}

            {/* ── Charts row ─────────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2 mt-2">

                {/* Response time trend */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Response Time (7 days)</CardTitle>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Daily average across all active monitors (ms)
                        </p>
                    </CardHeader>
                    <CardContent>
                        {!data ? (
                            <div className="h-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ) : chartDaily.every((d) => d.avgResponseMs == null) ? (
                            <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
                                No response data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={chartDaily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        unit=" ms"
                                        width={52}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e4e4e7",
                                            background: "white",
                                        }}
                                        formatter={(v: number) => [`${v} ms`, "Avg response"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="avgResponseMs"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#respGrad)"
                                        dot={{ r: 3, fill: "#10b981" }}
                                        connectNulls
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Uptime % trend */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Daily Uptime (7 days)</CardTitle>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Uptime percentage per day across all monitors
                        </p>
                    </CardHeader>
                    <CardContent>
                        {!data ? (
                            <div className="h-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ) : chartDaily.every((d) => d.uptimePct == null) ? (
                            <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
                                No uptime data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={chartDaily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        domain={[90, 100]}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                        width={44}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e4e4e7",
                                            background: "white",
                                        }}
                                        formatter={(v: number) => [`${v}%`, "Uptime"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="uptimePct"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill="url(#upGrad)"
                                        dot={{ r: 3, fill: "#6366f1" }}
                                        connectNulls
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Per-monitor uptime bar chart ────────────────────────────────── */}
            {(data?.monitorBreakdown.length ?? 0) > 0 && (
                <Card className="mt-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Uptime by Monitor (7 days)</CardTitle>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Uptime % per active monitor — sorted best to worst
                        </p>
                    </CardHeader>
                    <CardContent>
                        {chartMonitors.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
                                No active monitor data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(180, chartMonitors.length * 40)}>
                                <BarChart
                                    data={chartMonitors}
                                    layout="vertical"
                                    margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-zinc-200 dark:stroke-zinc-700" />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={120}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e4e4e7",
                                            background: "white",
                                        }}
                                        formatter={(v: number) => [`${v}%`, "Uptime"]}
                                    />
                                    <Bar
                                        dataKey="uptimePct"
                                        radius={[0, 4, 4, 0]}
                                        maxBarSize={24}
                                        fill="#10b981"
                                    >
                                        <LabelList
                                            dataKey="uptimePct"
                                            position="right"
                                            formatter={(v: number) => `${v}%`}
                                            style={{ fontSize: 11, fill: "#71717a" }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Monitor status table ────────────────────────────────────────── */}
            {(data?.monitorBreakdown.length ?? 0) > 0 && (
                <Card className="mt-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="size-4 text-amber-500" />
                            Monitor Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                    <th className="text-left font-medium text-zinc-500 dark:text-zinc-400 px-4 py-2">Monitor</th>
                                    <th className="text-right font-medium text-zinc-500 dark:text-zinc-400 px-4 py-2">Status</th>
                                    <th className="text-right font-medium text-zinc-500 dark:text-zinc-400 px-4 py-2">Uptime (7d)</th>
                                    <th className="text-right font-medium text-zinc-500 dark:text-zinc-400 px-4 py-2">Avg Response</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data!.monitorBreakdown.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="border-b last:border-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                    >
                                        <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                                            {m.name}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            {m.status === "up" && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Up</span>}
                                            {m.status === "down" && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="size-3.5" /> Down</span>}
                                            {m.status === "paused" && <span className="text-zinc-400">Paused</span>}
                                            {m.status === "pending" && <span className="text-zinc-400">Pending</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                                            {m.uptimePct != null ? `${m.uptimePct}%` : "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                                            {m.avgResponseMs != null ? `${m.avgResponseMs} ms` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
