/**
 * Компонент управления удочками - разборка, удаление, экипировка
 */
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlayerRod, disassembleRod, deleteRod, equipRod, unequipRod } from '../../api/inventory'
import { usePlayerStore } from '../../store/playerStore'
import { getProfile } from '../../api/auth'

interface RodManagementProps {
  rod: PlayerRod
  onUpdate: () => void
}

export const RodManagement: React.FC<RodManagementProps> = ({ rod, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [showEquipMenu, setShowEquipMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const { setPlayer, player } = usePlayerStore()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Обновление позиции меню
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
  }

  // Закрытие меню при клике вне его и обновление позиции при скролле
  useEffect(() => {
    if (!showEquipMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowEquipMenu(false)
      }
    }

    const handleScroll = () => {
      updateMenuPosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showEquipMenu])

  // Открытие/закрытие меню
  const toggleEquipMenu = () => {
    if (!showEquipMenu) {
      updateMenuPosition()
    }
    setShowEquipMenu(!showEquipMenu)
  }

  // Проверяем, в каком слоте находится удочка
  const getEquippedSlot = (): number | null => {
    if (!player) return null
    if (player.rod_slot_1?.id === rod.id) return 1
    if (player.rod_slot_2?.id === rod.id) return 2
    if (player.rod_slot_3?.id === rod.id) return 3
    return null
  }

  const equippedSlot = getEquippedSlot()

  const handleDisassemble = async () => {
    if (!confirm('Разобрать удочку? Компоненты вернутся в инвентарь (кроме наживки).')) return

    try {
      setLoading(true)
      await disassembleRod(rod.id)
      const playerData = await getProfile()
      setPlayer(playerData)
      onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка разборки')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить удочку безвозвратно? Компоненты НЕ вернутся в инвентарь!')) return

    try {
      setLoading(true)
      await deleteRod(rod.id)
      const playerData = await getProfile()
      setPlayer(playerData)
      onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления')
    } finally {
      setLoading(false)
    }
  }

  const handleEquip = async (slot: 1 | 2 | 3) => {
    try {
      setLoading(true)
      await equipRod(rod.id, slot)
      const playerData = await getProfile()
      setPlayer(playerData)
      setShowEquipMenu(false)
      onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка экипировки')
    } finally {
      setLoading(false)
    }
  }

  const handleUnequip = async () => {
    try {
      setLoading(true)
      await unequipRod(rod.id)
      const playerData = await getProfile()
      setPlayer(playerData)
      onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка снятия')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mt-2">
      {equippedSlot ? (
        <button
          onClick={handleUnequip}
          disabled={loading}
          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded disabled:opacity-50"
        >
          Снять (слот {equippedSlot})
        </button>
      ) : (
        <>
          <button
            ref={buttonRef}
            onClick={toggleEquipMenu}
            disabled={loading || !rod.is_ready}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
          >
            Экипировать
          </button>
          {showEquipMenu &&
            createPortal(
              <div
                ref={menuRef}
                className="absolute bg-slate-700 border border-slate-600 rounded shadow-lg z-[9999]"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
              >
                {([1, 2, 3] as const).map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleEquip(slot)}
                    className="block w-full px-4 py-2 text-white text-sm hover:bg-slate-600 text-left whitespace-nowrap"
                  >
                    Слот {slot}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </>
      )}

      <button
        onClick={handleDisassemble}
        disabled={loading || equippedSlot !== null}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        title={equippedSlot ? 'Сначала снимите из слота' : 'Разобрать удочку'}
      >
        Разобрать
      </button>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50"
      >
        Удалить
      </button>
    </div>
  )
}

export default RodManagement
