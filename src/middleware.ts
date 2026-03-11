import { NextRequest, NextResponse } from "next/server";

/**
 * OWN_DOMAIN — set NEXT_PUBLIC_OWN_DOMAIN=neuraledgeworks.com in your env.
 * Any host that IS or ENDS WITH this domain is treated as your own app.
 * Everything else is treated as a potential customer custom domain.
 */
const OWN_DOMAIN = process.env.NEXT_PUBLIC_OWN_DOMAIN || "neuraledgeworks.com";

function isOwnDomain(host: string): boolean {
    return (
        host === "localhost" ||
        host === OWN_DOMAIN ||
        host.endsWith(`.${OWN_DOMAIN}`) ||
        host.endsWith(".vercel.app") ||
        host.endsWith(".coolify.io") ||
        // IP addresses (local dev / docker)
        /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    );
}

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") ?? "";
    const host = hostname.split(":")[0]; // strip port

    // ── Own domain → let Next.js handle it normally ──────────────────────────
    if (isOwnDomain(host)) {
        return NextResponse.next();
    }

    // ── Potential customer custom domain → look up workspace ─────────────────
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

    try {
        const res = await fetch(
            `${apiUrl}/public/domain/${encodeURIComponent(host)}`,
            // Short timeout so a slow API doesn't block every page load
            { signal: AbortSignal.timeout(3000) }
        );

        if (res.ok) {
            const data = await res.json();
            if (data.workspaceId) {
                const url = request.nextUrl.clone();
                url.pathname = `/status/${data.workspaceId}`;
                return NextResponse.rewrite(url);
            }
        }
    } catch {
        // API unreachable or timed out — fall through, don't break the app
    }

    // Unknown custom domain — just pass through (Next.js will show its own 404)
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
