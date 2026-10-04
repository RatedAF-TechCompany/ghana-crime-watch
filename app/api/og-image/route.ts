const ALLOWED_PREFIX = 'https://zninjnjujptjxdikehun.supabase.co/storage/';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const fallback = `${origin}/og-image.png`;

  // Only proxy our own storage images; never hot-link third-party publishers.
  if (!imageUrl || !imageUrl.startsWith(ALLOWED_PREFIX)) {
    return Response.redirect(fallback, 302);
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return Response.redirect(fallback, 302);
    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return Response.redirect(fallback, 302);
  }
}
