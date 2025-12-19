import React from 'react'

export default function Continue() {
  const continueWatching = [
    { id: 1, title: 'Show 1', progress: 45, type: 'tv' },
    { id: 2, title: 'Movie 1', progress: 78, type: 'movie' },
    { id: 3, title: 'Show 2', progress: 23, type: 'tv' }
  ]

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Continue Watching</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">{continueWatching.length} in progress</p>

      {continueWatching.length > 0 ? (
        <div className="space-y-4">
          {continueWatching.map((item) => (
            <div key={item.id} className="group cursor-pointer glass rounded overflow-hidden hover:bg-white/10 transition">
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-32 h-24 bg-neutral-900 rounded" />

                {/* Info */}
                <div className="flex-1 py-2">
                  <h3 className="text-lg font-semibold mb-1 text-white">{item.title}</h3>
                  <p className="text-xs text-neutral-600 uppercase tracking-wide mb-3">{item.type === 'movie' ? 'Movie' : 'TV Show'}</p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white/40 h-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{item.progress}% watched</p>
                  </div>
                </div>

                {/* Play Button */}
                <div className="flex items-center justify-center">
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded transition border border-white/10">
                    ▸
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Nothing in progress</p>
          <p className="text-neutral-600 text-sm">Start watching something to continue later</p>
        </div>
      )}
    </div>
  )
}
