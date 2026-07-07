export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'image/webp,image/png,image/jpeg,image/*,*/*',
      },
    });

    if (!response.ok) {
      return Response.redirect(
        `${new URL(request.url).origin}/og-image.png`,
        302
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return Response.redirect(
      `${new URL(request.url).origin}/og-image.png`,
      302
    );
  }
}
