import { Navigate, Route, Routes } from 'react-router-dom'
import { usePlayerStore } from './store/playerStore'
import GameLayout from './components/ui/GameLayout'
import LoginPage from './pages/LoginPage'
import BasePage from './pages/BasePage'
import LocationMapPage from './pages/LocationMapPage'
import FishingPage from './pages/FishingPage'
import ShopPage from './pages/ShopPage'
import InventoryPage from './pages/InventoryPage'
import QuestsPage from './pages/QuestsPage'
import RecordsPage from './pages/RecordsPage'
import ProfilePage from './pages/ProfilePage'
import TournamentsPage from './pages/TournamentsPage'
import TeamPage from './pages/TeamPage'
import NewspaperPage from './pages/NewspaperPage'
import PotionsPage from './pages/PotionsPage'
import WorldMapPage from './pages/WorldMapPage'
import BazaarPage from './pages/BazaarPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = usePlayerStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const token = usePlayerStore((s) => s.token)

  return (
    <>
      {token ? (
        <GameLayout>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ProtectedRoute><BasePage /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute><LocationMapPage /></ProtectedRoute>} />
            <Route path="/fishing" element={<ProtectedRoute><FishingPage /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/quests" element={<ProtectedRoute><QuestsPage /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/tournaments" element={<ProtectedRoute><TournamentsPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/newspaper" element={<ProtectedRoute><NewspaperPage /></ProtectedRoute>} />
            <Route path="/potions" element={<ProtectedRoute><PotionsPage /></ProtectedRoute>} />
            <Route path="/world-map" element={<ProtectedRoute><WorldMapPage /></ProtectedRoute>} />
            <Route path="/bazaar" element={<ProtectedRoute><BazaarPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GameLayout>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  )
}
