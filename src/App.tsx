import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-2">Vaulted</h1>
        <p className="text-gray-400 mb-8">Personal, self-hosted media discovery and playback portal</p>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Discover</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <div className="h-32 bg-gray-700 rounded mb-3"></div>
                <p className="text-sm">Trending</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <div className="h-32 bg-gray-700 rounded mb-3"></div>
                <p className="text-sm">Popular</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <div className="h-32 bg-gray-700 rounded mb-3"></div>
                <p className="text-sm">Top Rated</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <div className="h-32 bg-gray-700 rounded mb-3"></div>
                <p className="text-sm">Continue Watching</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
