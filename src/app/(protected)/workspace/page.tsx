"use client";

import { Play, Square, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
export default function WorkspacePage() {
    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Monitor Workspace
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Manage and configure your API monitors here.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Production API</CardTitle>
                        <CardDescription>https://api.yourdomain.com/v1</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-medium">Status: Online</span>
                            </div>
                            <span className="text-sm text-zinc-500">Uptime: 99.99%</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="w-full flex gap-2">
                                <Square className="size-4 text-zinc-500" />
                                Stop
                            </Button>
                            <Button size="sm" variant="outline" className="w-full flex gap-2">
                                <RefreshCcw className="size-4 text-zinc-500" />
                                Test
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-dashed">
                    <CardHeader>
                        <CardTitle>Staging API</CardTitle>
                        <CardDescription>https://staging-api.yourdomain.com/v1</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-md opacity-75">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-zinc-400"></div>
                                <span className="text-sm font-medium">Status: Paused</span>
                            </div>
                            <span className="text-sm text-zinc-500">Uptime: --</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="w-full flex gap-2">
                                <Play className="size-4" />
                                Start Monitor
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
