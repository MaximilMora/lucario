export default function PokemonDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Pokemon Card Skeleton */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Section Skeleton */}
            <div className="flex flex-col items-center">
              {/* Pokemon Image Skeleton */}
              <div className="w-64 h-64 mb-6 bg-gray-200 rounded-lg animate-pulse"></div>

              {/* Pokemon Name Skeleton */}
              <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>

              {/* Pokemon ID Skeleton */}
              <div className="h-6 bg-gray-200 rounded w-16 mb-4 animate-pulse"></div>
            </div>

            {/* Details Section Skeleton */}
            <div className="space-y-6">
              {/* Types Skeleton */}
              <div>
                <div className="h-6 bg-gray-200 rounded w-16 mb-3 animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                </div>
              </div>

              {/* Abilities Skeleton */}
              <div>
                <div className="h-6 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-28 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
