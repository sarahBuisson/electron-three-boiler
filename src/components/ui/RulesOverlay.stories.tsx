import type { Meta, StoryObj } from '@storybook/react'
import { RulesOverlay } from './RulesOverlay'

const meta: Meta<typeof RulesOverlay> = {
  title: 'UI/RulesOverlay',
  component: RulesOverlay,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the overlay is visible',
    },
    onClose: { action: 'closed' },
  },
}

export default meta
type Story = StoryObj<typeof RulesOverlay>

const defaultKeybinds = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  confirm: 'Enter',
  cancel: 'Escape',
}

export const Closed: Story = {
  args: {
    open: false,
    keybinds: defaultKeybinds,
    onClose: () => {},
  },
}

export const Open: Story = {
  args: {
    open: true,
    keybinds: defaultKeybinds,
    onClose: () => {},
  },
}

