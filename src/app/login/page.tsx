import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center md:justify-start">
                    <a href="#" className="flex items-center gap-2 font-bold text-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                            <GalleryVerticalEnd className="size-5" />
                        </div>
                        Monitor API
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="relative hidden bg-zinc-950 lg:block overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent z-10 mix-blend-multiply" />
                <img
                    src="/login-bg.png"
                    alt="Abstract Background"
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
                />
                <div className="absolute bottom-12 left-12 right-12 z-20 text-white space-y-4">
                    <blockquote className="space-y-2">
                        <p className="text-xl font-medium leading-relaxed tracking-wide text-zinc-100/90 italic">
                            &ldquo;Monitoring our infrastructure has never been easier. The insights we gain are invaluable.&rdquo;
                        </p>
                        <footer className="text-sm font-semibold text-zinc-400">System Architect</footer>
                    </blockquote>
                </div>
            </div>
        </div>
    )
}
