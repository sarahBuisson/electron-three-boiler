import { lazy, Suspense, useMemo, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { GameplayPlaceholder } from '@components/gameplay/GameplayPlaceholder'
import { RulesOverlay } from '@components/ui/RulesOverlay'
import { TitleScreen } from '@components/ui/TitleScreen'
import { storageService } from '@services/storage/storageService'
import { loggerService } from '@services/utils/loggerService'
import './App.css'

const MainMenuThree = lazy(async () => {
  const module = await import('@components/menu/MainMenuThree')
  return { default: module.MainMenuThree }
})

function TitleScreenPage() {
  const navigate = useNavigate()

  return (
    <main className="app-shell is-title">
      <TitleScreen
        onStart={() => {
          navigate('/menu')
        }}
      />
    </main>
  )
}

function MenuPage() {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [showGameplayMessage, setShowGameplayMessage] = useState(false)
  const keybinds = useMemo(() => storageService.getKeybinds(), [])
  const location = useLocation()

  // Gérer l'affichage des overlays basé sur la route
  useEffect(() => {
    if (location.pathname === '/menu/rules') {
      setRulesOpen(true)
      setShowGameplayMessage(false)
    } else if (location.pathname === '/menu/new-game') {
      setShowGameplayMessage(true)
      setRulesOpen(false)
      loggerService.info('Nouvelle partie selectionnee')
    } else if (location.pathname === '/menu/options') {
      setRulesOpen(false)
      setShowGameplayMessage(false)
      loggerService.info('Options a implementer')
    } else {
      setRulesOpen(false)
      setShowGameplayMessage(false)
    }
  }, [location.pathname])

  return (
    <main className="app-shell is-menu">
      <Suspense
        fallback={
          <div className="menu-loading" role="status" aria-live="polite">
            <span className="menu-loading__title">Chargement du menu 3D...</span>
            <span className="menu-loading__text">Preparation de la scene, des effets et des assets.</span>
          </div>
        }
      >
        <MainMenuThree keybinds={keybinds} />
      </Suspense>

      <RulesOverlay open={rulesOpen} keybinds={keybinds} onClose={() => setRulesOpen(false)} />
      {showGameplayMessage && <GameplayPlaceholder />}
    </main>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TitleScreenPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/new-game" element={<MenuPage />} />
        <Route path="/menu/rules" element={<MenuPage />} />
        <Route path="/menu/options" element={<MenuPage />} />
        <Route path="*" element={<TitleScreenPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
