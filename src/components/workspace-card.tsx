"use client";

import { Trash2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";

export type Workspace = {
    id: string;
    name: string;
    createdAt: string;
    _count?: { monitors: number };
};

export function WorkspaceCard({
    workspace, onDelete,
}: {
    workspace: Workspace;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this workspace? This cannot be undone.")) return;
        onDelete(workspace.id);
    };

    const handleStatusPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`/status/${workspace.id}`, "_blank");
    };

    return (
        <Card
            className="group cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/workspace/${workspace.id}`)}
        >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                    <CardTitle className="text-base">{workspace.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                        Created {new Date(workspace.createdAt).toLocaleDateString()}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Open public status page"
                        onClick={handleStatusPage}
                    >
                        <ExternalLink className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {(workspace._count?.monitors ?? 0) === 0 ? (
                            <>
                                <div className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                No endpoints yet
                            </>
                        ) : (
                            <>
                                <div className="size-1.5 rounded-full bg-emerald-500" />
                                {workspace._count!.monitors} endpoint{workspace._count!.monitors !== 1 ? "s" : ""}
                            </>
                        )}
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗ public status page
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
