import { useState } from 'react'
import { IconCheck, IconExternalLink } from '../components/Icons'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just log - can connect to email service later
    console.log('Contact form:', form)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <IconCheck size={56} className="mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-semibold mb-2">Message Sent</h2>
          <p className="text-neutral-400">We'll get back to you soon.</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setForm({ name: '', email: '', message: '' })
            }}
            className="mt-6 text-indigo-400 hover:text-indigo-300 transition"
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-neutral-400 mb-8">Have questions, feedback, or issues? Let us know.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-neutral-400 mb-2">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition"
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition resize-none"
            placeholder="How can we help?"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition"
        >
          Send Message
        </button>
      </form>

      <div className="mt-12 pt-8 border-t border-white/5">
        <h3 className="text-lg font-medium mb-4">Other Ways to Reach Us</h3>
        <div className="space-y-3 text-neutral-400">
          <a 
            href="https://github.com/mhaques/vaulted/issues" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:text-white transition"
          >
            <IconExternalLink size={18} />
            <span>Open an issue on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  )
}
