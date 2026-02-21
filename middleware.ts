import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(
  process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    ? ['/', '/pokemon(.*)', '/battle(.*)', '/api(.*)']
    : []
);

// Responder a OPTIONS (preflight CORS) para evitar 400 Bad Request
function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    // CSP explícito para evitar el aviso "script-src was not explicitly set"
    // y permitir scripts de Next.js y Clerk (requiere @clerk/nextjs >= 6.14.0)
    contentSecurityPolicy: {
      directives: {
        // Permitir scripts de Next.js y Clerk
        // 'unsafe-eval' necesario para Next.js hot reload en desarrollo
        // 'unsafe-inline' necesario para algunos scripts inline de Next.js/Clerk
        'script-src': [
          'self',
          'unsafe-eval', // Necesario para Next.js en desarrollo
          'unsafe-inline', // Necesario para scripts inline de Next.js/Clerk
        ],
        // Permitir fetch a PokeAPI desde el cliente (galería, etc.)
        // Incluir dominios de Clerk para evitar errores de autenticación
        'connect-src': [
          'self',
          'https://pokeapi.co',
          'https://clerk-telemetry.com',
          'https://*.clerk-telemetry.com',
          'https://api.stripe.com',
          'https://relaxing-malamute-31.clerk.accounts.dev',
          'https://*.clerk.accounts.dev',
        ],
        // Permitir iframe de Vercel Live en previews
        'frame-src': ['self', 'https://vercel.live'],
        // Permitir sprites de Pokémon (PokeAPI sprites en GitHub)
        'img-src': [
          'self',
          'https://img.clerk.com',
          'https://raw.githubusercontent.com',
        ],
      },
    },
  }
);

export default function middleware(req: NextRequest) {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  return clerkHandler(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
