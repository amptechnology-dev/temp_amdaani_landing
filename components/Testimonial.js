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

const extractVideoId = (rawUrl) => {
	return getYouTubeVideoId(rawUrl);
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
				imageUrl: item?.imageUrl || "",
				videoId: extractVideoId(item?.youtubeLink),
				videoUrl: normalizeVideoUrl(item?.youtubeLink),
				embedUrl: getEmbedUrl(item?.youtubeLink),
			})),
		[testimonials]
	);

	const visibleCards = useMemo(
		() =>
			cards.map((item) => ({
				...item,
				hasVideo: Boolean(item?.videoId && item?.embedUrl),
				hasImage: Boolean(item?.imageUrl),
			})),
		[cards]
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
		<section
			id="testimonials"
			className={`relative overflow-hidden py-24 px-5 sm:px-8 lg:px-12 xl:px-16 ${currentTheme.background}`}
		>
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
				<div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
				<div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
			</div>

			<div className="relative mx-auto w-full max-w-7xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.2 }}
					transition={{ duration: 0.5 }}
					className="mx-auto mb-14 max-w-4xl text-center"
				>
					<div
						className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${currentTheme.accentLight} ${currentTheme.accent.replace("bg-", "text-")}`}
					>
						<Quote className="h-4 w-4" />
						Customer Stories
					</div>

					<h2 className={`text-4xl font-black tracking-tight sm:text-5xl md:text-6xl mb-5 ${currentTheme.text}`}>
						Trusted by businesses
						<span className="block bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
							that want speed and clarity.
						</span>
					</h2>
					<p className={`mx-auto max-w-3xl text-lg leading-8 ${currentTheme.textSecondary}`}>
						Real feedback from teams using Amdaani to keep billing simple, professional, and fast.
					</p>

					{error && (
						<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
							<p className={`text-sm font-medium ${currentTheme.error}`}>{error}</p>
							<button
								onClick={fetchTestimonials}
								className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${currentTheme.buttonSecondary}`}
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
								className={`overflow-hidden rounded-[1.75rem] border animate-pulse ${currentTheme.surface} ${currentTheme.outline}`}
							>
								<div className="h-52 bg-gray-300/30" />
								<div className="space-y-3 p-6">
									<div className="h-4 rounded bg-gray-300/30" />
									<div className="h-4 w-2/3 rounded bg-gray-300/20" />
									<div className="h-10 rounded bg-gray-300/20" />
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="space-y-6">
						<div
							className={`relative overflow-hidden rounded-[2rem] border shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl ${theme === "light" ? "border-white/70 bg-white/70" : "border-white/10 bg-white/5"}`}
						>
							<div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5" />
							<div className="relative p-4 sm:p-6">
								<motion.div
									className="flex gap-5"
									animate={{ x: `-${currentIndex * (100 / slidesPerView)}%` }}
								transition={{ type: "spring", stiffness: 220, damping: 28 }}
							>
									{visibleCards.map((item, index) => (
									<motion.div
										key={item?._id || `${item?.name}-${index}`}
										initial={{ opacity: 0, y: 20 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true, amount: 0.15 }}
										transition={{ duration: 0.45, delay: index * 0.04 }}
											className={`group overflow-hidden rounded-[1.75rem] border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${currentTheme.surface} ${currentTheme.outline}`}
											style={{ flex: `0 0 calc(${100 / slidesPerView}% - 1.25rem)` }}
									>
											{item.hasVideo ? (
												<div className="relative h-52 w-full bg-black">
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
															<span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-lg">
																<PlayCircle className="h-7 w-7" />
															</span>
														</div>
													</a>
												</div>
											) : item.hasImage ? (
												<div className={`flex h-52 w-full items-center justify-center ${theme === "light" ? "bg-slate-50" : "bg-white/5"}`}>
													<img
														src={item.imageUrl}
														alt={`${item?.name || "Customer"} testimonial image`}
														className="h-full w-full object-cover"
													/>
												</div>
											) : (
												<div className={`flex h-52 w-full items-center justify-center ${theme === "light" ? "bg-slate-50" : "bg-white/5"}`}>
													<img
														src="/images/testimonial-avatar.svg"
														alt={`${item?.name || "Customer"} avatar`}
														className="h-40 w-40 rounded-full object-cover shadow-lg ring-4 ring-white/80"
													/>
												</div>
											)}

										<div className="space-y-4 p-6">
											<div className="flex items-start justify-between gap-3">
												<div>
													<h3 className={`text-lg font-bold tracking-tight ${currentTheme.text}`}>
														{item?.name || "Customer"}
													</h3>
													<p className={`text-sm ${currentTheme.textSecondary}`}>
														{item?.designation || "Business Owner"}
													</p>
												</div>
												<div className={`rounded-full p-2 ${theme === "light" ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-300"}`}>
													<Quote className="h-4 w-4" />
												</div>
											</div>

											<p className={`text-sm leading-7 ${currentTheme.textSecondary}`}>
												{item?.message || "Great product and support."}
											</p>

											{item.hasVideo && (
												<a
													href={item.videoUrl}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-all hover:gap-2 hover:underline"
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
							<div className="flex flex-wrap items-center justify-between gap-4">
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
			className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white/80 text-gray-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
			aria-label={ariaLabel}
		>
			{children}
		</button>
	);
}
