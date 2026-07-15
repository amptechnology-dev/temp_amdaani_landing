"use client";

export default function SkeletonGrid() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-4 h-[110px]"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 mb-3" />
            <div className="h-5 w-24 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 h-[140px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 h-[300px]" />
        <div className="bg-white rounded-2xl border border-slate-200 h-[300px]" />
      </div>
    </div>
  );
}