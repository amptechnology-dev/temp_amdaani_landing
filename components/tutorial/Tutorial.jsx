"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, AlertCircle, VideoOff, Phone, Mail, RefreshCw } from "lucide-react";
import api from "../../utils/api";

const tutorialCategories = [
  { id: "all", label: "All Videos" },
  { id: "billing", label: "Billing" },
  { id: "business", label: "Business" },
  { id: "reports", label: "Reports" },
];

// Extract YouTube video ID from any URL format
function extractVideoId(url) {
  if (!url || typeof url !== "string") return "";
  try {
    if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1].split(/[?&]/)[0];
    }
    if (url.includes("v=")) {
      const params = new URL(url).searchParams;
      return params.get("v");
    }
    if (url.includes("/embed/")) {
      return url.split("/embed/")[1].split(/[?&]/)[0];
    }
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)/;
    const match = url.match(regex);
    return match ? match[1] : "";
  } catch (err) {
    console.error("Error parsing video URL:", url, err);
    return "";
  }
}

export default function Tutorial() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [videos, setVideos] = useState([]);

  const [currentVideo, setCurrentVideo] = useState("");
  const [playing, setPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchVideos = useCallback(async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      setError(null);

      const response = await api.get("/how-to-videos/active");

      if (response.success && response.data) {
        const formatted = response.data.map((video) => ({
          id: video._id,
          title: video.title,
          description: video.description,
          category: video.tags?.length > 0 ? video.tags[0] : "demo",
          videoId: extractVideoId(video.youtubeUrl),
          thumbnail: `https://img.youtube.com/vi/${extractVideoId(video.youtubeUrl)}/0.jpg`,
          youtubeUrl: video.youtubeUrl,
          order: video.order,
          isActive: video.isActive,
        }));

        setVideos(formatted);

        if (formatted.length > 0) {
          setCurrentVideo((prev) => prev || formatted[0].videoId);
        }
      } else {
        throw new Error(response.message || "Failed to fetch videos");
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(err.message || "Failed to load tutorial videos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = useMemo(
    () =>
      selectedCategory === "all"
        ? videos
        : videos.filter((v) => v.category?.toLowerCase() === selectedCategory.toLowerCase()),
    [videos, selectedCategory]
  );

  const playVideo = (videoId) => {
    if (!videoId) return;
    setCurrentVideo(videoId);
    setPlaying(true);
    setVideoLoading(true);
    setVideoError(false);
  };

  const togglePlaying = () => setPlaying((prev) => !prev);

  const currentVideoData = videos.find((v) => v.videoId === currentVideo);
  const videoTitle = currentVideoData?.title || "Amdaani Tutorial";
  const videoDescription = currentVideoData?.description || "Select a video to get started";

  // ---------------- Loading state ----------------
  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-[13.5px] mt-4">Loading tutorial videos...</p>
      </div>
    );
  }

  // ---------------- Error state (no videos at all) ----------------
  if (error && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <AlertCircle size={44} className="text-red-500 mb-3" />
        <h3 className="text-red-600 font-semibold text-[15px] mb-1.5">Failed to load videos</h3>
        <p className="text-slate-500 text-[13.5px] text-center mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => fetchVideos()}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-7 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Video Tutorials</h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            Learn how to use AMDAANI with quick walkthroughs
          </p>
        </div>
        <button
          onClick={() => fetchVideos(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[12.5px] font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------- Left: Player + list ---------------- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main video player card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="flex items-start justify-between p-4 pb-3">
              <div className="min-w-0 pr-3">
                <h2 className="font-semibold text-[15px] text-slate-900 truncate">{videoTitle}</h2>
                <p className="text-[12.5px] text-slate-500 mt-0.5 line-clamp-2">{videoDescription}</p>
              </div>
              <button
                onClick={togglePlaying}
                disabled={!currentVideo}
                className="shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
              >
                {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
            </div>

            <div className="relative w-full aspect-video bg-slate-100">
              {!currentVideo ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
                  <Play size={40} className="text-slate-300 mb-2" />
                  <p className="text-[13px] text-slate-400">Select a video to play</p>
                </div>
              ) : (
                <>
                  {videoLoading && !videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                      <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[12.5px] text-slate-400 mt-3">Loading video...</p>
                    </div>
                  )}

                  {videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                      <AlertCircle size={36} className="text-red-500 mb-2" />
                      <p className="text-[13px] text-red-600 mb-3">Failed to load video</p>
                      <button
                        onClick={() => playVideo(currentVideo)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <iframe
                    key={currentVideo}
                    src={`https://www.youtube.com/embed/${currentVideo}?autoplay=${playing ? 1 : 0}`}
                    title={videoTitle}
                    className={`absolute inset-0 w-full h-full ${videoLoading || videoError ? "opacity-0" : "opacity-100"}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setVideoLoading(false)}
                    onError={() => setVideoError(true)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tutorialCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Video list */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-bold text-[16px] text-slate-900">Tutorial Videos</h3>
              <span className="text-[12.5px] text-slate-400">
                {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 bg-white flex flex-col items-center py-12">
                <VideoOff size={36} className="text-slate-300 mb-2" />
                <p className="text-[13px] text-slate-400">No videos found in this category</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredVideos.map((video) => {
                  const isActive = currentVideo === video.videoId;
                  return (
                    <button
                      key={video.id}
                      onClick={() => playVideo(video.videoId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? "border-blue-500 bg-blue-50/60 shadow-sm"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[13.5px] font-semibold truncate ${
                            isActive ? "text-blue-700" : "text-slate-900"
                          }`}
                        >
                          {video.title}
                        </p>
                        <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5">
                          {video.description}
                        </p>
                        {video.category && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full border border-slate-200 text-[10.5px] text-slate-500">
                            {video.category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Right: Help card ---------------- */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 text-center sticky top-24">
            <h3 className="font-bold text-[15px] text-slate-900 mb-1.5">Need Personalized Help?</h3>
            <p className="text-[13px] text-slate-500 mb-5">
              Our support team is ready to assist you with any questions
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="tel:8697972001"
                className="flex items-center justify-center gap-2 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold transition-colors"
              >
                <Phone size={16} />
                Call
              </a>
              <a
                href="mailto:support@amdani.com"
                className="flex items-center justify-center gap-2 h-11 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13.5px] font-semibold transition-colors"
              >
                <Mail size={16} />
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}