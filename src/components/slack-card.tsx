"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Slack, CheckCircle2, AlertCircle, Loader2, Unlink } from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface SlackStatus {
    connected: boolean;
    channel: string | null;
}

interface Props {
    workspaceId: string;
}

export function SlackCard({ workspaceId }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [status, setStatus] = useState<SlackStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API}/slack/status?workspaceId=${workspaceId}`, {
                credentials: "include",
            });
            if (res.ok) setStatus(await res.json());
        } catch {
            // silently fail — Slack section will just show as not connected
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Handle redirect back from Slack OAuth
    useEffect(() => {
        const slack = searchParams.get("slack");
        const channel = searchParams.get("channel");

        if (slack === "connected") {
            setToast({ type: "success", message: `Connected to ${channel || "Slack"} ✅` });
            fetchStatus();
            // Clean up query params without re-fetching the page
            router.replace(window.location.pathname, { scroll: false });
        } else if (slack === "error") {
            const reason = searchParams.get("reason") ?? "unknown error";
            setToast({ type: "error", message: `Slack connection failed: ${reason}` });
            router.replace(window.location.pathname, { scroll: false });
        } else if (slack === "cancelled") {
            setToast({ type: "error", message: "Slack authorisation was cancelled." });
            router.replace(window.location.pathname, { scroll: false });
        }
    }, [searchParams, fetchStatus, router]);

    // Auto-dismiss toast after 5 seconds
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    const handleConnect = () => {
        // Redirect to backend OAuth install endpoint
        window.location.href = `${API}/slack/install?workspaceId=${workspaceId}`;
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            const res = await fetch(`${API}/slack/disconnect`, {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId }),
            });
            if (res.ok) {
                setStatus({ connected: false, channel: null });
                setToast({ type: "success", message: "Slack disconnected." });
            } else {
                setToast({ type: "error", message: "Failed to disconnect Slack." });
            }
        } catch {
            setToast({ type: "error", message: "Network error." });
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#4A154B]/10">
                    <Slack className="size-4 text-[#4A154B] dark:text-purple-400" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-base">Slack Notifications</CardTitle>
                    <CardDescription>
                        Get alerted in Slack when a monitor goes down or recovers
                    </CardDescription>
                </div>
                {status?.connected && (
                    <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                        Connected
                    </Badge>
                )}
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-4">
                {/* Toast */}
                {toast && (
                    <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${toast.type === "success"
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                        }`}>
                        {toast.type === "success"
                            ? <CheckCircle2 className="size-4 shrink-0" />
                            : <AlertCircle className="size-4 shrink-0" />
                        }
                        {toast.message}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Checking connection…</span>
                    </div>
                ) : status?.connected ? (
                    /* Connected state */
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 px-4 py-3">
                            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                    Slack is connected
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                                    Alerts are being sent to <span className="font-semibold">{status.channel}</span>
                                </p>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>📟 <strong>Monitor Down</strong> — instant alert with error details</p>
                            <p>✅ <strong>Monitor Recovered</strong> — alert with total downtime duration</p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleConnect}>
                                Change Channel
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting
                                    ? <Loader2 className="size-4 animate-spin mr-1" />
                                    : <Unlink className="size-4 mr-1" />
                                }
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Not connected state */
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Connect Slack to receive instant alerts when your monitors go down or recover.
                            You&apos;ll be able to choose which channel to post alerts to.
                        </p>

                        <button
                            onClick={handleConnect}
                            className="inline-flex items-center gap-2 rounded-md bg-[#4A154B] hover:bg-[#3d1040] text-white text-sm font-medium px-4 py-2 transition-colors"
                        >
                            <Slack className="size-4" />
                            Add to Slack
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
