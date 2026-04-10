export default function SkeletonGrid() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-800 rounded-xl p-5 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="mb-3">
              <div className="w-3/4 h-8 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
              <div className="w-1/2 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
            <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
              <div className="flex justify-between">
                <div className="w-16 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-800 rounded-xl p-5 animate-pulse"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="w-40 h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                <div className="w-24 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-24 h-8 bg-gray-300 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Top Lists Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-800 rounded-xl p-5 animate-pulse"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                <div>
                  <div className="w-32 h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                  <div className="w-24 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <div className="w-16 h-6 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex justify-between items-center py-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    <div>
                      <div className="w-32 h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                      <div className="w-24 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                    <div className="w-16 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-800 rounded-xl p-5 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg" />
            <div>
              <div className="w-40 h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
              <div className="w-32 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                <div>
                  <div className="w-32 h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                  <div className="w-48 h-3 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                  <div className="w-24 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="w-24 h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                <div className="w-16 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
