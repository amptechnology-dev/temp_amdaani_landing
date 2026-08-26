// app/api/image-proxy/route.js
export async function GET(req) {
  const url = new URL(req.url).searchParams.get("url");

  if (!url || !url.startsWith("https://cdn.amptechnology.in/")) {
    return new Response("Invalid URL", { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    return new Response("Failed to fetch image", { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/webp",
      "Cache-Control": "public, max-age=86400",
    },
  });
}