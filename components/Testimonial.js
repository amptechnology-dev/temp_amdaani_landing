"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { motion } from "framer-motion";
import { Quote, PlayCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const TESTIMONIALS_ENDPOINT =
	`${process.env.NEXT_PUBLIC_API_URL}/testimonial/public-testimonials`;

const FALLBACK_TESTIMONIALS = [
	{
		_id: "fallback-1",
		name: "Susanth Pal",
		designation: "Shop Owner",
		message: "Amdaani app made my billing system very easy.",
		youtubeLink: "https://youtu.be/dx4Teh-nv3A",
		isActive: true,
	},
];

const normalizeVideoUrl = (rawUrl) => {
	const value = String(rawUrl || "").trim();
	if (!value) return "";

	if (/^https?:\/\//i.test(value)) return value;

	if (/^https?:/i.test(value)) {
		return value.replace(/^https?:/i, "https://");
	}

	if (value.startsWith("//")) return `https:${value}`;

	return `https://${value}`;
};

const extractVideoId = (rawUrl) => {
	const normalized = normalizeVideoUrl(rawUrl);
	if (!normalized) return "";

	try {
		const parsed = new URL(normalized);
		const host = parsed.hostname.toLowerCase();

		if (host.includes("youtu.be")) {
			const id = parsed.pathname.split("/").filter(Boolean)[0];
			return id || "";
		}

		if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
			const queryId = parsed.searchParams.get("v");
			if (queryId) return queryId;

			const parts = parsed.pathname.split("/").filter(Boolean);
			if (parts[0] === "shorts" && parts[1]) return parts[1];
			if (parts[0] === "embed" && parts[1]) return parts[1];
		}
	} catch {
		const compact = String(rawUrl || "")
			.replace(/\s+/g, "")
			.replace(/,/g, "");
		const fallbackMatch = compact.match(/([a-zA-Z0-9_-]{11})/);
		return fallbackMatch ? fallbackMatch[1] : "";
	}

	const fallbackMatch = String(rawUrl || "").match(/([a-zA-Z0-9_-]{11})/);
	return fallbackMatch ? fallbackMatch[1] : "";
};

const getThumbnailUrl = (rawUrl) => {
	const videoId = extractVideoId(rawUrl);
	return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
};

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

const getSlidesPerView = (width) => {
	if (width >= 1024) return 3;
	if (width >= 768) return 2;
	return 1;
};

export default function TestimonialSection() {
	const { theme } = useTheme();
	const currentTheme = themeConfig[theme];

	const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [currentIndex, setCurrentIndex] = useState(0);
	const [slidesPerView, setSlidesPerView] = useState(3);

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

	useEffect(() => {
		const updateSlidesPerView = () => {
			setSlidesPerView(getSlidesPerView(window.innerWidth));
		};

		updateSlidesPerView();
		window.addEventListener("resize", updateSlidesPerView);

		return () => window.removeEventListener("resize", updateSlidesPerView);
	}, []);

	const cards = useMemo(
		() =>
			(Array.isArray(testimonials) ? testimonials : []).map((item) => ({
				...item,
				videoId: extractVideoId(item?.youtubeLink),
				videoUrl: normalizeVideoUrl(item?.youtubeLink),
				thumbnailUrl: getThumbnailUrl(item?.youtubeLink),
				embedUrl: getEmbedUrl(item?.youtubeLink),
			})),
		[testimonials]
	);

	const totalSlides = cards.length;
	const maxIndex = Math.max(0, totalSlides - slidesPerView);

	useEffect(() => {
		setCurrentIndex((prev) => Math.min(prev, maxIndex));
	}, [maxIndex]);

	useEffect(() => {
		if (loading || totalSlides <= slidesPerView) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
		}, 4000);

		return () => clearInterval(interval);
	}, [loading, totalSlides, slidesPerView, maxIndex]);

	const handlePrev = () => {
		setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
	};

	return (
		<section id="testimonials" className={`py-20 px-4 sm:px-6 lg:px-8 ${currentTheme.background}`}>
			<div className="max-w-7xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.2 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<h2 className={`text-4xl md:text-5xl font-bold mb-4 ${currentTheme.text}`}>
						What Customers Say
					</h2>
					<p className={`text-lg md:text-xl ${currentTheme.textSecondary} max-w-3xl mx-auto`}>
						Real stories from businesses growing faster with Amdaani.
					</p>

					{error && (
						<div className="mt-5 flex items-center justify-center gap-3">
							<p className={`text-sm ${currentTheme.error}`}>{error}</p>
							<button
								onClick={fetchTestimonials}
								className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${currentTheme.buttonSecondary}`}
							>
								<RefreshCw className="h-4 w-4" />
								Retry
							</button>
						</div>
					)}
				</motion.div>

				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((item) => (
							<div
								key={item}
								className={`rounded-2xl border overflow-hidden animate-pulse ${currentTheme.surface} ${currentTheme.outline}`}
							>
								<div className="h-44 bg-gray-300/30" />
								<div className="p-5 space-y-3">
									<div className="h-4 bg-gray-300/30 rounded" />
									<div className="h-4 bg-gray-300/20 rounded w-2/3" />
									<div className="h-10 bg-gray-300/20 rounded" />
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="space-y-5">
						<div className="relative overflow-hidden">
							<motion.div
								className="flex gap-6"
								animate={{ x: `-${currentIndex * (100 / slidesPerView)}%` }}
								transition={{ type: "spring", stiffness: 220, damping: 28 }}
							>
								{cards.map((item, index) => (
									<motion.div
										key={item?._id || `${item?.name}-${index}`}
										initial={{ opacity: 0, y: 20 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true, amount: 0.15 }}
										transition={{ duration: 0.45, delay: index * 0.04 }}
										className={`rounded-2xl border overflow-hidden shadow-sm ${currentTheme.surface} ${currentTheme.outline}`}
										style={{ flex: `0 0 calc(${100 / slidesPerView}% - 1rem)` }}
									>
										{item.embedUrl ? (
											<div className="relative h-44 w-full bg-black">
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
													<div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
														<span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 text-red-600 shadow-sm">
															<PlayCircle className="h-7 w-7" />
														</span>
													</div>
												</a>
											</div>
										) : item.thumbnailUrl ? (
											<a href={item.videoUrl} target="_blank" rel="noreferrer" className="block group relative">
												<img
													src={item.thumbnailUrl}
													alt={`${item?.name || "Customer"} video thumbnail`}
													className="h-44 w-full object-cover"
													loading="lazy"
												/>
												<div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
													<span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 text-red-600">
														<PlayCircle className="h-7 w-7" />
													</span>
												</div>
											</a>
										) : (
											<div className="h-44 w-full bg-gray-200/20 flex items-center justify-center">
												<PlayCircle className="h-10 w-10 text-gray-400" />
											</div>
										)}

										<div className="p-5">
											<div className="flex items-start justify-between gap-3 mb-3">
												<div>
													<h3 className={`text-lg font-semibold ${currentTheme.text}`}>
														{item?.name || "Customer"}
													</h3>
													<p className={`text-sm ${currentTheme.textSecondary}`}>
														{item?.designation || "Business Owner"}
													</p>
												</div>
												<Quote className="h-4 w-4 text-gray-400 mt-1" />
											</div>

											<p className={`${currentTheme.textSecondary} text-sm leading-relaxed mb-4`}>
												{item?.message || "Great product and support."}
											</p>

											{item.videoUrl && (
												<a
													href={item.videoUrl}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
												>
													<PlayCircle className="h-4 w-4 mr-1.5" />
													Watch Video
												</a>
											)}
										</div>
									</motion.div>
								))}
							</motion.div>
						</div>

						{totalSlides > slidesPerView && (
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<ButtonNav onClick={handlePrev} ariaLabel="Previous testimonials">
										<ChevronLeft className="h-4 w-4" />
									</ButtonNav>
									<ButtonNav onClick={handleNext} ariaLabel="Next testimonials">
										<ChevronRight className="h-4 w-4" />
									</ButtonNav>
								</div>

								<div className="flex items-center gap-1.5">
									{Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
										<button
											key={`dot-${dotIndex}`}
											onClick={() => setCurrentIndex(dotIndex)}
											className={`h-2.5 rounded-full transition-all ${dotIndex === currentIndex ? "w-6 bg-blue-600" : "w-2.5 bg-gray-300"}`}
											aria-label={`Go to slide ${dotIndex + 1}`}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

function ButtonNav({ onClick, ariaLabel, children }) {
	return (
		<button
			onClick={onClick}
			className="inline-flex items-center justify-center rounded-xl border h-9 w-9 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
			aria-label={ariaLabel}
		>
			{children}
		</button>
	);
}
