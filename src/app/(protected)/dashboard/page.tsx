"use client";

import { useContext } from "react";
import { Activity, Database, Server, Zap } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { UserContext } from "@/components/dashboard-layout";

export default function DashboardPage() {
    const user = useContext(UserContext);

    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Overview
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    This is your private dashboard. Only authenticated users can see this.
                </p>
            </div>

            {/* Dashboard Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <Activity className="size-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12,345</div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">+20% from last month</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Servers</CardTitle>
                        <Server className="size-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8</div>
                        <p className="text-xs text-green-500">All systems operational</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database Load</CardTitle>
                        <Database className="size-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">42%</div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Normal operating range</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                        <Zap className="size-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">124ms</div>
                        <p className="text-xs text-red-500">+12ms from last week</p>
                    </CardContent>
                </Card>
            </div>

            {/* API Keys Section (Mock) */}
            <Card className="mt-4 shadow-sm border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle>Your Details</CardTitle>
                    <CardDescription>We decoded this from your login session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4 text-sm">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Name:</div>
                        <div className="text-zinc-500 dark:text-zinc-400">{user?.name || "N/A"}</div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Email:</div>
                        <div className="text-zinc-500 dark:text-zinc-400">{user?.email}</div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
