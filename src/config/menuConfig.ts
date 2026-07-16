export type MenuActionId = 'new-game' | 'rules' | 'options' | 'quit'

export interface MenuItem {
  id: MenuActionId
  label: string
  route: string
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 'new-game', label: 'Nouvelle Partie', route: '/menu/new-game' },
  { id: 'rules', label: 'Regles', route: '/menu/rules' },
  { id: 'options', label: 'Options', route: '/menu/options' },
  { id: 'quit', label: 'Quitter', route: '/' },
]

