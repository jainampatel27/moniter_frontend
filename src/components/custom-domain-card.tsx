"use client";

import { useState, useEffect } from "react";
import {
    Globe,
    Copy,
    Check,
    ChevronRight,
    ExternalLink,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Link2,
    Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type DomainStatus = "idle" | "saving" | "verifying" | "verified" | "failed";

interface CustomDomainCardProps {
    workspaceId: string;
    workspaceName: string;
    /** The app's own hostname customers point their CNAME at, e.g. "app.neuraledgeworks.com" */
    appHostname?: string;
}

export function CustomDomainCard({
    workspaceId,
    workspaceName,
    appHostname,
}: CustomDomainCardProps) {
    const target = appHostname ?? (typeof window !== "undefined" ? window.location.hostname : "app.neuraledgeworks.com");

    const [savedDomain, setSavedDomain]   = useState<string | null>(null);
    const [inputDomain, setInputDomain]   = useState("");
    const [status, setStatus]             = useState<DomainStatus>("idle");
    const [errorMsg, setErrorMsg]         = useState<string | null>(null);
    const [copied, setCopied]             = useState(false);
    const [step, setStep]                 = useState<1 | 2 | 3>(1);
    const [loadingInit, setLoadingInit]   = useState(true);

    // ── Load existing custom domain ──────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(
                    `${API}/workspaces/${workspaceId}/custom-domain`,
                    { credentials: "include" }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.customDomain) {
                        setSavedDomain(data.customDomain);
                        setInputDomain(data.customDomain);
                        setStep(data.verified ? 3 : 2);
                        setStatus(data.verified ? "verified" : "idle");
                    }
                }
            } catch {
                /* no-op — first time */
            } finally {
                setLoadingInit(false);
            }
        };
        load();
    }, [workspaceId]);

    // ── Copy CNAME target ────────────────────────────────────────────────────
    const copyTarget = () => {
        navigator.clipboard.writeText(target);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Save domain ──────────────────────────────────────────────────────────
    const handleSave = async () => {
        const domain = inputDomain.trim().toLowerCase();
        if (!domain) return;
        setStatus("saving");
        setErrorMsg(null);
        try {
            const res = await fetch(
                `${API}/workspaces/${workspaceId}/custom-domain`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ domain }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            setSavedDomain(domain);
            setStep(2);
            setStatus("idle");
        } catch (e: unknown) {
            setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
            setStatus("idle");
        }
    };

    // ── Verify domain ────────────────────────────────────────────────────────
    const handleVerify = async () => {
        setStatus("verifying");
        setErrorMsg(null);
        try {
            const res = await fetch(
                `${API}/workspaces/${workspaceId}/custom-domain/verify`,
                { method: "POST", credentials: "include" }
            );
            const data = await res.json();
            if (!res.ok || !data.verified) {
                throw new Error(data.error || "CNAME not detected yet. DNS can take up to 48h to propagate.");
            }
            setStatus("verified");
            setStep(3);
        } catch (e: unknown) {
            setStatus("failed");
            setErrorMsg(e instanceof Error ? e.message : "Verification failed");
        }
    };

    // ── Remove domain ────────────────────────────────────────────────────────
    const handleRemove = async () => {
        if (!confirm(`Remove custom domain "${savedDomain}"?`)) return;
        try {
            await fetch(`${API}/workspaces/${workspaceId}/custom-domain`, {
                method: "DELETE",
                credentials: "include",
            });
            setSavedDomain(null);
            setInputDomain("");
            setStep(1);
            setStatus("idle");
            setErrorMsg(null);
        } catch {
            setErrorMsg("Failed to remove domain");
        }
    };

    if (loadingInit) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Globe className="size-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Custom Domain</CardTitle>
                        <CardDescription>Use your own domain for the public status page</CardDescription>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                </CardContent>
            </Card>
        );
    }

    const defaultUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/status/${workspaceId}`;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">Custom Domain</CardTitle>
                        {status === "verified" && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400 text-[11px] gap-1">
                                <CheckCircle2 className="size-3" /> Active
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Host <span className="font-medium">{workspaceName}&apos;s</span> status page on your own domain
                    </CardDescription>
                </div>
            </CardHeader>
            <Separator />

            <CardContent className="pt-5 space-y-6">

                {/* ── Current status page URL ─────────────────────────────── */}
                <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900 px-4 py-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Current public status URL</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">{defaultUrl}</p>
                        <a
                            href={defaultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>
                </div>

                {/* ── Step tracker ────────────────────────────────────────── */}
                <div className="flex items-center gap-0">
                    {([1, 2, 3] as const).map((s, i) => (
                        <div key={s} className="flex items-center gap-0 flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors ${
                                    step > s
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : step === s
                                            ? "border-primary text-primary bg-primary/10"
                                            : "border-zinc-200 dark:border-zinc-700 text-zinc-400"
                                }`}>
                                    {step > s ? <Check className="size-3.5" /> : s}
                                </div>
                                <span className={`text-[10px] font-medium whitespace-nowrap ${
                                    step >= s ? "text-primary" : "text-muted-foreground"
                                }`}>
                                    {s === 1 ? "Enter domain" : s === 2 ? "Add CNAME" : "Verified"}
                                </span>
                            </div>
                            {i < 2 && (
                                <div className={`h-0.5 flex-1 mx-2 mb-4 rounded-full transition-colors ${
                                    step > s ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                                }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Step 1: Enter domain ─────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Your custom domain</label>
                            <p className="text-xs text-muted-foreground">
                                Enter the subdomain you want to use, e.g. <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">status.yourcompany.com</span>
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-domain-input"
                                    placeholder="status.yourcompany.com"
                                    value={inputDomain}
                                    onChange={(e) => setInputDomain(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                    className="font-mono text-sm"
                                />
                                <Button
                                    onClick={handleSave}
                                    disabled={!inputDomain.trim() || status === "saving"}
                                    className="shrink-0 gap-1.5"
                                >
                                    {status === "saving" ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>Continue <ChevronRight className="size-4" /></>
                                    )}
                                </Button>
                            </div>
                        </div>
                        {errorMsg && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-3 py-2.5">
                                <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 2: Add CNAME instructions ──────────────────────── */}
                {step === 2 && savedDomain && (
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Link2 className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    Add this CNAME record to your DNS
                                </p>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Go to your domain registrar (Cloudflare, GoDaddy, Namecheap, etc.) and add the following DNS record:
                            </p>

                            {/* DNS record table */}
                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden text-xs font-mono">
                                <div className="grid grid-cols-3 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 text-amber-700 dark:text-amber-300 font-semibold font-sans">
                                    <span>Type</span>
                                    <span>Name</span>
                                    <span>Value</span>
                                </div>
                                <div className="grid grid-cols-3 bg-white dark:bg-zinc-900/60 px-3 py-3 gap-2 items-center">
                                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">CNAME</span>
                                    <span className="text-zinc-600 dark:text-zinc-400 truncate">
                                        {savedDomain.split(".").slice(0, -2).join(".") || savedDomain}
                                    </span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-zinc-700 dark:text-zinc-300 truncate">{target}</span>
                                        <button
                                            onClick={copyTarget}
                                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                            title="Copy value"
                                        >
                                            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1 pt-1">
                                <p>⏱️ DNS changes can take <strong>a few minutes to 48 hours</strong> to propagate globally.</p>
                                <p>🔒 SSL certificate will be provisioned automatically once verified.</p>
                            </div>
                        </div>

                        {/* Entered domain reminder */}
                        <div className="flex items-center justify-between rounded-lg border bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <Globe className="size-4 text-muted-foreground shrink-0" />
                                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">{savedDomain}</span>
                            </div>
                            <button
                                onClick={() => { setStep(1); setStatus("idle"); }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
                            >
                                Change
                            </button>
                        </div>

                        {/* Verify button */}
                        <div className="space-y-2">
                            <Button
                                id="verify-domain-btn"
                                onClick={handleVerify}
                                disabled={status === "verifying"}
                                className="w-full gap-2"
                            >
                                {status === "verifying" ? (
                                    <><Loader2 className="size-4 animate-spin" /> Checking DNS…</>
                                ) : (
                                    <><CheckCircle2 className="size-4" /> I&apos;ve added the CNAME — Verify now</>
                                )}
                            </Button>

                            {status === "failed" && errorMsg && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-3 py-2.5">
                                    <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">Verification failed</p>
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errorMsg}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Step 3: Verified / Active ─────────────────────────── */}
                {step === 3 && savedDomain && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-4">
                            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Custom domain is live!</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                                    Your status page is now accessible at your custom domain.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900 px-4 py-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Your custom status URL</p>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">https://{savedDomain}</p>
                                <a
                                    href={`https://${savedDomain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <ExternalLink className="size-3.5" />
                                </a>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemove}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                        >
                            <Trash2 className="size-3.5" />
                            Remove custom domain
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
