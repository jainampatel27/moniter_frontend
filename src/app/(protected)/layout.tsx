"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Activity, LogOut, Settings2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserContext } from "@/components/dashboard-layout";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<{ name?: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
                const res = await fetch(`${apiUrl}/me`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                } else {
                    router.push("/login");
                }
            } catch {
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
            await fetch(`${apiUrl}/logout`, { method: "POST", credentials: "include" });
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
        <UserContext.Provider value={user}>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="bg-zinc-50 dark:bg-zinc-900/50 w-full overflow-hidden">
                    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm dark:bg-zinc-950">
                        <SidebarTrigger className="-ml-2" />
                        <div className="ml-auto flex items-center gap-4">
                            <div className="hidden text-sm font-medium sm:block text-zinc-600 dark:text-zinc-300">
                                Welcome back, {user?.name || user?.email?.split("@")[0]}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <Avatar>
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                            {(user?.name || user?.email || "U")
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="flex flex-col gap-0.5 px-3 py-2">
                                        <span className="text-sm font-medium text-foreground">{user?.name || "User"}</span>
                                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer" render={<Link href="/settings" />}>
                                        <Settings2 className="size-4" />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="size-4" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </UserContext.Provider>
    );
}
