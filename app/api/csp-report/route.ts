export async function POST(request: Request) {
  const text = await request.text();
  console.warn('csp-report', text.slice(0, 2000));
  return new Response(null, { status: 204 });
}

export function GET() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}

export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;