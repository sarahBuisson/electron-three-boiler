import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useMatcapTexture, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'
import { MeshCustomMatcapMaterial } from './MeshCustomMatcapMaterial'

interface GradientCubeProps {
  /** ID du matcap drei (voir https://github.com/emmelleppi/matcaps) */
  matcapId: string
  /** Résolution de la texture matcap (64 | 128 | 256 | 512 | 1024) */
  matcapResolution: 64 | 128 | 256 | 512 | 1024
  /** Taille de l'arête du cube */
  size: number
  /** Rotation Y du cube (radians) */
  rotationY: number

  /** Couleur au centre des faces (effet "vers l'intérieur") */
  innerColor: string
  /** Couleur sur les bords des faces */
  outerColor: string
  /** Puissance du dégradé (plus haut = dégradé plus resserré au centre) */
  gradientPower: number
  /** Intensité du mélange du dégradé avec le rendu matcap de base */
  gradientIntensity: number
  /** Anime le dégradé (pulsation dans le temps) */
  animateGradient: boolean
  /** Vitesse de la pulsation */
  animateSpeed: number
}

/**
 * Cube dont le matériau applique un dégradé de couleur "vers l'intérieur" :
 * contrairement à un rim light classique (qui illumine les bords opposés
 * à la caméra), ce dégradé est le plus intense au centre de chaque face
 * (là où la normale fait face à la caméra) et s'estompe vers les bords,
 * donnant l'illusion d'un puits de lumière qui s'enfonce dans la matière.
 */
function GradientCube({
  matcapId,
  matcapResolution,
  size,
  rotationY,
  innerColor,
  outerColor,
  gradientPower,
  gradientIntensity,
  animateGradient,
  animateSpeed,
}: GradientCubeProps) {
  const [matcapTexture] = useMatcapTexture(matcapId, matcapResolution)

  const material = useMemo(() => {
    return new MeshCustomMatcapMaterial({
      matcap: matcapTexture,
      uniforms: {
        uInnerColor: { value: new THREE.Color('#66ccff') },
        uOuterColor: { value: new THREE.Color('#0a0a1a') },
        uGradientPower: { value: 2 },
        uGradientIntensity: { value: 1 },
        uAnimate: { value: 0 },
        uAnimateSpeed: { value: 1 },
      },
      fragmentHeader: `
        uniform vec3 uInnerColor;
        uniform vec3 uOuterColor;
        uniform float uGradientPower;
        uniform float uGradientIntensity;
        uniform float uAnimate;
        uniform float uAnimateSpeed;
        uniform float uTime;
      `,
      // Dégradé "vers l'intérieur" : intense quand la normale fait face à la
      // caméra (facing proche de 1 = centre visuel de la face), quasi nul
      // sur les bords (facing proche de 0), inverse d'un rim light classique.
      fragmentMain: `
        float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        float pulse = 1.0;
        if (uAnimate > 0.5) {
          pulse = 0.5 + 0.5 * sin(uTime * uAnimateSpeed);
        }
        float innerAmount = pow(facing, uGradientPower) * pulse;
        vec3 gradientColor = mix(uOuterColor, uInnerColor, innerAmount);
        outgoingLight = mix(outgoingLight, gradientColor, uGradientIntensity);
      `,
    })
  }, [matcapTexture])

  useMemo(() => {
    ;(material.customUniforms['uInnerColor']!.value as THREE.Color).set(innerColor)
    ;(material.customUniforms['uOuterColor']!.value as THREE.Color).set(outerColor)
    material.customUniforms['uGradientPower']!.value = gradientPower
    material.customUniforms['uGradientIntensity']!.value = gradientIntensity
    material.customUniforms['uAnimate']!.value = animateGradient ? 1 : 0
    material.customUniforms['uAnimateSpeed']!.value = animateSpeed
  }, [material, innerColor, outerColor, gradientPower, gradientIntensity, animateGradient, animateSpeed])

  return (
    <Center>
      <mesh material={material} rotation={[0, rotationY, 0]}>
        <boxGeometry args={[size, size, size]} />
      </mesh>
    </Center>
  )
}

function GradientCubePreview(props: GradientCubeProps) {
  return (
    <Canvas
      style={{ height: '500px', background: '#1a1a2e' }}
      camera={{ position: [3, 2, 3], fov: 50 }}
    >
      <GradientCube {...props} />
      <OrbitControls />
    </Canvas>
  )
}

const meta: Meta<typeof GradientCubePreview> = {
  title: 'Three/Aquarelle/Sample2',
  component: GradientCubePreview,
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
    size: { control: { type: 'range', min: 0.5, max: 3, step: 0.1 } },
    rotationY: { control: { type: 'range', min: 0, max: Math.PI * 2, step: 0.1 } },
    innerColor: { control: 'color' },
    outerColor: { control: 'color' },
    gradientPower: { control: { type: 'range', min: 0.2, max: 8, step: 0.1 } },
    gradientIntensity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    animateGradient: { control: 'boolean' },
    animateSpeed: { control: { type: 'range', min: 0, max: 5, step: 0.1 } },
  },
}

export default meta
type Story = StoryObj<typeof GradientCubePreview>

const baseArgs = {
  matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
  matcapResolution: 256 as const,
  size: 1.5,
  rotationY: 0.6,
  innerColor: '#66ccff',
  outerColor: '#0a0a1a',
  gradientPower: 2,
  gradientIntensity: 0.8,
  animateGradient: false,
  animateSpeed: 1,
}

export const Default: Story = {
  args: { ...baseArgs },
}

export const DeepInnerGlow: Story = {
  args: {
    ...baseArgs,
    innerColor: '#ffffff',
    outerColor: '#000000',
    gradientPower: 4,
    gradientIntensity: 1,
  },
}

export const WarmCore: Story = {
  args: {
    ...baseArgs,
    matcapId: '735236_C39B36_D1BC7B_A55F2B',
    innerColor: '#ffaa33',
    outerColor: '#1a0d00',
    gradientPower: 1.5,
    gradientIntensity: 0.9,
  },
}

export const Pulsing: Story = {
  args: {
    ...baseArgs,
    innerColor: '#ff2266',
    outerColor: '#050505',
    gradientPower: 3,
    gradientIntensity: 1,
    animateGradient: true,
    animateSpeed: 1.5,
  },
}

