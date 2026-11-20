import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderSpriteAnimator } from './ShaderSpriteAnimator'

function makeProceduralSpritesheet(columns: number, rows: number): THREE.Texture {
  const frameW = 64
  const frameH = 64
  const canvas = document.createElement('canvas')
  canvas.width  = frameW * columns
  canvas.height = frameH * rows
  const ctx = canvas.getContext('2d')!
  const colors = ['#ff4444','#ff8844','#ffcc44','#44ff44','#44ccff','#4444ff','#cc44ff','#ff44cc','#ffffff','#888888','#44ffcc','#ff4488']

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const i = row * columns + col
      const x = col * frameW
      const y = row * frameH
      ctx.fillStyle = colors[i % colors.length]
      ctx.fillRect(x, y, frameW, frameH)
      const t  = i / (columns * rows)
      const cx = x + frameW / 2 + Math.cos(t * Math.PI * 2) * 16
      const cy = y + frameH / 2 + Math.sin(t * Math.PI * 2) * 16
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'black'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(i), x + frameW / 2, y + frameH - 8)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

interface PreviewProps {
  columns:   number
  rows:      number
  fps:       number
  loop:      boolean
  amplitude: number
  frequency: number
  speed:     number
}

function SpritePreview({ columns, rows, fps, loop, amplitude, frequency, speed }: PreviewProps) {
  const texture = useMemo(() => makeProceduralSpritesheet(columns, rows), [columns, rows])
  return (
    <Canvas style={{ height: '500px', background: '#111122' }} camera={{ position: [0, 0, 4], fov: 50 }}>
      <ambientLight intensity={1} />
      <ShaderSpriteAnimator
        texture={texture}
        columns={columns}
        rows={rows}
        fps={fps}
        loop={loop}
        amplitude={amplitude}
        frequency={frequency}
        speed={speed}
        scale={2}
      />
      <OrbitControls />
    </Canvas>
  )
}

const meta: Meta<PreviewProps> = {
  title: 'Three/ShaderSpriteAnimator',
  component: SpritePreview,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    columns:   { control: { type: 'range', min: 1, max: 6, step: 1 } },
    rows:      { control: { type: 'range', min: 1, max: 4, step: 1 } },
    fps:       { control: { type: 'range', min: 1, max: 60, step: 1 } },
    loop:      { control: 'boolean' },
    amplitude: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
    frequency: { control: { type: 'range', min: 1, max: 50, step: 1 } },
    speed:     { control: { type: 'range', min: 0, max: 20, step: 0.1 } },
  },
}

export default meta
type Story = StoryObj<typeof SpritePreview>

/** Distortion subtile par défaut */
export const Default: Story = {
  args: { columns: 4, rows: 3, fps: 8, loop: true, amplitude: 0.02, frequency: 10, speed: 2 },
}

/** Ondulation forte et rapide */
export const StrongWave: Story = {
  args: { columns: 4, rows: 3, fps: 12, loop: true, amplitude: 0.08, frequency: 20, speed: 8 },
}

/** Pas de distortion — juste l'animation de spritesheet */
export const NoDistortion: Story = {
  args: { columns: 4, rows: 3, fps: 12, loop: true, amplitude: 0, frequency: 10, speed: 0 },
}

/** Ondulation lente et ample (effet gélatine) */
export const Jelly: Story = {
  args: { columns: 4, rows: 3, fps: 6, loop: true, amplitude: 0.05, frequency: 5, speed: 1.5 },
}

