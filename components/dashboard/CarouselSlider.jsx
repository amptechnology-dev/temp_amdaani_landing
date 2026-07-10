"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  { title: "Grow your business", subtitle: "Track sales & payments in one place", color: "from-blue-600 to-blue-500" },
  { title: "Get paid faster", subtitle: "Share invoices instantly", color: "from-teal-600 to-teal-500" },
];

export default function CarouselSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[index];

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-r ${slide.color} p-5 text-white overflow-hidden`}
    >
      <p className="font-bold text-lg">{slide.title}</p>
      <p className="text-sm text-white/80 mt-0.5">{slide.subtitle}</p>

      <div className="flex gap-1.5 mt-3">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => setIndex((i) => (i + 1) % slides.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}