# Storybook Documentation

## Overview

Storybook has been configured for this Electron + React + Three.js project to help develop and document UI components in isolation.

## Getting Started

### Running Storybook

To start Storybook in development mode:

```bash
npm run storybook
```

This will start Storybook on `http://localhost:6006`

### Building Storybook

To build a static version of Storybook:

```bash
npm run build-storybook
```

The static files will be created in the `storybook-static` folder.

## Installed Addons

The following Storybook addons are configured:

- **@chromatic-com/storybook** - Visual regression testing
- **@storybook/addon-vitest** - Integration with Vitest for component testing
- **@storybook/addon-a11y** - Accessibility testing and validation
- **@storybook/addon-docs** - Auto-generated documentation
- **@storybook/addon-mcp** - Model Context Protocol integration

## Running Tests

Component tests can be run using Vitest with the Storybook addon:

```bash
npx vitest --project=storybook
```

## Writing Stories

Stories are located alongside components with the `.stories.tsx` extension.

### Example Story

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { YourComponent } from './YourComponent'

const meta: Meta<typeof YourComponent> = {
  title: 'Category/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered', // or 'fullscreen', 'padded'
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
}

export default meta
type Story = StoryObj<typeof YourComponent>

export const Default: Story = {
  args: {
    // your component props
  },
}
```

## Existing Stories

The following component stories have been created:

- **UI/RulesOverlay** - Rules overlay dialog component
- **UI/TitleScreen** - Title screen component

## Configuration

### Storybook Configuration

- **`.storybook/main.ts`** - Main configuration file
- **`.storybook/preview.tsx`** - Global decorators and parameters

### Story Location

Stories are automatically discovered from:
- `src/**/*.stories.@(js|jsx|mjs|ts|tsx)`
- `src/**/*.mdx`

## Framework

This Storybook instance is configured for:
- **Framework**: React + Vite
- **Language**: TypeScript

## Notes

- The project uses Vite as the build tool, which provides fast HMR (Hot Module Replacement)
- All path aliases configured in `vite.config.ts` are available in Storybook
- Accessibility tests are set to 'todo' mode by default (visible in UI, doesn't fail CI)

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Storybook Addon Vitest](https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon)
- [Storybook Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

