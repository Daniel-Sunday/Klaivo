export const config = { runtime: 'edge' };

import { handleCors } from './_utils/cors';

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Custom CORS headers supporting both GET and POST requests
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://klaivo.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // 1. Allow query parameter override for testing/local dev (e.g. /api/geo?geo=NG)
    const url = new URL(req.url);
    let countryCode = url.searchParams.get('geo') || req.headers.get('x-local-geo');

    // 2. Check official Vercel Geo-IP header (production)
    if (!countryCode) {
      countryCode = req.headers.get('x-vercel-ip-country');
    }

    // 3. Fallbacks for local development (no Vercel header)
    if (!countryCode) {
      // Try api.country.is (very fast and reliable)
      try {
        const res = await fetch('https://api.country.is', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          countryCode = data?.country || null;
        }
      } catch (e) {
        console.error('Failed to detect country via api.country.is:', e);
      }

      // If api.country.is fails, try freeipapi.com as secondary fallback
      if (!countryCode) {
        try {
          const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            const data = await res.json();
            countryCode = data?.countryCode || null;
          }
        } catch (e) {
          console.error('Failed to detect country via freeipapi.com:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ country_code: countryCode || 'US' }),
      {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to detect country' }),
      {
        status: 500,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
