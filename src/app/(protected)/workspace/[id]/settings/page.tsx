"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomDomainCard } from "@/components/custom-domain-card";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function WorkspaceSettingsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [workspaceName, setWorkspaceName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const res = await fetch(`${API}/workspaces/${id}`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setWorkspaceName(data.workspace?.name ?? "");
                } else {
                    router.push("/workspace");
                }
            } catch {
                router.push("/workspace");
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspace();
    }, [id, router]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-zinc-400 pt-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading…</span>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => router.push(`/workspace/${id}`)}
                >
                    <ArrowLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <Settings2 className="size-5 text-muted-foreground" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            Settings
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
                            {workspaceName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="grid gap-6 max-w-2xl">
                <CustomDomainCard
                    workspaceId={id}
                    workspaceName={workspaceName}
                />
            </div>
        </>
    );
}
