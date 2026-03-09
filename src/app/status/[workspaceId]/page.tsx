"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Globe, Network, Loader2, Clock, Sun, Moon, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const POLL_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type Streak = {
    id: string;
    ok: boolean;
    statusCode: number | null;
    responseMs: number | null;
    error: string | null;
    startedAt: string;
    checkedAt: string;
    checkCount: number;
};

type MonitorEntry = {
    monitor: {
        id: string; name: string; url: string;
        type: string; method: string; interval: number;
    };
    latest: Streak | null;
    uptimePct: string | null;
    checks: Streak[];
};

type PageData = {
    workspace: { id: string; name: string };
    statuses: MonitorEntry[];
    systemStatus: "operational" | "degraded" | "pending";
};

type Theme = "dark" | "light";

type TooltipInfo = {
    seg: Streak;
    dur: number;
    x: number;
    y: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDur(ms: number): string {
    if (ms < 60_000)     return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
}

function fmtRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000)      return "just now";
    if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────

function SegTooltip({ info, theme }: { info: TooltipInfo; theme: Theme }) {
    const dark = theme === "dark";
    const date = new Date(info.seg.startedAt);
    const hrs  = Math.floor(info.dur / 3_600_000);
    const mins = Math.floor((info.dur % 3_600_000) / 60_000);

    return (
        <div
            className="fixed z-50 pointer-events-none rounded-xl shadow-2xl border w-64 overflow-hidden"
            style={{
                left: info.x,
                top: info.y,
                transform: "translate(-50%, calc(-100% - 14px))",
            }}
        >
            <div className={`px-4 py-2.5 border-b text-xs font-medium ${
                dark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
            }`}>
                {date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div className={`px-4 py-3 border-b ${dark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"}`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    info.seg.ok
                        ? dark
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : dark
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                    {info.seg.ok
                        ? <CheckCircle2 className="size-3.5" />
                        : <AlertTriangle className="size-3.5" />}
                    {info.seg.ok ? "Operational" : "Partial outage"}
                </div>
                <p className={`text-xs mt-2 ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
                    {hrs > 0 ? `${hrs} hr${hrs !== 1 ? "s" : ""} ` : ""}
                    {mins} min{mins !== 1 ? "s" : ""}
                </p>
            </div>
            <div className={`px-4 py-2.5 text-xs space-y-1 ${
                dark ? "bg-zinc-900 text-zinc-400" : "bg-white text-zinc-500"
            }`}>
                {info.seg.responseMs != null && (
                    <p>Response: <span className={dark ? "text-zinc-200" : "text-zinc-800"}>{info.seg.responseMs}ms</span></p>
                )}
                {info.seg.statusCode != null && (
                    <p>HTTP status: <span className={dark ? "text-zinc-200" : "text-zinc-800"}>{info.seg.statusCode}</span></p>
                )}
                {info.seg.error && (
                    <p className="text-red-400 truncate" title={info.seg.error}>{info.seg.error}</p>
                )}
                <p>{info.seg.checkCount} check{info.seg.checkCount !== 1 ? "s" : ""} in streak</p>
            </div>
        </div>
    );
}

// ─── 20-day timeline bar ─────────────────────────────────────────────────────

function TimelineBar({
    checks, theme, onHover, onLeave,
}: {
    checks: Streak[];
    theme: Theme;
    onHover: (info: TooltipInfo) => void;
    onLeave: () => void;
}) {
    const now  = Date.now();
    const dark = theme === "dark";

    if (checks.length === 0) {
        return (
            <div className={`h-8 rounded flex items-center justify-center ${dark ? "bg-zinc-800" : "bg-zinc-200"}`}>
                <span className={`text-[11px] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>No data yet</span>
            </div>
        );
    }

    const oldest   = checks[checks.length - 1];
    const windowMs = Math.max(now - new Date(oldest.startedAt).getTime(), 1);
    const segments  = [...checks].reverse(); // oldest → newest

    return (
        <div className="flex h-8 rounded overflow-hidden w-full gap-px">
            {segments.map((seg, i) => {
                const pStart = new Date(seg.startedAt).getTime();
                const pEnd   = i === segments.length - 1
                    ? now
                    : new Date(segments[i + 1].startedAt).getTime();
                const dur    = Math.max(pEnd - pStart, 1);
                return (
                    <div
                        key={seg.id}
                        style={{ flex: dur / windowMs }}
                        className={`cursor-default transition-opacity hover:opacity-70 ${
                            seg.ok ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        onMouseMove={(e) => onHover({ seg, dur, x: e.clientX, y: e.clientY })}
                        onMouseLeave={onLeave}
                    />
                );
            })}
        </div>
    );
}

// ─── Monitor Row ─────────────────────────────────────────────────────────────

function MonitorRow({
    entry, theme, onHover, onLeave,
}: {
    entry: MonitorEntry;
    theme: Theme;
    onHover: (info: TooltipInfo) => void;
    onLeave: () => void;
}) {
    const { monitor, latest, uptimePct, checks } = entry;
    const isUp = latest?.ok ?? null;
    const dark  = theme === "dark";

    return (
        <div className={`py-5 border-b last:border-0 ${dark ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {monitor.type === "TCP"
                        ? <Network className={`size-4 shrink-0 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
                        : <Globe   className={`size-4 shrink-0 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />}
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-zinc-900"}`}>{monitor.name}</p>
                        <p className={`text-xs truncate ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{monitor.url}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {uptimePct != null && (
                        <span className={`text-xs hidden sm:block ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
                            {uptimePct}% uptime
                        </span>
                    )}
                    {isUp === null ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                            dark ? "text-zinc-400 bg-zinc-800" : "text-zinc-500 bg-zinc-100"
                        }`}>
                            <span className="size-1.5 rounded-full bg-zinc-500" />
                            Pending
                        </span>
                    ) : isUp ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                            dark
                                ? "text-emerald-400 bg-emerald-950 border-emerald-800"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                        }`}>
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Operational
                        </span>
                    ) : (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                            dark
                                ? "text-red-400 bg-red-950 border-red-800"
                                : "text-red-700 bg-red-50 border-red-200"
                        }`}>
                            <span className="size-1.5 rounded-full bg-red-500" />
                            Outage
                        </span>
                    )}
                </div>
            </div>

            <TimelineBar checks={checks} theme={theme} onHover={onHover} onLeave={onLeave} />

            <div className={`flex justify-between mt-1.5 text-[11px] ${dark ? "text-zinc-600" : "text-zinc-400"}`}>
                <span>
                    {checks.length > 0
                        ? new Date(checks[checks.length - 1].startedAt).toLocaleDateString()
                        : "20 days ago"}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {latest ? `Checked ${fmtRelative(latest.checkedAt)}` : "Not yet checked"}
                </span>
                <span>Today</span>
            </div>

            {latest && !latest.ok && latest.error && (
                <p className={`mt-2 text-xs rounded px-3 py-1.5 truncate border ${
                    dark
                        ? "text-red-400 bg-red-950/40 border-red-900"
                        : "text-red-600 bg-red-50 border-red-200"
                }`} title={latest.error}>
                    {latest.error}
                </p>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicStatusPage() {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const [data, setData]             = useState<PageData | null>(null);
    const [loading, setLoading]       = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [theme, setTheme]           = useState<Theme>("dark");
    const [tooltip, setTooltip]       = useState<TooltipInfo | null>(null);
    const tooltipTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dark = theme === "dark";

    const fetchData = async () => {
        try {
            const res = await fetch(`${API}/public/${workspaceId}/status`);
            if (res.ok) {
                setData(await res.json());
                setLastUpdated(new Date());
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const t = setInterval(fetchData, POLL_MS);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const handleHover = (info: TooltipInfo) => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        setTooltip(info);
    };
    const handleLeave = () => {
        tooltipTimer.current = setTimeout(() => setTooltip(null), 80);
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${dark ? "bg-zinc-950" : "bg-white"} flex items-center justify-center`}>
                <Loader2 className="size-6 text-zinc-400 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className={`min-h-screen ${dark ? "bg-zinc-950" : "bg-white"} flex items-center justify-center`}>
                <div className="text-center">
                    <p className={`font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>Status page not found</p>
                    <p className="text-zinc-500 text-sm mt-1">This workspace does not exist.</p>
                </div>
            </div>
        );
    }

    const { systemStatus } = data;

    return (
        <div className={`min-h-screen transition-colors duration-200 ${dark ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"}`}>
            {tooltip && <SegTooltip info={tooltip} theme={theme} />}

            <div className="max-w-3xl mx-auto px-4 py-14">

                {/* Header */}
                <div className="mb-10 text-center relative">
                    <button
                        onClick={() => setTheme(dark ? "light" : "dark")}
                        className={`absolute right-0 top-0 p-2 rounded-full transition-colors ${
                            dark
                                ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                        }`}
                        title={dark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">{data.workspace.name}</h1>
                    <p className={`mt-1.5 text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>Status &amp; Uptime</p>
                    {lastUpdated && (
                        <p className={`text-xs mt-1 ${dark ? "text-zinc-600" : "text-zinc-400"}`}>
                            Updated {fmtRelative(lastUpdated.toISOString())} · auto-refreshes every minute
                        </p>
                    )}
                </div>

                {/* System banner */}
                {systemStatus === "operational" && (
                    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${
                        dark ? "bg-emerald-950/40 border-emerald-800" : "bg-emerald-50 border-emerald-200"
                    }`}>
                        <CheckCircle2 className={`size-6 shrink-0 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
                        <div>
                            <p className={`font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>All systems operational</p>
                            <p className={`text-xs mt-0.5 ${dark ? "text-zinc-400" : "text-zinc-500"}`}>Every service is running normally.</p>
                        </div>
                    </div>
                )}
                {systemStatus === "degraded" && (
                    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${
                        dark ? "bg-red-950/40 border-red-800" : "bg-red-50 border-red-200"
                    }`}>
                        <XCircle className={`size-6 shrink-0 ${dark ? "text-red-400" : "text-red-600"}`} />
                        <div>
                            <p className={`font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>Partial outage detected</p>
                            <p className={`text-xs mt-0.5 ${dark ? "text-zinc-400" : "text-zinc-500"}`}>One or more services are currently down.</p>
                        </div>
                    </div>
                )}
                {systemStatus === "pending" && (
                    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${
                        dark ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-50 border-zinc-200"
                    }`}>
                        <Loader2 className="size-6 text-zinc-400 shrink-0 animate-spin" />
                        <div>
                            <p className={`font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>Waiting for first check…</p>
                            <p className={`text-xs mt-0.5 ${dark ? "text-zinc-400" : "text-zinc-500"}`}>Checks will run shortly.</p>
                        </div>
                    </div>
                )}

                {/* Per-service rows */}
                {data.statuses.length === 0 ? (
                    <div className="mt-10 text-center">
                        <p className={`text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>No active monitors in this workspace.</p>
                    </div>
                ) : (
                    <div className={`mt-8 rounded-xl border px-6 ${
                        dark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
                    }`}>
                        {data.statuses.map((entry) => (
                            <MonitorRow
                                key={entry.monitor.id}
                                entry={entry}
                                theme={theme}
                                onHover={handleHover}
                                onLeave={handleLeave}
                            />
                        ))}
                    </div>
                )}

                {/* Uptime summary cards */}
                {data.statuses.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                        {data.statuses.map((entry) => (
                            <div key={entry.monitor.id} className={`rounded-lg border px-4 py-3 text-center ${
                                dark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
                            }`}>
                                <p className={`text-xs truncate ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{entry.monitor.name}</p>
                                <p className={`text-xl font-bold mt-1 tabular-nums ${
                                    entry.uptimePct === null     ? (dark ? "text-zinc-500" : "text-zinc-400")
                                    : Number(entry.uptimePct) >= 99 ? (dark ? "text-emerald-400" : "text-emerald-600")
                                    : Number(entry.uptimePct) >= 95 ? "text-yellow-500"
                                    : (dark ? "text-red-400" : "text-red-600")
                                }`}>
                                    {entry.uptimePct != null ? `${entry.uptimePct}%` : "—"}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${dark ? "text-zinc-600" : "text-zinc-400"}`}>20-day uptime</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <p className={`mt-12 text-center text-xs ${dark ? "text-zinc-700" : "text-zinc-400"}`}>
                    Powered by API Monitor
                </p>
            </div>
        </div>
    );
}
