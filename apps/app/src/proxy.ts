// apps/app/src/proxy.ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { CSP_EXTRA_ORIGINS } from "@/lib/brand";

const PUBLIC_PATHS = ["/login", "/monitoring"];

const isDev = process.env.NODE_ENV === "development";

// The Vercel preview toolbar is only loaded on preview deployments, so it never needs
// to be in a production CSP.
const isVercelPreview = process.env.VERCEL_ENV === "preview";

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "").origin;
  } catch {
    return "";
  }
})();

// Origins a fork adds (analytics, CDN, ...), appended to script-src and connect-src.
const extraOrigins = CSP_EXTRA_ORIGINS ? ` ${CSP_EXTRA_ORIGINS}` : "";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${isVercelPreview ? " https://vercel.live" : ""}${extraOrigins};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://img.logokit.com https://*.walletconnect.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}${extraOrigins} https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.reown.com wss://relay.walletconnect.com wss://relay.walletconnect.org https://eth.merkle.io https://*.hyperliquid.xyz https://*.hyperliquid-testnet.xyz https://fonts.googleapis.com;
  frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
