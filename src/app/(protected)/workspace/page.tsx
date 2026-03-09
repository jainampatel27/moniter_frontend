"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { WorkspaceCreateDialog } from "@/components/workspace-create-dialog";
import { WorkspaceCard } from "@/components/workspace-card";
import type { Workspace } from "@/components/workspace-card";

const MAX_WORKSPACES = 2;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function WorkspacePage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/workspaces`, { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setWorkspaces(d.workspaces ?? []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        await fetch(`${API}/workspaces/${id}`, { method: "DELETE", credentials: "include" });
        setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    };

    const atLimit = workspaces.length >= MAX_WORKSPACES;

    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Workspaces
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Each workspace holds its own set of API endpoints to monitor.
                        {" "}<span className="font-medium text-zinc-700 dark:text-zinc-300">{workspaces.length}/{MAX_WORKSPACES} used.</span>
                    </p>
                </div>

                <WorkspaceCreateDialog disabled={atLimit} />
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Loading workspaces…</span>
                </div>
            ) : workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                    <FolderOpen className="size-10 mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No workspaces yet</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        Create your first workspace to start monitoring APIs.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {workspaces.map((ws) => (
                        <WorkspaceCard key={ws.id} workspace={ws} onDelete={handleDelete} />
                    ))}
                    {atLimit && (
                        <p className="col-span-2 text-center text-xs text-zinc-400 dark:text-zinc-500 pt-2">
                            You&apos;ve reached the {MAX_WORKSPACES}-workspace limit.
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

