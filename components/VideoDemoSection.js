"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const WHATSAPP_DEMO_LINK =
  "https://wa.me/918697972001?text=Hi,%20I%20want%20a%20live%20demo%20of%20Amdaani";

const YOUTUBE_VIDEO_ID = "wiTmht5XF2o";
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`;

// Deterministic-ish random, only ever called on the client (after mount),
// so there is no server/client value mismatch to worry about.
const rand = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

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

      {/* Shooting star streaks */}
      <span className="absolute top-[20%] left-[-10%] h-[1.5px] w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-[demoShootingStar_7s_linear_infinite]" />
      <span className="absolute top-[65%] left-[-10%] h-[1.5px] w-20 rounded-full bg-gradient-to-r from-transparent via-blue-200 to-transparent animate-[demoShootingStar_9s_linear_infinite_2.5s]" />

      <style jsx>{`
        @keyframes demoStarDrift {
          0% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
          50% {
            transform: translate(var(--dx), var(--dy)) scale(1.4);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
        }
        @keyframes demoShootingStar {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          20% {
            transform: translateX(140vw) translateY(60px);
            opacity: 0;
          }
          100% {
            transform: translateX(140vw) translateY(60px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function VideoDemoSection() {
  return (
    <section
      id="demo"
      className="relative overflow-hidden py-[70px] px-5 text-center bg-slate-950 text-white"
    >
      {/* Animated background */}
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-[1.9rem] sm:text-[2.2rem] font-extrabold mb-3"
        >
          See How Amdaani Works in 60 Seconds
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto"
        >
          {/* Responsive 16:9 YouTube player */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={YOUTUBE_EMBED_URL}
              title="Amdaani Walkthrough Video"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* <a
            href={WHATSAPP_DEMO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-[#25d366] hover:bg-[#1ebe5b] transition-colors"
          >
            Request Live Demo on WhatsApp
          </a> */}
        </motion.div>
      </div>
    </section>
  );
}