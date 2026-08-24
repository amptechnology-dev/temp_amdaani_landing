"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const VIDEOS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/how-to-videos/active`;

// -------------------- Helpers --------------------

const normalizeVideoUrl = (rawUrl) => {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^https?:/i.test(value)) return value.replace(/^https?:/i, "https://");
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value}`;
};

const isValidYouTubeHost = (host) => {
  const normalizedHost = String(host || "").toLowerCase();
  return (
    normalizedHost === "youtu.be" ||
    normalizedHost.endsWith(".youtu.be") ||
    normalizedHost === "youtube.com" ||
    normalizedHost.endsWith(".youtube.com") ||
    normalizedHost === "youtube-nocookie.com" ||
    normalizedHost.endsWith(".youtube-nocookie.com")
  );
};

const extractVideoId = (rawUrl) => {
  const normalized = normalizeVideoUrl(rawUrl);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    if (!isValidYouTubeHost(parsed.hostname)) return "";
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || "";
    }
    const queryId = parsed.searchParams.get("v");
    if (queryId) return queryId;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return parts[1];
    if (parts[0] === "embed" && parts[1]) return parts[1];
  } catch {
    return "";
  }
  return "";
};

const rand = (min, max) =>
  Math.round((min + Math.random() * (max - min)) * 100) / 100;

const generateStars = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(1, 3),
    duration: rand(6, 16),
    delay: rand(0, 6),
    dx: rand(-60, 60),
    dy: rand(-60, 60),
  }));

// -------------------- Background --------------------

function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState([]);

  useEffect(() => {
    setStars(generateStars(45));
    setMounted(true);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-[-60px] left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[demoStarDrift_var(--dur)_ease-in-out_infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "--dur": `${star.duration}s`,
              "--dx": `${star.dx}px`,
              "--dy": `${star.dy}px`,
              animationDelay: `${star.delay}s`,
              boxShadow: "0 0 4px rgba(255,255,255,0.7)",
            }}
          />
        ))}

      <span className="absolute top-[20%] left-[-10%] h-[1.5px] w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-[demoShootingStar_7s_linear_infinite]" />
      <span className="absolute top-[65%] left-[-10%] h-[1.5px] w-20 rounded-full bg-gradient-to-r from-transparent via-blue-200 to-transparent animate-[demoShootingStar_9s_linear_infinite_2.5s]" />

      <style jsx>{`
        @keyframes demoStarDrift {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
          50% { transform: translate(var(--dx), var(--dy)) scale(1.4); opacity: 1; }
          100% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
        }
        @keyframes demoShootingStar {
          0% { transform: translateX(0) translateY(0); opacity: 0; }
          5% { opacity: 1; }
          20% { transform: translateX(140vw) translateY(60px); opacity: 0; }
          100% { transform: translateX(140vw) translateY(60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// -------------------- Main Component --------------------

export default function VideoDemoSection() {
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(VIDEOS_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
        throw new Error(result?.message || "Failed to fetch videos");
      }

      const activeVideos = result.data.filter((item) => item?.isActive);
      const sourceList = activeVideos.length ? activeVideos : result.data;

      const formatted = sourceList
        .map((video) => {
          const videoId = extractVideoId(video?.youtubeUrl);
          return {
            id: video?._id,
            title: video?.title || "Amdaani Tutorial",
            description: video?.description || "",
            videoId,
            thumbnail: videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : "",
            order: video?.order ?? 0,
          };
        })
        .filter((v) => v.videoId)
        .sort((a, b) => a.order - b.order);

      setVideos(formatted);
      setCurrentVideo(formatted.length ? formatted[0] : null);
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(err?.message || "Failed to load tutorial videos");
      setVideos([]);
      setCurrentVideo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const embedUrl = currentVideo
    ? `https://www.youtube.com/embed/${currentVideo.videoId}?rel=0&modestbranding=1&autoplay=1`
    : "";

  return (
    <section
      id="demo"
      className="relative overflow-hidden py-[70px] px-5 text-center bg-slate-950 text-white"
    >
      <AnimatedBackground />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-[1.9rem] sm:text-[2.2rem] font-extrabold mb-3"
        >
          See How Amdaani Works
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-slate-300 text-[1.05rem] mb-8"
        >
          Watch how fast you can create bills and manage stock on your phone.
        </motion.p>

        {error && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <p className="text-sm font-medium text-red-400">{error}</p>
            <button
              onClick={fetchVideos}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin" />
            <p className="mt-4 text-slate-400 text-sm">Loading tutorial videos...</p>
          </div>
        ) : videos.length === 0 ? (
          !error && (
            <p className="text-slate-400 py-16">No tutorial videos available right now.</p>
          )
        ) : (
          <>
            {/* Main Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentVideo?.videoId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg"
                >
                  <iframe
                    src={embedUrl}
                    title={currentVideo?.title || "Amdaani Walkthrough Video"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </motion.div>
              </AnimatePresence>

              {currentVideo && (
                <div className="mt-4 text-left">
                  <h3 className="font-semibold text-white text-base">
                    {currentVideo.title}
                  </h3>
                  {currentVideo.description && (
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                      {currentVideo.description}
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Thumbnail List */}
            {videos.length > 1 && (
              <div className="mt-8 flex gap-4 overflow-x-auto pb-2 justify-start sm:justify-center scrollbar-thin scrollbar-thumb-slate-700">
                {videos.map((video) => {
                  const isActive = currentVideo?.videoId === video.videoId;
                  return (
                    <button
                      key={video.id}
                      onClick={() => setCurrentVideo(video)}
                      className={`flex-shrink-0 w-44 text-left rounded-lg overflow-hidden border transition-all ${
                        isActive
                          ? "border-cyan-400 ring-2 ring-cyan-400/40"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <div className="relative w-full aspect-video bg-slate-800">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-xs font-semibold text-cyan-300 bg-slate-950/70 px-2 py-1 rounded">
                              Playing
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 px-1 py-2 line-clamp-2">
                        {video.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}