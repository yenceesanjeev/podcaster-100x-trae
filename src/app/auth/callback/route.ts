import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // If "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  // You can add any custom logic here if needed
  // For now, just redirect to the next page or home
  return NextResponse.redirect(`${origin}${next}`);
}