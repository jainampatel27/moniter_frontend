"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function WorkspaceCreateDialog({ disabled }: { disabled: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) { setName(""); setError(""); }
    };

    const handleCreate = async () => {
        if (!name.trim()) { setError("Name is required"); return; }
        setCreating(true);
        setError("");
        try {
            const res = await fetch(`${API}/workspaces`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Failed to create workspace"); return; }
            setOpen(false);
            setName("");
            router.push(`/workspace/${data.workspace.id}`);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button disabled={disabled} className="shrink-0 gap-2">
                        <Plus className="size-4" />
                        New Workspace
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                    <Label htmlFor="ws-name">Name</Label>
                    <Input
                        id="ws-name"
                        placeholder="e.g. Production, Staging"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        maxLength={64}
                        autoFocus
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <Button onClick={handleCreate} disabled={creating} className="gap-2">
                        {creating && <Loader2 className="size-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
