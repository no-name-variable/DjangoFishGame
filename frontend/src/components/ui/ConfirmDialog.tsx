/**
 * Игровой диалог подтверждения (замена browser confirm).
 */
import { useEffect, useRef } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Подтвердить', cancelLabel = 'Отмена',
  danger = false, onConfirm, onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { confirmRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        className="modalIn"
        style={{
          width: '100%', maxWidth: '360px',
          background: 'rgba(10,20,10,0.97)',
          border: '1px solid rgba(92,61,30,0.5)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(92,61,30,0.3)',
          background: 'rgba(7,18,7,0.5)',
        }}>
          <span style={{ color: '#d4c5a9', fontSize: '0.9rem' }}>{title}</span>
        </div>

        <div style={{ padding: '16px', color: '#a8894e', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {message}
        </div>

        <div style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          borderTop: '1px solid rgba(92,61,30,0.3)',
          justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} className="btn btn-secondary text-sm" style={{ minWidth: '80px' }}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'} text-sm`}
            style={{ minWidth: '80px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
