"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { motion } from "framer-motion";
import { PlayCircle, RefreshCw } from "lucide-react";

const TESTIMONIALS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/testimonial/public-testimonials`;

const DEFAULT_STATIC_MESSAGE = "Amdaani app is good — nice billing.";
const DEFAULT_NAME = "Amdaani User";
const DEFAULT_DESIGNATION = "Business Owner";

const FALLBACK_TESTIMONIALS = [
  {
    _id: "fallback-1",
    name: DEFAULT_NAME,
    designation: DEFAULT_DESIGNATION,
    message: DEFAULT_STATIC_MESSAGE,
    isActive: true,
  },
];

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

const getYouTubeVideoId = (rawUrl) => {
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

const extractVideoId = (rawUrl) => getYouTubeVideoId(rawUrl);

const getEmbedUrl = (rawUrl) => {
  const videoId = extractVideoId(rawUrl);
  if (!videoId) return "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
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

const generateLightDots = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(4, 9),
    duration: rand(10, 20),
    delay: rand(0, 6),
    dx: rand(-90, 90),
    dy: rand(-60, 60),
  }));

function AnimatedBackground({ theme }) {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState([]);
  const [lightDots, setLightDots] = useState([]);

  useEffect(() => {
    setStars(generateStars(50));
    setLightDots(generateLightDots(20));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-35 animate-[testiMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.06)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.06)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.05)_0%,transparent_60%)] bg-[length:200%_200%]" />
        <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-400/8 blur-3xl animate-[testiFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-[-40px] h-96 w-96 rounded-full bg-cyan-400/8 blur-3xl animate-[testiFloatB_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-60px] left-1/3 h-72 w-72 rounded-full bg-indigo-300/8 blur-3xl animate-[testiFloatA_16s_ease-in-out_infinite_reverse]" />
        <div className="absolute inset-0 opacity-20 animate-[testiSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.05)_50%,transparent_70%)]" />

        {mounted &&
          lightDots.map((dot) => (
            <span
              key={dot.id}
              className="absolute rounded-full bg-[#2563eb]/15 blur-[1.5px] animate-[testiDrift_var(--dur)_ease-in-out_infinite]"
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                "--dur": `${dot.duration}s`,
                "--dx": `${dot.dx}px`,
                "--dy": `${dot.dy}px`,
                animationDelay: `${dot.delay}s`,
              }}
            />
          ))}

        <style jsx>{`
          @keyframes testiMeshShift {
            0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%; }
            50% { background-position: 20% 20%, 80% 10%, 40% 90%; }
          }
          @keyframes testiFloatA {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(35px, -30px) scale(1.1); }
          }
          @keyframes testiFloatB {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-30px, 25px) scale(1.08); }
          }
          @keyframes testiSweep {
            0%, 100% { transform: translateX(-10%); }
            50% { transform: translateX(10%); }
          }
          @keyframes testiDrift {
            0% { transform: translate(0, 0); opacity: 0.12; }
            50% { transform: translate(var(--dx), var(--dy)); opacity: 0.5; }
            100% { transform: translate(0, 0); opacity: 0.12; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[testiStarDrift_var(--dur)_ease-in-out_infinite]"
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
      <style jsx>{`
        @keyframes testiStarDrift {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
          50% { transform: translate(var(--dx), var(--dy)) scale(1.4); opacity: 1; }
          100% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

export default function TestimonialSection() {
  const { theme } = useTheme();

  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTestimonials = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(TESTIMONIALS_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
        throw new Error(result?.message || "Failed to fetch testimonials");
      }

      const activeTestimonials = result.data.filter((item) => item?.isActive);
      const finalItems = activeTestimonials.length
        ? activeTestimonials
        : result.data;

      setTestimonials(finalItems.length ? finalItems : FALLBACK_TESTIMONIALS);
    } catch (err) {
      setError(err?.message || "Failed to fetch testimonials");
      setTestimonials(FALLBACK_TESTIMONIALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const cards = useMemo(
    () =>
      (Array.isArray(testimonials) ? testimonials : []).map((item) => {
        const name = item?.name || DEFAULT_NAME;
        const designation = item?.designation || DEFAULT_DESIGNATION;
        const message = item?.message || DEFAULT_STATIC_MESSAGE;
        const imageUrl = item?.imageUrl || "";
        const videoId = extractVideoId(item?.youtubeLink);
        const videoUrl = item?.youtubeLink
          ? normalizeVideoUrl(item?.youtubeLink)
          : "";
        const embedUrl = videoId ? getEmbedUrl(item?.youtubeLink) : "";

        return {
          ...item,
          name,
          designation,
          message,
          imageUrl,
          videoId,
          videoUrl,
          embedUrl,
        };
      }),
    [testimonials],
  );

  const visibleCards = useMemo(
    () =>
      cards.map((item) => ({
        ...item,
        hasVideo: Boolean(item?.videoId && item?.embedUrl),
        // hasImage is intentionally NOT used to render a big duplicate box —
        // the image is shown only once, in the small avatar at the bottom.
      })),
    [cards],
  );

  const totalSlides = visibleCards.length;
  const isSingleTestimonial = totalSlides === 1;

  // Marquee speed: roughly 5s per card so more testimonials = longer, smoother loop
  const marqueeDuration = Math.max(totalSlides * 6, 18);

  const renderCard = (item, index, keySuffix = "") => (
    <motion.div
      key={`${item?._id || item?.name}-${index}${keySuffix}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: (index % 6) * 0.04 }}
      className={`w-[300px] sm:w-[340px] flex-shrink-0 rounded-xl border p-6 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        theme === "light"
          ? "bg-white/90 border-slate-200"
          : "bg-slate-900/90 border-slate-800"
      }`}
    >
      {/* Video preview only — image testimonials do NOT get a big duplicate box */}
      {item.hasVideo && (
        <div className="relative h-40 w-full mb-4 rounded-lg overflow-hidden bg-black">
          <iframe
            src={item.embedUrl}
            title={`${item?.name || "Customer"} testimonial video`}
            className="h-full w-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 group"
            aria-label={`Open ${item?.name || "customer"} video on YouTube`}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-lg">
                <PlayCircle className="h-6 w-6" />
              </span>
            </div>
          </a>
        </div>
      )}

      <div className="text-amber-500 text-sm mb-2">★★★★★</div>

      <p
        className={`text-[0.95rem] leading-relaxed mb-2 line-clamp-4 ${
          theme === "light" ? "text-slate-600" : "text-slate-300"
        }`}
      >
        "{item?.message || DEFAULT_STATIC_MESSAGE}"
      </p>

      {item.hasVideo && (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline mb-2"
        >
          <PlayCircle className="h-4 w-4" />
          Watch Video
        </a>
      )}

      <div
        className={`flex items-center gap-3 mt-4 pt-4 border-t ${
          theme === "light" ? "border-slate-100" : "border-slate-800"
        }`}
      >
        <img
          src={item.imageUrl || "/images/testimonial-avatar.svg"}
          alt={`${item?.name || "Customer"} avatar`}
          className="w-11 h-11 rounded-full object-cover bg-slate-200 flex-shrink-0"
        />
        <div>
          <strong
            className={`block text-sm ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            {item?.name || "Customer"}
          </strong>
          <div
            className={`text-[0.85rem] ${
              theme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {item?.designation || "Business Owner"}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section
      id="testimonials"
      className={`relative overflow-hidden py-20 px-5 sm:px-8 lg:px-12 ${
        theme === "light" ? "bg-slate-50" : "bg-slate-950"
      }`}
    >
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2
            className={`text-[2.2rem] font-extrabold mb-3 ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            Trusted by Real Shop Owners Across India
          </h2>
          <p
            className={`text-[1.05rem] max-w-2xl mx-auto ${
              theme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Read real stories from retailers growing their business with
            Amdaani.
          </p>

          {error && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <p className="text-sm font-medium text-red-500">{error}</p>
              <button
                onClick={fetchTestimonials}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`rounded-xl border animate-pulse ${
                  theme === "light"
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="space-y-3 p-6">
                  <div className="h-4 w-24 rounded bg-gray-300/40" />
                  <div className="h-4 rounded bg-gray-300/30" />
                  <div className="h-4 w-2/3 rounded bg-gray-300/20" />
                  <div className="h-12 rounded bg-gray-300/20" />
                </div>
              </div>
            ))}
          </div>
        ) : isSingleTestimonial ? (
          <div className="flex justify-center">
            {renderCard(visibleCards[0], 0)}
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            }}
          >
            <div
              className="flex gap-6 w-max testimonial-marquee-track"
              style={{ "--marquee-duration": `${marqueeDuration}s` }}
            >
              {visibleCards.map((item, index) => renderCard(item, index, "-a"))}
              {visibleCards.map((item, index) => renderCard(item, index, "-b"))}
            </div>

            <style jsx>{`
              .testimonial-marquee-track {
                animation: testimonialMarquee var(--marquee-duration) linear
                  infinite;
              }
              .testimonial-marquee-track:hover {
                animation-play-state: paused;
              }
              @keyframes testimonialMarquee {
                from {
                  transform: translateX(0);
                }
                to {
                  transform: translateX(-50%);
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </section>
  );
}