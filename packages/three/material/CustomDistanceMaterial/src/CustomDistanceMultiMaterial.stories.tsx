import type { Meta, StoryObj } from "@storybook/react-vite"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { CustomDistanceMultiMaterial } from "./CustomDistanceMultiMaterial"

interface MultiPreviewProps {
  colors: string[]
  size: number
}

function Scene({ colors, size }: MultiPreviewProps) {
  const [material] = useState<CustomDistanceMultiMaterial>(
    () => new CustomDistanceMultiMaterial({ colors, size }),
  )
  useEffect(() => {
    material.colors = colors
    material.uniforms['uMinDist']!.value = -size
    material.uniforms['uMaxDist']!.value = size
  }, [material, colors, size])

  const positions: [number, number, number][] = [
    [0, 0, 0], [0, 0, -5], [0, 0, -10], [0, 0, -15], [0, 0, -20],
    [-5, 0, -5], [5, 0, -5], [-5, 0, -15], [5, 0, -15],
  ]

  return (
    <>
      <ambientLight intensity={0.3} />
      {positions.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} material={material}>
          <sphereGeometry args={[0.8, 32, 32]} />
        </mesh>
      ))}
      <OrbitControls />
    </>
  )
}

function MultiPreview(props: MultiPreviewProps) {
  return (
    <Canvas style={{ height: "500px", background: "#0d0d1a" }} camera={{ position: [0, 3, 8], fov: 60 }}>
      <Scene {...props} />
    </Canvas>
  )
}

function AnimatedScene({ colors, size }: MultiPreviewProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [material] = useState<CustomDistanceMultiMaterial>(
    () => new CustomDistanceMultiMaterial({ colors, size }),
  )
  useEffect(() => {
    material.colors = colors
    material.uniforms['uMinDist']!.value = -size
    material.uniforms['uMaxDist']!.value = size
  }, [material, colors, size])
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.3
  })
  const positions: [number, number, number][] = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    return [Math.cos(angle) * 6, 0, Math.sin(angle) * 6]
  })
  return (
    <>
      <group ref={groupRef}>
        {positions.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} material={material}>
            <sphereGeometry args={[0.6, 32, 32]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]} material={material}>
          <sphereGeometry args={[1.2, 32, 32]} />
        </mesh>
      </group>
      <OrbitControls />
    </>
  )
}

function AnimatedPreview(props: MultiPreviewProps) {
  return (
    <Canvas style={{ height: "500px", background: "#0d0d1a" }} camera={{ position: [0, 5, 12], fov: 60 }}>
      <AnimatedScene {...props} />
    </Canvas>
  )
}

interface LongBoxPreviewProps extends MultiPreviewProps {
  boxLength: number
}

function LongBoxScene({ colors, boxLength }: LongBoxPreviewProps) {
  const [material] = useState<CustomDistanceMultiMaterial>(
    () => new CustomDistanceMultiMaterial({ colors }),
  )
  useEffect(() => {
    material.colors = colors
  }, [material, colors])

  return (
    <>
      <ambientLight intensity={0.2} />
      <mesh position={[0, 0, -boxLength / 2]} material={material}>
        <boxGeometry args={[1, 1, boxLength, 1, 1, Math.ceil(boxLength * 4)]} />
      </mesh>
      <OrbitControls />
    </>
  )
}

function LongBoxPreview(props: LongBoxPreviewProps) {
  return (
    <Canvas
      style={{ height: "500px", background: "#0d0d1a" }}
      camera={{ position: [2, 2, 2], fov: 60 }}
    >
      <LongBoxScene {...props} />
    </Canvas>
  )
}

const meta: Meta<typeof MultiPreview> = {
  title: "Three/CustomDistanceMultiMaterial",
  component: MultiPreview,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
}
export default meta

type Story = StoryObj<typeof MultiPreview>

export const Default: Story = {
  args: { colors: ["#ffffff", "#00aaff", "#ff2200"] },
}

export const Rainbow: Story = {
  args: {
    colors: ["#ff0000", "#ff9900", "#ffee00", "#00ff44", "#00aaff", "#5500ff", "#ff00cc"],
  },
}

export const Sunset: Story = {
  args: { colors: ["#fff3b0", "#ff8c42", "#c1272d", "#2b0838"] },
}

export const Ocean: Story = {
  args: { colors: ["#e0fbfc", "#98c1d9", "#3d5a80", "#1b263b", "#000814"] },
}

export const Animated: StoryObj<typeof AnimatedPreview> = {
  ...meta,
  render: (args) => <AnimatedPreview {...(args as MultiPreviewProps)} />,
  args: { colors: ["#44ffaa", "#00ccff", "#220066"] },
}

export const LongBox: StoryObj<typeof LongBoxPreview> = {
  ...meta,
  render: (args) => <LongBoxPreview {...(args as LongBoxPreviewProps)} />,
  argTypes: {
    boxLength: { control: { type: "range", min: 5, max: 100, step: 1 } },
  },
  args: {
    colors: ["#ffffff", "#00ffff", "#0022ff", "#220033"],
    boxLength: 40,
  },
}

