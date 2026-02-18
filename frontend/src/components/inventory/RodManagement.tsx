/**
 * Компонент управления удочками — разборка, удаление, экипировка (wood-тема).
 */
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlayerRod, disassembleRod, deleteRod, equipRod, unequipRod } from '../../api/inventory'
import { usePlayerStore } from '../../store/playerStore'
import { getProfile } from '../../api/auth'
import ConfirmDialog from '../ui/ConfirmDialog'

interface RodManagementProps {
  rod: PlayerRod
  onUpdate: () => void
}

export const RodManagement: React.FC<RodManagementProps> = ({ rod, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEquipMenu, setShowEquipMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [confirm, setConfirm] = useState<{
    title: string; message: string; action: () => Promise<void>
  } | null>(null)
  const { setPlayer, player } = usePlayerStore()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
  }

  useEffect(() => {
    if (!showEquipMenu) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)) {
        setShowEquipMenu(false)
      }
    }
    const handleScroll = () => updateMenuPosition()
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showEquipMenu])

  const toggleEquipMenu = () => {
    if (!showEquipMenu) updateMenuPosition()
    setShowEquipMenu(!showEquipMenu)
  }

  const getEquippedSlot = (): number | null => {
    if (!player) return null
    if (player.rod_slot_1?.id === rod.id) return 1
    if (player.rod_slot_2?.id === rod.id) return 2
    if (player.rod_slot_3?.id === rod.id) return 3
    return null
  }

  const equippedSlot = getEquippedSlot()

  const handleDisassemble = () => {
    setConfirm({
      title: 'Разобрать удочку?',
      message: 'Компоненты вернутся в инвентарь (кроме наживки).',
      action: async () => {
        await disassembleRod(rod.id)
        const playerData = await getProfile()
        setPlayer(playerData)
        onUpdate()
      },
    })
  }

  const handleDelete = () => {
    setConfirm({
      title: 'Удалить удочку?',
      message: 'Удочка будет удалена безвозвратно. Компоненты НЕ вернутся!',
      action: async () => {
        await deleteRod(rod.id)
        const playerData = await getProfile()
        setPlayer(playerData)
        onUpdate()
      },
    })
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    setLoading(true)
    setError('')
    try {
      await confirm.action()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка')
    } finally {
      setLoading(false)
      setConfirm(null)
    }
  }

  const handleEquip = async (slot: 1 | 2 | 3) => {
    try {
      setLoading(true)
      setError('')
      await equipRod(rod.id, slot)
      const playerData = await getProfile()
      setPlayer(playerData)
      setShowEquipMenu(false)
      onUpdate()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка экипировки')
    } finally {
      setLoading(false)
    }
  }

  const handleUnequip = async () => {
    try {
      setLoading(true)
      setError('')
      await unequipRod(rod.id)
      const playerData = await getProfile()
      setPlayer(playerData)
      onUpdate()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка снятия')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div style={{
          color: '#f87171', fontSize: '0.68rem', padding: '4px 8px', marginBottom: '4px',
          background: 'rgba(248,113,113,0.1)', borderRadius: '4px',
          border: '1px solid rgba(248,113,113,0.2)',
        }}>{error}</div>
      )}

      <div className="flex gap-2 mt-2">
        {equippedSlot ? (
          <button onClick={handleUnequip} disabled={loading}
            className="btn btn-secondary text-xs" style={{ minHeight: '30px' }}>
            Снять (слот {equippedSlot})
          </button>
        ) : (
          <>
            <button ref={buttonRef} onClick={toggleEquipMenu} disabled={loading || !rod.is_ready}
              className="btn btn-primary text-xs" style={{ minHeight: '30px' }}>
              Экипировать
            </button>
            {showEquipMenu && createPortal(
              <div ref={menuRef}
                style={{
                  position: 'absolute', zIndex: 9999,
                  top: `${menuPosition.top}px`, left: `${menuPosition.left}px`,
                  background: 'rgba(10,20,10,0.97)',
                  border: '1px solid rgba(92,61,30,0.5)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                }}>
                {([1, 2, 3] as const).map((slot) => (
                  <button key={slot} onClick={() => handleEquip(slot)}
                    style={{
                      display: 'block', width: '100%', padding: '7px 16px',
                      color: '#d4c5a9', fontSize: '0.78rem', fontFamily: 'Georgia, serif',
                      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(92,61,30,0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    Слот {slot}
                  </button>
                ))}
              </div>,
              document.body,
            )}
          </>
        )}

        <button onClick={handleDisassemble} disabled={loading || equippedSlot !== null}
          className="btn btn-secondary text-xs" style={{ minHeight: '30px' }}
          title={equippedSlot ? 'Сначала снимите из слота' : 'Разобрать удочку'}>
          Разобрать
        </button>

        <button onClick={handleDelete} disabled={loading}
          className="btn btn-danger text-xs" style={{ minHeight: '30px' }}>
          Удалить
        </button>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

export default RodManagement
