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
    let countryCode = req.headers.get('x-vercel-ip-country');

    // In local development or if Vercel geo header is not available,
    // fetch from ipapi from the server-side to avoid CORS issues.
    if (!countryCode) {
      try {
        const ipapiRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
        if (ipapiRes.ok) {
          const data = await ipapiRes.json();
          countryCode = data?.country_code || null;
        }
      } catch (e) {
        console.error('Failed to detect country via server-side ipapi:', e);
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
