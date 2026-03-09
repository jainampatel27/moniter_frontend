"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, FolderOpen, Globe, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonitorFormDialog } from "@/components/monitor-form-dialog";
import { MonitorCard } from "@/components/monitor-card";
import type { Monitor } from "@/components/monitor-form-dialog";
import type { MonitorStatus } from "@/components/monitor-card";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const POLL_INTERVAL_MS = 30_000; // refresh status every 30 s

type Workspace = { id: string; name: string; createdAt: string };
type StatusMap = Record<string, MonitorStatus>;

export default function WorkspaceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [workspace, setWorkspace]     = useState<Workspace | null>(null);
    const [monitors, setMonitors]       = useState<Monitor[]>([]);
    const [statusMap, setStatusMap]     = useState<StatusMap>({});
    const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
    const [loadingPage, setLoadingPage] = useState(true);
    const [notFound, setNotFound]       = useState(false);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [editTarget, setEditTarget]   = useState<Monitor | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Load workspace + monitors ──────────────────────────────────────────
    const load = useCallback(async () => {
        const [wsRes, monRes] = await Promise.all([
            fetch(`${API}/workspaces/${id}`, { credentials: "include" }),
            fetch(`${API}/workspaces/${id}/monitors`, { credentials: "include" }),
        ]);
        if (wsRes.status === 404) { setNotFound(true); setLoadingPage(false); return; }
        if (wsRes.ok) setWorkspace((await wsRes.json()).workspace);
        if (monRes.ok) setMonitors((await monRes.json()).monitors);
        setLoadingPage(false);
    }, [id]);

    // ── Fetch bulk status (latest check + history for every monitor) ───────
    const fetchStatus = useCallback(async () => {
        const res = await fetch(`${API}/workspaces/${id}/monitors/status`, {
            credentials: "include",
        });
        if (res.ok) {
            const data = await res.json();
            setStatusMap(data.status ?? {});
        }
    }, [id]);

    // ── Initial load + polling ─────────────────────────────────────────────
    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (loadingPage) return;
        fetchStatus();
        pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [loadingPage, fetchStatus]);

    // ── Manual "Check now" ─────────────────────────────────────────────────
    const handleManualCheck = async (m: Monitor) => {
        setCheckingIds((s) => new Set(s).add(m.id));
        try {
            const res = await fetch(
                `${API}/workspaces/${id}/monitors/${m.id}/checks`,
                { method: "POST", credentials: "include" }
            );
            if (res.ok) {
                // Refresh status immediately after the check
                await fetchStatus();
            }
        } finally {
            setCheckingIds((s) => { const n = new Set(s); n.delete(m.id); return n; });
        }
    };

    // ── CRUD ───────────────────────────────────────────────────────────────
    const openAdd  = () => { setEditTarget(null); setDialogOpen(true); };
    const openEdit = (m: Monitor) => { setEditTarget(m); setDialogOpen(true); };

    // ── Status summary counts ──────────────────────────────────────────────
    const activeMonitors = monitors.filter((m) => !m.paused);
    const upCount   = activeMonitors.filter((m) => statusMap[m.id]?.latest?.ok === true).length;
    const downCount = activeMonitors.filter((m) => statusMap[m.id]?.latest?.ok === false).length;
    const pausedCount = monitors.filter((m) => m.paused).length;

    const handleSaved = (saved: Monitor) => {
        setMonitors((prev) => {
            const idx = prev.findIndex((m) => m.id === saved.id);
            return idx === -1 ? [...prev, saved] : prev.map((m) => m.id === saved.id ? saved : m);
        });
        // Fetch status shortly after save so the new monitor's first check shows up
        setTimeout(fetchStatus, 3000);
    };

    const handleTogglePause = async (m: Monitor) => {
        const res = await fetch(`${API}/workspaces/${id}/monitors/${m.id}/pause`, {
            method: "PATCH", credentials: "include",
        });
        if (res.ok) {
            const data = await res.json();
            setMonitors((prev) => prev.map((x) => x.id === m.id ? data.monitor : x));
            setTimeout(fetchStatus, 2000);
        }
    };

    const handleDelete = async (m: Monitor) => {
        if (!confirm(`Delete monitor "${m.name}"? This cannot be undone.`)) return;
        const res = await fetch(`${API}/workspaces/${id}/monitors/${m.id}`, {
            method: "DELETE", credentials: "include",
        });
        if (res.ok) {
            setMonitors((prev) => prev.filter((x) => x.id !== m.id));
            setStatusMap((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    if (loadingPage) {
        return (
            <div className="flex items-center gap-2 text-zinc-400 pt-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading…</span>
            </div>
        );
    }

    if (notFound || !workspace) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                <FolderOpen className="size-10 mb-3 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-500">Workspace not found</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/workspace")}>
                    Back to Workspaces
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon-sm" onClick={() => router.push("/workspace")}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {workspace.name}
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
                            {monitors.length} monitor{monitors.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <Button onClick={openAdd} className="gap-2 shrink-0">
                    <Plus className="size-4" /> Add Monitor
                </Button>
            </div>

            {/* ── Status summary bar ── */}
            {monitors.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border bg-card text-sm">
                    {upCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="size-4" />
                            {upCount} up
                        </span>
                    )}
                    {downCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                            <XCircle className="size-4" />
                            {downCount} down
                        </span>
                    )}
                    {pausedCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-zinc-400 font-medium">
                            <PauseCircle className="size-4" />
                            {pausedCount} paused
                        </span>
                    )}
                    {activeMonitors.length > 0 && upCount + downCount > 0 && (
                        <>
                            <span className="text-zinc-300 dark:text-zinc-600 select-none">|</span>
                            <span className="text-zinc-500 dark:text-zinc-400">
                                {Math.round((upCount / (upCount + downCount)) * 100)}% overall up
                            </span>
                        </>
                    )}
                    {upCount === 0 && downCount === 0 && pausedCount === 0 && (
                        <span className="text-zinc-400">Waiting for first check…</span>
                    )}
                </div>
            )}

            {monitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
                    <Globe className="size-10 mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No monitors yet</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        Add your first monitor to start tracking uptime and response times.
                    </p>
                    <Button size="sm" onClick={openAdd} className="mt-4 gap-2">
                        <Plus className="size-4" /> Add Monitor
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {monitors.map((m) => (
                        <MonitorCard
                            key={m.id}
                            monitor={m}
                            status={statusMap[m.id] ?? null}
                            checking={checkingIds.has(m.id)}
                            onEdit={openEdit}
                            onTogglePause={handleTogglePause}
                            onDelete={handleDelete}
                            onManualCheck={handleManualCheck}
                            onViewDetail={(mon) => router.push(`/workspace/${id}/${mon.id}`)}
                        />
                    ))}
                </div>
            )}

            <MonitorFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                initial={editTarget}
                workspaceId={id}
                onSaved={handleSaved}
            />
        </>
    );
}

