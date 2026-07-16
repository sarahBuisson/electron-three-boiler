import type { MenuActionId } from '@config/menuConfig'

export function getRouteForAction(actionId: MenuActionId): string {
  if (actionId === 'new-game') {
    return '/menu/new-game'
  }

  if (actionId === 'rules') {
    return '/menu/rules'
  }

  if (actionId === 'options') {
    return '/menu/options'
  }

  return '/'
}

