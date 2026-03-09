"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type Monitor = {
    id: string;
    name: string;
    url: string;
    type: "HTTP" | "TCP";
    method: "GET" | "POST" | "HEAD";
    interval: number;
    headers: Record<string, string> | null;
    body: string | null;
    expectedStatus: number | null;
    expectedBody: string | null;
    paused: boolean;
    createdAt: string;
};

type FormState = {
    name: string;
    url: string;
    type: "HTTP" | "TCP";
    method: "GET" | "POST" | "HEAD";
    interval: string;
    headers: string;
    body: string;
    expectedStatus: string;
    expectedBody: string;
};

const defaultForm = (): FormState => ({
    name: "", url: "", type: "HTTP", method: "GET", interval: "5",
    headers: "", body: "", expectedStatus: "200", expectedBody: "",
});

const parseHeaders = (raw: string): Record<string, string> | null => {
    if (!raw.trim()) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
    const obj: Record<string, string> = {};
    for (const line of raw.split("\n")) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return Object.keys(obj).length ? obj : null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MonitorFormDialog({
    open, onOpenChange, initial, workspaceId, onSaved,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    initial: Monitor | null;
    workspaceId: string;
    onSaved: (m: Monitor) => void;
}) {
    const [form, setForm] = useState<FormState>(defaultForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        if (initial) {
            setForm({
                name: initial.name,
                url: initial.url,
                type: initial.type,
                method: initial.method,
                interval: String(initial.interval),
                headers: initial.headers ? JSON.stringify(initial.headers, null, 2) : "",
                body: initial.body || "",
                expectedStatus: initial.expectedStatus ? String(initial.expectedStatus) : "",
                expectedBody: initial.expectedBody || "",
            });
        } else {
            setForm(defaultForm());
        }
        setError("");
    }, [open, initial]);

    const set = (key: keyof FormState, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        if (!form.url.trim()) { setError("URL is required"); return; }
        setSaving(true);
        setError("");
        try {
            const payload = {
                name: form.name, url: form.url, type: form.type,
                method: form.method, interval: Number(form.interval),
                headers: parseHeaders(form.headers),
                body: form.body || null,
                expectedStatus: form.expectedStatus ? Number(form.expectedStatus) : null,
                expectedBody: form.expectedBody || null,
            };
            const url = initial
                ? `${API}/workspaces/${workspaceId}/monitors/${initial.id}`
                : `${API}/workspaces/${workspaceId}/monitors`;
            const res = await fetch(url, {
                method: initial ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Failed to save monitor"); return; }
            onSaved(data.monitor);
            onOpenChange(false);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const isHTTP = form.type === "HTTP";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Monitor" : "Add Monitor"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="m-name">Name</Label>
                        <Input id="m-name" placeholder="Production API" value={form.name}
                            onChange={(e) => set("name", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-[110px_1fr] gap-2">
                        <div className="grid gap-1.5">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => v && set("type", v as "HTTP" | "TCP")}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HTTP">HTTP</SelectItem>
                                    <SelectItem value="TCP">TCP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="m-url">{isHTTP ? "URL" : "Host:Port"}</Label>
                            <Input id="m-url"
                                placeholder={isHTTP ? "https://api.example.com/health" : "example.com:5432"}
                                value={form.url} onChange={(e) => set("url", e.target.value)} />
                        </div>
                    </div>

                    <div className={`grid gap-2 ${isHTTP ? "grid-cols-2" : "grid-cols-1"}`}>
                        {isHTTP && (
                            <div className="grid gap-1.5">
                                <Label>HTTP Method</Label>
                                <Select value={form.method} onValueChange={(v) => v && set("method", v as "GET" | "POST" | "HEAD")}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="HEAD">HEAD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label>Check Interval</Label>
                            <Select value={form.interval} onValueChange={(v) => v && set("interval", v)}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 3, 5, 10, 30].map((m) => (
                                        <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isHTTP && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="m-status">Expected Status</Label>
                                    <Input id="m-status" type="number" placeholder="200"
                                        value={form.expectedStatus}
                                        onChange={(e) => set("expectedStatus", e.target.value)} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="m-expbody">Response Contains</Label>
                                    <Input id="m-expbody" placeholder='"ok"'
                                        value={form.expectedBody}
                                        onChange={(e) => set("expectedBody", e.target.value)} />
                                </div>
                            </div>

                            {form.method === "POST" && (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="m-body">Request Body</Label>
                                    <Textarea id="m-body" placeholder='{"key": "value"}'
                                        className="font-mono text-xs resize-none h-24"
                                        value={form.body} onChange={(e) => set("body", e.target.value)} />
                                </div>
                            )}

                            <div className="grid gap-1.5">
                                <Label htmlFor="m-headers">
                                    Custom Headers
                                    <span className="ml-1 text-xs text-muted-foreground font-normal">(JSON or "Key: Value" lines)</span>
                                </Label>
                                <Textarea id="m-headers"
                                    placeholder={"Authorization: Bearer token\nX-Api-Key: abc123"}
                                    className="font-mono text-xs resize-none h-20"
                                    value={form.headers} onChange={(e) => set("headers", e.target.value)} />
                            </div>
                        </>
                    )}

                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {initial ? "Save changes" : "Add Monitor"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
