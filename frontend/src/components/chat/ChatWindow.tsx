/**
 * Окно чата (WebSocket).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'

interface ChatMessage {
  id: number
  nickname: string
  text: string
  created_at: string
}

interface Props {
  channelType: 'location' | 'base' | 'global' | 'bar'
  channelId: number
  className?: string
  onMembersChange?: (members: string[]) => void
}

export default function ChatWindow({ channelType, channelId, className, onMembersChange }: Props) {
  const token = usePlayerStore((s) => s.token)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const connect = useCallback(() => {
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/chat/${channelType}/${channelId}/?token=${token}`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'history') {
        setMessages(data.messages)
      } else if (data.type === 'message') {
        setMessages((prev) => [...prev, data])
      } else if (data.type === 'members') {
        onMembersChange?.(data.members)
      }
    }

    wsRef.current = ws
    return () => ws.close()
  }, [token, channelType, channelId])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])

  const send = () => {
    if (!input.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ text: input.trim() }))
    setInput('')
  }

  return (
    <div className={`card flex flex-col overflow-hidden ${className || 'h-64'}`} style={{ minHeight: '200px' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-sm text-wood-200">
          Чат {channelType === 'location' ? 'локации' : channelType === 'base' ? 'базы' : channelType === 'bar' ? 'бара' : 'общий'}
        </h3>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 text-sm mb-2">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="text-water-300 font-medium">{m.nickname}: </span>
            <span className="text-wood-300">{m.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Написать сообщение..."
          className="flex-1 game-input py-1"
          maxLength={500}
        />
        <button className="btn btn-action text-sm py-1 px-3" onClick={send} disabled={!connected}>
          &gt;
        </button>
      </div>
    </div>
  )
}
