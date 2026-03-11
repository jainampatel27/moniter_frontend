import { NextRequest, NextResponse } from "next/server";

// Hostnames that belong to YOUR app — not customers
const OWN_HOSTNAMES = [
    "localhost",
    "app.neuraledgeworks.com",
    "neuraledgeworks.com",
    "www.neuraledgeworks.com",
];

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") ?? "";
    // Strip port if running locally
    const host = hostname.split(":")[0];

    // If it's our own domain → normal Next.js routing, no rewrite
    const isOwnDomain =
        OWN_HOSTNAMES.includes(host) ||
        host.endsWith(".vercel.app") ||
        host.endsWith(".coolify.io");

    if (isOwnDomain) {
        return NextResponse.next();
    }

    // It's a customer's custom domain → look up which workspace it belongs to
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

    try {
        const res = await fetch(`${apiUrl}/public/domain/${encodeURIComponent(host)}`);

        if (res.ok) {
            const data = await res.json();
            const workspaceId: string = data.workspaceId;

            if (workspaceId) {
                // Rewrite internally to /status/[workspaceId]
                // The user still sees their custom domain in the browser
                const url = request.nextUrl.clone();
                url.pathname = `/status/${workspaceId}`;
                return NextResponse.rewrite(url);
            }
        }
    } catch {
        // If lookup fails, fall through to 404
    }

    // Unknown custom domain → return 404 page
    const url = request.nextUrl.clone();
    url.pathname = "/404";
    return NextResponse.rewrite(url);
}

export const config = {
    // Run middleware on ALL routes except:
    // - Next.js internals (_next/static, _next/image)
    // - API routes
    // - Public files (favicon, images, etc.)
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
