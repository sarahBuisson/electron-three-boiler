import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useMatcapTexture, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'
import { MeshCustomMatcapMaterial } from './MeshCustomMatcapMaterial'

interface CustomMatcapProps {
  matcapId: string
  matcapResolution: 64 | 128 | 256 | 512 | 1024

  /** Active l'ondulation de la géométrie (vertex shader) */
  useVertexWave: boolean
  /** Amplitude de l'ondulation */
  waveAmplitude: number
  /** Fréquence spatiale de l'ondulation */
  waveFrequency: number
  /** Vitesse de l'ondulation dans le temps */
  waveSpeed: number

  /** Active le liseré (rim light) au bord de la silhouette */
  useRimLight: boolean
  /** Couleur du rim light */
  rimColor: string
  /** Puissance du rim light (plus haut = plus fin) */
  rimPower: number
  /** Intensité du rim light */
  rimIntensity: number

  /** Active la teinte arc-en-ciel animée (fragment shader) */
  useRainbow: boolean
  /** Vitesse de défilement de l'arc-en-ciel */
  rainbowSpeed: number
}

function CustomMatcapShape({
  matcapId,
  matcapResolution,
  useVertexWave,
  waveAmplitude,
  waveFrequency,
  waveSpeed,
  useRimLight,
  rimColor,
  rimPower,
  rimIntensity,
  useRainbow,
  rainbowSpeed,
}: CustomMatcapProps) {
  const [matcapTexture] = useMatcapTexture(matcapId, matcapResolution)

  const material = useMemo(() => {
    return new MeshCustomMatcapMaterial({
      matcap: matcapTexture,
      uniforms: {
        uWaveAmplitude: { value: 0 },
        uWaveFrequency: { value: 0 },
        uWaveSpeed: { value: 0 },
        uUseWave: { value: 0 },
        uRimColor: { value: new THREE.Color('#66ccff') },
        uRimPower: { value: 2 },
        uRimIntensity: { value: 0 },
        uUseRainbow: { value: 0 },
        uRainbowSpeed: { value: 1 },
      },
      vertexHeader: `
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        uniform float uWaveSpeed;
        uniform float uUseWave;
        uniform float uTime;
      `,
      // Déplace chaque vertex le long de sa normale selon une onde sinusoïdale
      vertexMain: `
        if (uUseWave > 0.5) {
          float wave = sin(transformed.x * uWaveFrequency + transformed.y * uWaveFrequency + uTime * uWaveSpeed);
          transformed += normal * wave * uWaveAmplitude;
        }
      `,
      fragmentHeader: `
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uRimIntensity;
        uniform float uUseRainbow;
        uniform float uRainbowSpeed;
        uniform float uTime;

        vec3 hue2rgb(float h) {
          vec3 p = abs(fract(vec3(h) + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
          return clamp(p - 1.0, 0.0, 1.0);
        }
      `,
      // Ajoute un liseré (rim light) + teinte arc-en-ciel animée par-dessus le matcap
      fragmentMain: `
        if (uRimIntensity > 0.0) {
          float rim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
          rim = pow(rim, uRimPower);
          outgoingLight += uRimColor * rim * uRimIntensity;
        }
        if (uUseRainbow > 0.5) {
          vec3 rainbow = hue2rgb(fract(uTime * uRainbowSpeed + vViewPosition.y * 0.1));
          outgoingLight = mix(outgoingLight, outgoingLight * rainbow * 1.5, 0.6);
        }
      `,
    })
  }, [matcapTexture])

  // Met à jour les uniforms dynamiquement à chaque changement de props
  useMemo(() => {
    material.customUniforms['uWaveAmplitude']!.value = waveAmplitude
    material.customUniforms['uWaveFrequency']!.value = waveFrequency
    material.customUniforms['uWaveSpeed']!.value = waveSpeed
    material.customUniforms['uUseWave']!.value = useVertexWave ? 1 : 0
    ;(material.customUniforms['uRimColor']!.value as THREE.Color).set(rimColor)
    material.customUniforms['uRimPower']!.value = rimPower
    material.customUniforms['uRimIntensity']!.value = useRimLight ? rimIntensity : 0
    material.customUniforms['uUseRainbow']!.value = useRainbow ? 1 : 0
    material.customUniforms['uRainbowSpeed']!.value = rainbowSpeed
  }, [
    material,
    useVertexWave,
    waveAmplitude,
    waveFrequency,
    waveSpeed,
    useRimLight,
    rimColor,
    rimPower,
    rimIntensity,
    useRainbow,
    rainbowSpeed,
  ])

  return (
    <Center>
      <mesh material={material}>
        <sphereGeometry args={[1.4, 128, 128]} />
      </mesh>
    </Center>
  )
}

function CustomMatcapPreview(props: CustomMatcapProps) {
  return (
    <Canvas
      style={{ height: '500px', background: '#1a1a2e' }}
      camera={{ position: [3, 2, 3], fov: 50 }}
    >
      <CustomMatcapShape {...props} />
      <OrbitControls />
    </Canvas>
  )
}

const meta: Meta<typeof CustomMatcapPreview> = {
  title: 'Three/Aquarelle/MeshCustomMatcapMaterial',
  component: CustomMatcapPreview,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    matcapId: { control: 'text' },
    matcapResolution: {
      control: { type: 'select' },
      options: [64, 128, 256, 512, 1024],
    },
    useVertexWave: { control: 'boolean' },
    waveAmplitude: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
    waveFrequency: { control: { type: 'range', min: 0, max: 20, step: 0.5 } },
    waveSpeed: { control: { type: 'range', min: 0, max: 10, step: 0.1 } },
    useRimLight: { control: 'boolean' },
    rimColor: { control: 'color' },
    rimPower: { control: { type: 'range', min: 0.5, max: 8, step: 0.1 } },
    rimIntensity: { control: { type: 'range', min: 0, max: 3, step: 0.05 } },
    useRainbow: { control: 'boolean' },
    rainbowSpeed: { control: { type: 'range', min: 0, max: 3, step: 0.05 } },
  },
}

export default meta
type Story = StoryObj<typeof CustomMatcapPreview>

const baseArgs = {
  matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
  matcapResolution: 256 as const,
  useVertexWave: false,
  waveAmplitude: 0.08,
  waveFrequency: 6,
  waveSpeed: 2,
  useRimLight: false,
  rimColor: '#66ccff',
  rimPower: 2.5,
  rimIntensity: 1.2,
  useRainbow: false,
  rainbowSpeed: 0.4,
}

export const Default: Story = {
  args: { ...baseArgs },
}

export const RimLight: Story = {
  args: {
    ...baseArgs,
    useRimLight: true,
    rimColor: '#66ccff',
    rimPower: 2.5,
    rimIntensity: 1.5,
  },
}

export const VertexWave: Story = {
  args: {
    ...baseArgs,
    useVertexWave: true,
    waveAmplitude: 0.1,
    waveFrequency: 8,
    waveSpeed: 3,
  },
}

export const Rainbow: Story = {
  args: {
    ...baseArgs,
    useRainbow: true,
    rainbowSpeed: 0.5,
  },
}

export const FullyCombined: Story = {
  args: {
    ...baseArgs,
    matcapId: '735236_C39B36_D1BC7B_A55F2B',
    useVertexWave: true,
    waveAmplitude: 0.06,
    waveFrequency: 5,
    waveSpeed: 1.5,
    useRimLight: true,
    rimColor: '#ffaa33',
    rimPower: 3,
    rimIntensity: 1.8,
    useRainbow: true,
    rainbowSpeed: 0.25,
  },
}

