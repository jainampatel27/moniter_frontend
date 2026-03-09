"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Activity, Users, Settings, Database, Server, Zap, LayoutDashboard, Key, BarChart3, Bell, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ name?: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
                const res = await fetch(`${apiUrl}/me`, {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                } else {
                    router.push("/login");
                }
            } catch (err) {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
            await fetch(`${apiUrl}/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (err) {
            console.error(err);
        }
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Activity className="size-8 animate-pulse text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-900/50">
            {/* Left Sidebar */}
            <aside className="w-64 border-r bg-white dark:bg-zinc-950 hidden flex-col md:flex">
                <div className="flex h-16 items-center border-b px-6 gap-2 font-bold text-lg text-primary">
                    <Activity className="size-6" />
                    <span>Monitor API</span>
                </div>
                <div className="flex-1 overflow-auto py-4">
                    <nav className="grid items-start px-4 text-sm font-medium gap-1">
                        <a href="#" className="flex items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-zinc-50">
                            <LayoutDashboard className="size-4" />
                            Dashboard
                        </a>
                        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                            <BarChart3 className="size-4" />
                            Analytics
                        </a>
                        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                            <Key className="size-4" />
                            API Keys
                        </a>
                        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                            <Shield className="size-4" />
                            Security
                        </a>
                        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                            <Bell className="size-4" />
                            Notifications
                        </a>
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t">
                    <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                        <Settings className="size-4" />
                        Settings
                    </a>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Navbar */}
                <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm dark:bg-zinc-950">
                    <div className="md:hidden flex items-center font-bold text-lg text-primary">
                        <Sheet>
                            <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-2" />}>
                                <Menu className="size-5" />
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0">
                                <div className="sr-only"><SheetTitle>Navigation Menu</SheetTitle></div>
                                <div className="flex h-16 items-center border-b px-6 gap-2 font-bold text-lg text-primary">
                                    <Activity className="size-6" />
                                    <span>Monitor API</span>
                                </div>
                                <div className="flex flex-col h-[calc(100vh-4rem)]">
                                    <div className="flex-1 overflow-auto py-4">
                                        <nav className="grid items-start px-4 text-sm font-medium gap-1">
                                            <a href="#" className="flex items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-zinc-50">
                                                <LayoutDashboard className="size-4" />
                                                Dashboard
                                            </a>
                                            <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                                                <BarChart3 className="size-4" />
                                                Analytics
                                            </a>
                                            <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                                                <Key className="size-4" />
                                                API Keys
                                            </a>
                                            <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                                                <Shield className="size-4" />
                                                Security
                                            </a>
                                            <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                                                <Bell className="size-4" />
                                                Notifications
                                            </a>
                                        </nav>
                                    </div>
                                    <div className="mt-auto p-4 border-t">
                                        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:text-zinc-900 transition-all dark:text-zinc-400 dark:hover:text-zinc-50">
                                            <Settings className="size-4" />
                                            Settings
                                        </a>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <Activity className="size-5 mr-2" />
                        <span>Monitor API</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <div className="hidden text-sm font-medium sm:block text-zinc-600 dark:text-zinc-300">
                            Welcome back, {user?.name || user?.email?.split("@")[0]}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                            <LogOut className="size-4" />
                            Logout
                        </Button>
                    </div>
                </header>

                {/* Main Layout */}
                <main className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
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
                </main>
            </div>
        </div>
    );
}
