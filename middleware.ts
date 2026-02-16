import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(
  process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    ? ['/', '/pokemon(.*)', '/battle(.*)', '/api(.*)']
    : []
);

export default clerkMiddleware(
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
        'img-src': ['self', 'https://img.clerk.com', 'https://raw.githubusercontent.com'],
      },
    },
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
