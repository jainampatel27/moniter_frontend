"use client";

import {
    Pencil, Trash2, Pause, Play, Globe, Network, Clock,
    MoreHorizontal, RefreshCw, Loader2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardHeader, CardDescription,
} from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Monitor } from "@/components/monitor-form-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckRecord = {
    id: string;
    ok: boolean;
    statusCode: number | null;
    responseMs: number | null;
    error: string | null;
    startedAt: string;   // when this up/down streak started
    checkedAt: string;   // last time a check ran in this streak
    checkCount: number;  // how many checks are in this streak
};

export type MonitorStatus = {
    monitorId: string;
    latest: CheckRecord | null;
    uptimePct: string | null;   // e.g. "99.45"
    history?: CheckRecord[];    // optional, not used on cards
};

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status, checking }: { status: MonitorStatus | null; checking: boolean }) {
    if (checking) {
        return (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                <Loader2 className="size-3 animate-spin" /> Checking…
            </span>
        );
    }
    if (!status?.latest) {
        return (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                Pending
            </span>
        );
    }
    return status.latest.ok ? (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Up
            {status.latest.responseMs != null && (
                <span className="font-normal opacity-70">{status.latest.responseMs}ms</span>
            )}
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium">
            <span className="size-1.5 rounded-full bg-red-500" />
            Down
        </span>
    );
}

// ─── Monitor Card ─────────────────────────────────────────────────────────────

export function MonitorCard({
    monitor, status, checking,
    onEdit, onTogglePause, onDelete, onManualCheck, onViewDetail,
}: {
    monitor: Monitor;
    status: MonitorStatus | null;
    checking: boolean;
    onEdit: (m: Monitor) => void;
    onTogglePause: (m: Monitor) => void;
    onDelete: (m: Monitor) => void;
    onManualCheck: (m: Monitor) => void;
    onViewDetail: (m: Monitor) => void;
}) {
    const headerCount = monitor.headers ? Object.keys(monitor.headers).length : 0;

    return (
        <Card className={`transition-opacity ${monitor.paused ? "opacity-60" : ""}`}>
            <CardHeader className="flex flex-row items-start justify-between pb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {monitor.type === "TCP"
                        ? <Network className="size-4 shrink-0 text-muted-foreground" />
                        : <Globe className="size-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                        <button
                            onClick={() => onViewDetail(monitor)}
                            className="text-sm font-semibold truncate hover:underline text-left block max-w-full"
                        >
                            {monitor.name}
                        </button>
                        <CardDescription className="text-xs truncate">{monitor.url}</CardDescription>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {monitor.paused ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Paused
                        </span>
                    ) : (
                        <StatusPill status={status} checking={checking} />
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        } />
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onViewDetail(monitor)}>
                                <ExternalLink className="size-4" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onManualCheck(monitor)}>
                                <RefreshCw className="size-4" /> Check now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onEdit(monitor)}>
                                <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onTogglePause(monitor)}>
                                {monitor.paused
                                    ? <><Play className="size-4" /> Resume</>
                                    : <><Pause className="size-4" /> Pause</>}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => onDelete(monitor)}>
                                <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="pt-0 pb-3">
                {/* Meta row */}
                <div className="flex flex-wrap gap-2 mt-1">
                    {monitor.type === "HTTP" && (
                        <span className="inline-flex items-center text-xs bg-muted rounded px-1.5 py-0.5 font-mono font-medium">
                            {monitor.method}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" /> Every {monitor.interval} min
                    </span>
                    {monitor.expectedStatus && (
                        <span className="text-xs text-muted-foreground">Expects {monitor.expectedStatus}</span>
                    )}
                    {headerCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {headerCount} header{headerCount > 1 ? "s" : ""}
                        </span>
                    )}
                    {status?.uptimePct != null && (
                        <span className="text-xs text-muted-foreground ml-auto">
                            {status.uptimePct}% uptime
                        </span>
                    )}
                </div>

                {/* Last error */}
                {!monitor.paused && status?.latest && !status.latest.ok && status.latest.error && (
                    <p className="text-xs text-red-500 mt-1.5 truncate" title={status.latest.error}>
                        {status.latest.error}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

