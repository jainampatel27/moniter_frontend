"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Globe, Network, RefreshCw, Loader2,
    CheckCircle2, XCircle, Clock, TrendingUp, Activity, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Monitor } from "@/components/monitor-form-dialog";
import type { CheckRecord } from "@/components/monitor-card";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(ms: number): string {
    if (ms < 60_000)       return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000)    return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
    if (ms < 86_400_000)   return `${(ms / 3_600_000).toFixed(1)}h`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
}

type WithDuration = CheckRecord & { durationMs: number; endTime: Date };

/** Annotate each streak with its duration.
 *  Streaks are sorted newest-first; period N ends when period N-1 started. */
function withDurations(checks: CheckRecord[]): WithDuration[] {
    const now = Date.now();
    return checks.map((c, i) => ({
        ...c,
        durationMs: Math.max(0,
            (i === 0 ? now : new Date(checks[i - 1].startedAt).getTime())
            - new Date(c.startedAt).getTime()
        ),
        endTime: new Date(i === 0 ? now : new Date(checks[i - 1].startedAt).getTime()),
    }));
}

/** Duration-weighted uptime over the last `windowMs` milliseconds. */
function calcUptime(checks: CheckRecord[], windowMs: number): number | null {
    const now = Date.now();
    const windowStart = now - windowMs;
    let upMs = 0, totalMs = 0;
    for (let i = 0; i < checks.length; i++) {
        const pStart = new Date(checks[i].startedAt).getTime();
        const pEnd   = i === 0 ? now : new Date(checks[i - 1].startedAt).getTime();
        const start  = Math.max(pStart, windowStart);
        const end    = Math.min(pEnd, now);
        if (start >= end) continue;
        const dur = end - start;
        totalMs += dur;
        if (checks[i].ok) upMs += dur;
    }
    return totalMs > 0 ? (upMs / totalMs) * 100 : null;
}

// ─── 1. 20-Day Timeline Bar ───────────────────────────────────────────────────

function TimelineBar({ checks }: { checks: CheckRecord[] }) {
    if (checks.length === 0) {
        return (
            <div className="h-10 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No data yet — first check hasn&apos;t run</span>
            </div>
        );
    }

    const streaks = withDurations(checks);
    // Render oldest → newest
    const segments = [...streaks].reverse();

    return (
        <div className="space-y-2">
            <div className="flex h-10 rounded-lg overflow-hidden w-full">
                {segments.map((seg, i) => (
                    <div
                        key={seg.id}
                        style={{ flex: Math.max(seg.durationMs, 1) }}
                        title={[
                            seg.ok ? "✅ Up" : "❌ Down",
                            `From: ${new Date(seg.startedAt).toLocaleString()}`,
                            `To:   ${seg.endTime.toLocaleString()}`,
                            `Duration: ${fmtDuration(seg.durationMs)}`,
                            `Checks: ${seg.checkCount}`,
                            seg.responseMs != null ? `Response: ${seg.responseMs}ms` : "",
                        ].filter(Boolean).join("\n")}
                        className={[
                            "transition-opacity hover:opacity-75",
                            seg.ok ? "bg-emerald-500" : "bg-red-500",
                            i === 0 ? "rounded-l-lg" : "",
                            i === segments.length - 1 ? "rounded-r-lg" : "",
                        ].join(" ")}
                    />
                ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{new Date(checks[checks.length - 1].startedAt).toLocaleDateString()}</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1">
                        <span className="size-2 rounded-sm bg-emerald-500 inline-block" /> Up
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="size-2 rounded-sm bg-red-500 inline-block" /> Down
                    </span>
                </div>
                <span>Now</span>
            </div>
        </div>
    );
}

// ─── 2. Uptime Windows ────────────────────────────────────────────────────────

function UptimeCard({ label, value }: { label: string; value: number | null }) {
    const color = value === null
        ? "text-muted-foreground"
        : value >= 99   ? "text-emerald-600 dark:text-emerald-400"
        : value >= 95   ? "text-yellow-500 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";
    return (
        <Card>
            <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-3xl font-bold tabular-nums ${color}`}>
                    {value !== null ? `${value.toFixed(2)}%` : "—"}
                </p>
            </CardContent>
        </Card>
    );
}

// ─── 3. Response Time Chart ───────────────────────────────────────────────────

function ResponseChart({ checks }: { checks: CheckRecord[] }) {
    // Show "up" streaks with response data, oldest → newest
    const points = [...checks].reverse().filter(
        (c): c is CheckRecord & { responseMs: number } => c.ok && c.responseMs != null
    );

    if (points.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                No response time data yet.
            </p>
        );
    }

    const maxMs = Math.max(...points.map((p) => p.responseMs));

    return (
        <div className="space-y-2">
            <div className="flex items-end gap-0.5 h-28">
                {points.map((p) => {
                    const heightPct = Math.max((p.responseMs / maxMs) * 100, 4);
                    const color = p.responseMs < 500  ? "bg-emerald-500"
                                : p.responseMs < 2000 ? "bg-yellow-400"
                                : "bg-orange-500";
                    return (
                        <div
                            key={p.id}
                            className="flex-1 min-w-0.75 flex flex-col justify-end"
                            title={`${new Date(p.startedAt).toLocaleString()}\n${p.responseMs}ms (${p.checkCount} checks)`}
                        >
                            <div
                                className={`w-full rounded-t-sm ${color} hover:opacity-70 transition-opacity`}
                                style={{ height: `${heightPct}%` }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{new Date(points[0].startedAt).toLocaleDateString()}</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500 inline-block" /> &lt;500ms</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-yellow-400 inline-block" /> &lt;2s</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-orange-500 inline-block" /> &gt;2s</span>
                </div>
                <span>Now</span>
            </div>
        </div>
    );
}

// ─── 4. Incidents ─────────────────────────────────────────────────────────────

function Incidents({ streaks }: { streaks: WithDuration[] }) {
    const incidents = streaks.filter((s) => !s.ok);

    if (incidents.length === 0) {
        return (
            <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    No incidents in the last 20 days
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y">
            {incidents.map((inc) => (
                <div key={inc.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex items-start gap-2.5">
                        <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">Outage</p>
                            {inc.error && (
                                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate" title={inc.error}>
                                    {inc.error}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(inc.startedAt).toLocaleString()} → {inc.endTime.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-red-500 shrink-0 bg-red-50 dark:bg-red-950 px-2 py-1 rounded-full">
                        {fmtDuration(inc.durationMs)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── 5. Event Log ─────────────────────────────────────────────────────────────

function EventLog({ streaks }: { streaks: WithDuration[] }) {
    if (streaks.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">No events yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium">Started</th>
                        <th className="text-left px-4 py-2.5 font-medium">Duration</th>
                        <th className="text-left px-4 py-2.5 font-medium">Checks</th>
                        <th className="text-left px-4 py-2.5 font-medium">Response</th>
                        <th className="text-left px-4 py-2.5 font-medium">Detail</th>
                    </tr>
                </thead>
                <tbody>
                    {streaks.map((s, i) => (
                        <tr key={s.id} className={`border-b last:border-0 ${i === 0 ? "bg-muted/30" : ""}`}>
                            <td className="px-4 py-2.5">
                                {s.ok ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                                        <CheckCircle2 className="size-3.5" /> Up
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium text-xs">
                                        <XCircle className="size-3.5" /> Down
                                    </span>
                                )}
                                {i === 0 && (
                                    <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500">
                                        current
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(s.startedAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {fmtDuration(s.durationMs)}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {s.checkCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {s.responseMs != null ? `${s.responseMs}ms` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate" title={s.error ?? undefined}>
                                {s.error ?? "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitorDetailPage() {
    const { id, monitorId } = useParams<{ id: string; monitorId: string }>();
    const router = useRouter();

    const [monitor, setMonitor]   = useState<Monitor | null>(null);
    const [checks, setChecks]     = useState<CheckRecord[]>([]);
    const [loading, setLoading]   = useState(true);
    const [checking, setChecking] = useState(false);

    const fetchData = useCallback(async () => {
        const [monRes, chkRes] = await Promise.all([
            fetch(`${API}/workspaces/${id}/monitors/${monitorId}`, { credentials: "include" }),
            fetch(`${API}/workspaces/${id}/monitors/${monitorId}/checks`, { credentials: "include" }),
        ]);
        if (monRes.ok) setMonitor((await monRes.json()).monitor);
        if (chkRes.ok) setChecks((await chkRes.json()).checks ?? []);
        setLoading(false);
    }, [id, monitorId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleManualCheck = async () => {
        setChecking(true);
        try {
            await fetch(`${API}/workspaces/${id}/monitors/${monitorId}/checks`, {
                method: "POST", credentials: "include",
            });
            await fetchData();
        } finally {
            setChecking(false);
        }
    };

    const streaks     = withDurations(checks);
    const latest      = checks[0] ?? null;
    const totalChecks = checks.reduce((s, c) => s + c.checkCount, 0);
    const uptime24h   = calcUptime(checks, 24 * 60 * 60 * 1000);
    const uptime7d    = calcUptime(checks, 7  * 24 * 60 * 60 * 1000);
    const uptime20d   = calcUptime(checks, 20 * 24 * 60 * 60 * 1000);
    const avgMs = (() => {
        const up = checks.filter((c) => c.ok && c.responseMs != null);
        return up.length > 0
            ? Math.round(up.reduce((s, c) => s + (c.responseMs ?? 0), 0) / up.length)
            : null;
    })();

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-zinc-400 pt-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading…</span>
            </div>
        );
    }

    if (!monitor) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                <p className="text-sm font-medium text-zinc-500">Monitor not found</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push(`/workspace/${id}`)}>
                    Back to workspace
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/workspace/${id}`)}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        {monitor.type === "TCP"
                            ? <Network className="size-5 text-muted-foreground shrink-0" />
                            : <Globe  className="size-5 text-muted-foreground shrink-0" />}
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{monitor.name}</h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{monitor.url}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {latest ? (
                        latest.ok ? (
                            <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-800">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                Up {latest.responseMs != null ? `· ${latest.responseMs}ms` : ""}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium border border-red-200 dark:border-red-800">
                                <span className="size-2 rounded-full bg-red-500" />
                                Down
                            </span>
                        )
                    ) : (
                        <span className="text-xs text-zinc-400 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            No checks yet
                        </span>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleManualCheck} disabled={checking}>
                        {checking
                            ? <><Loader2 className="size-3.5 animate-spin" /> Checking…</>
                            : <><RefreshCw className="size-3.5" /> Check now</>}
                    </Button>
                </div>
            </div>

            {/* ── 1. 20-Day Timeline ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="size-4" />
                        20-Day Status Timeline
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                            hover segments for details
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TimelineBar checks={checks} />
                </CardContent>
            </Card>

            {/* ── 2. Uptime Windows ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Uptime</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <UptimeCard label="Last 24 hours" value={uptime24h} />
                    <UptimeCard label="Last 7 days"   value={uptime7d}  />
                    <UptimeCard label="Last 20 days"  value={uptime20d} />
                    <Card>
                        <CardContent className="pt-5 pb-4">
                            <p className="text-xs text-muted-foreground mb-1">Total checks</p>
                            <p className="text-3xl font-bold tabular-nums">{totalChecks.toLocaleString()}</p>
                            {avgMs !== null && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Avg {avgMs}ms · Every {monitor.interval} min
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── 3. Response Times ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="size-4" />
                        Response Times
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponseChart checks={checks} />
                </CardContent>
            </Card>

            {/* ── 4. Incidents ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="size-4" />
                        Incidents
                        {streaks.filter((s) => !s.ok).length > 0 && (
                            <span className="ml-auto text-xs font-normal text-red-500">
                                {streaks.filter((s) => !s.ok).length} outage
                                {streaks.filter((s) => !s.ok).length !== 1 ? "s" : ""} in 20 days
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Incidents streaks={streaks} />
                </CardContent>
            </Card>

            {/* ── 5. Event Log ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="size-4" />
                        Event Log
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                            {checks.length} status change{checks.length !== 1 ? "s" : ""} · {totalChecks.toLocaleString()} checks total
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <EventLog streaks={streaks} />
                </CardContent>
            </Card>

        </div>
    );
}
