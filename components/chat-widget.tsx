'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What is ABF?',
  'How does the funnel work?',
  'What is M2M SIM?',
  'Explain billing vs actual SIMs',
]

export function ChatWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)
  const abortRef                = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreaming(true)
    setError(null)

    // Placeholder assistant message that we'll fill in
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(data.error ?? 'Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const chunk = JSON.parse(payload)
            const delta = chunk.choices?.[0]?.delta?.content
            if (delta) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + delta }
                }
                return updated
              })
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          updated.pop() // remove empty placeholder
        }
        return updated
      })
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open ? 'bg-slate-700 hover:bg-slate-800' : 'hover:scale-105'
        )}
        style={open ? {} : { background: '#1565c0' }}
        title="Ask AI Assistant"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100 shrink-0"
            style={{ background: '#1565c0' }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">M2M Assistant</p>
              <p className="text-xs text-blue-200">Powered by Gemma 4 · NVIDIA NIM</p>
            </div>
            {streaming && (
              <span className="text-xs text-blue-200 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> thinking…
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">

            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1565c0]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#1565c0]" />
                  </div>
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm text-slate-700 max-w-[260px]">
                    Hi! I&apos;m your M2M dashboard assistant. Ask me anything about SIMs, customers, plans, or the funnel.
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-8">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-[#1565c0]/30 text-[#1565c0] hover:bg-[#1565c0]/5 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  m.role === 'user' ? 'bg-[#1565c0]' : 'bg-[#1565c0]/10'
                )}>
                  {m.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-[#1565c0]" />
                  }
                </div>
                <div className={cn(
                  'rounded-2xl px-3 py-2.5 text-sm max-w-[260px] whitespace-pre-wrap leading-relaxed',
                  m.role === 'user'
                    ? 'bg-[#1565c0] text-white rounded-tr-sm'
                    : 'bg-slate-50 text-slate-700 rounded-tl-sm'
                )}>
                  {m.content}
                  {/* blinking cursor while streaming this message */}
                  {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                    <span className="inline-block w-0.5 h-3.5 bg-slate-400 ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={streaming ? 'Responding…' : 'Ask anything…'}
              disabled={streaming}
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1565c0]/30 focus:border-[#1565c0] disabled:opacity-50 disabled:bg-slate-50"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
              style={{ background: '#1565c0' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
