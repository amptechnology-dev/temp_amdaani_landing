// app/api/image-proxy/route.js

const ALLOWED_HOSTS = [
  "cdn.amptechnology.in",
  "quickchart.io", 
];

export async function GET(req) {
  const rawUrl = new URL(req.url).searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing url", { status: 400 });
  }

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    return new Response("Domain not allowed", { status: 400 });
  }

  const res = await fetch(target.toString());
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