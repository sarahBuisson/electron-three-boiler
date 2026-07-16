import type { Meta, StoryObj } from '@storybook/react'
import { TitleScreen } from './TitleScreen'
const meta: Meta<typeof TitleScreen> = {
  title: 'UI/TitleScreen',
  component: TitleScreen,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onStart: { action: 'started' },
  },
}
export default meta
type Story = StoryObj<typeof TitleScreen>
export const Default: Story = {
  args: {
    onStart: () => {},
  },
}
