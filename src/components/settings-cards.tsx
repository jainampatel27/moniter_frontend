"use client";

import { useContext, useState } from "react";
import { useTheme } from "next-themes";
import { User, Bell, Sun } from "lucide-react";
import { UserContext } from "@/components/dashboard-layout";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function ProfileCard() {
    const user = useContext(UserContext);
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <User className="size-4 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-base">Profile</CardTitle>
                    <CardDescription>Your account information</CardDescription>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="settings-email">Email</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="settings-email"
                            defaultValue={user?.email || ""}
                            disabled
                            className="bg-zinc-50 dark:bg-zinc-900"
                        />
                        <Badge variant="secondary" className="shrink-0">Verified</Badge>
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="settings-name">Display Name</Label>
                    <Input
                        id="settings-name"
                        defaultValue={user?.name || ""}
                        disabled
                        className="bg-zinc-50 dark:bg-zinc-900"
                        placeholder="Your name"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export function AppearanceCard() {
    const { resolvedTheme, setTheme } = useTheme();
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Sun className="size-4 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-base">Appearance</CardTitle>
                    <CardDescription>Customize how the app looks</CardDescription>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Dark mode</Label>
                        <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                    </div>
                    <Switch
                        checked={resolvedTheme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export function NotificationsCard() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [alertNotifications, setAlertNotifications] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="size-4 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-base">Notifications</CardTitle>
                    <CardDescription>Choose what you want to be notified about</CardDescription>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Email notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive emails about your API activity</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Alert notifications</Label>
                        <p className="text-xs text-muted-foreground">Get notified when error rates spike</p>
                    </div>
                    <Switch checked={alertNotifications} onCheckedChange={setAlertNotifications} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Weekly digest</Label>
                        <p className="text-xs text-muted-foreground">Weekly summary of your API usage</p>
                    </div>
                    <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                </div>
            </CardContent>
        </Card>
    );
}
