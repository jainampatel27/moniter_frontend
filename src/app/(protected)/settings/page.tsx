"use client";

import { ProfileCard, AppearanceCard, NotificationsCard } from "@/components/settings-cards";

export default function SettingsPage() {
    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Settings
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="grid gap-6 max-w-2xl">
                <ProfileCard />
                <AppearanceCard />
                <NotificationsCard />
            </div>
        </>
    );
}
