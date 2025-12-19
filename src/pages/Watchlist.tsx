import React from 'react'

export default function Watchlist() {
  const watchlistItems = [
    { id: 1, title: 'Movie 1', type: 'movie' },
    { id: 2, title: 'TV Show 1', type: 'tv' },
    { id: 3, title: 'Movie 2', type: 'movie' }
  ]

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Watchlist</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">{watchlistItems.length} items saved</p>

      {watchlistItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {watchlistItems.map((item) => (
            <div key={item.id} className="group cursor-pointer relative">
              <div className="glass rounded overflow-hidden mb-2 aspect-video hover:bg-white/10 transition">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-3xl text-neutral-700">◼</div>
                </div>
              </div>
              <p className="text-sm text-neutral-300 group-hover:text-white truncate">{item.title}</p>
              <p className="text-xs text-neutral-600 uppercase tracking-wide">{item.type === 'movie' ? 'Movie' : 'TV'}</p>
              <button className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition">
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Your watchlist is empty</p>
          <p className="text-neutral-600 text-sm">Add titles from search or the Discover page</p>
        </div>
      )}
    </div>
  )
}
