import type { Keybinds } from '@models/Keybinds'

export function isConfirmKey(key: string, keybinds: Keybinds): boolean {
  return key === keybinds.confirm || key === ' '
}

export function isMenuUpKey(key: string, keybinds: Keybinds): boolean {
  return key === keybinds.up || key.toLowerCase() === 'w'
}

export function isMenuDownKey(key: string, keybinds: Keybinds): boolean {
  return key === keybinds.down || key.toLowerCase() === 's'
}

export function isCloseKey(key: string, keybinds: Keybinds): boolean {
  return key === keybinds.close
}


