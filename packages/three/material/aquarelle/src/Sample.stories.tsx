import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useMatcapTexture, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'

interface ExtrudedMatcapProps {
  /** ID du matcap drei (voir https://github.com/emmelleppi/matcaps) */
  matcapId: string
  /** Résolution de la texture matcap (64 | 128 | 256 | 512 | 1024) */
  matcapResolution: 64 | 128 | 256 | 512 | 1024
  /** Profondeur de l'extrusion */
  depth: number
  /** Rayon des biseaux (bevel) */
  bevelSize: number
  /** Nombre de segments de subdivision du biseau */
  bevelSegments: number
  /** Rotation Y de l'objet (radians) */
  rotationY: number

  // ── Propriétés de THREE.MeshMatcapMaterial ──────────────────────────────
  /** Teinte de couleur multipliée avec le matcap */
  color: string
  /** Rendu à facettes plates (pas de lissage des normales) */
  flatShading: boolean
  /** Affichage en fil de fer */
  wireframe: boolean
  /** Épaisseur des lignes wireframe (WebGL ignore souvent >1px) */
  wireframeLinewidth: number
  /** Active la transparence (nécessaire pour que `opacity` ait un effet) */
  transparent: boolean
  /** Opacité du matériau (0 = invisible, 1 = opaque) */
  opacity: number
  /** Seuil alpha en dessous duquel le fragment est discard */
  alphaTest: number
  /** Face(s) rendue(s) : front / back / double */
  side: 'front' | 'back' | 'double'
  /** Affecté par le brouillard de la scène */
  fog: boolean
  /** Écrit dans le depth buffer */
  depthWrite: boolean
  /** Teste le depth buffer */
  depthTest: boolean
  /** Applique le tone mapping du renderer */
  toneMapped: boolean

  // ── Maps supplémentaires de THREE.MeshMatcapMaterial ────────────────────
  /** Active `map` (texture de couleur, damier procédural) */
  useMap: boolean
  /** Active `bumpMap` (relief procédural en niveaux de gris) */
  useBumpMap: boolean
  /** Intensité du relief `bumpScale` */
  bumpScale: number
  /** Active `displacementMap` (déplace réellement les vertices) */
  useDisplacementMap: boolean
  /** Intensité du déplacement `displacementScale` */
  displacementScale: number
  /** Décalage du déplacement `displacementBias` */
  displacementBias: number
  /** Active `normalMap` (normal map procédurale) */
  useNormalMap: boolean
  /** `normalScale.x` */
  normalScaleX: number
  /** `normalScale.y` */
  normalScaleY: number
  /** Active `alphaMap` (dégradé radial pour la transparence) */
  useAlphaMap: boolean
  /** Active `lightMap` (nécessite un 2e set d'UV, généré automatiquement ici) */
  useLightMap: boolean
  /** Intensité `lightMapIntensity` */
  lightMapIntensity: number
}

const SIDE_MAP: Record<ExtrudedMatcapProps['side'], THREE.Side> = {
  front: THREE.FrontSide,
  back: THREE.BackSide,
  double: THREE.DoubleSide,
}

/**
 * Crée une THREE.CanvasTexture procédurale (aucun asset externe requis).
 */
function createCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Génère toutes les textures procédurales utilisées pour démontrer
 * map / bumpMap / displacementMap / normalMap / alphaMap / lightMap.
 */
function useProceduralMaps() {
  return useMemo(() => {
    const map = createCanvasTexture((ctx, size) => {
      const tiles = 8
      const tileSize = size / tiles
      for (let y = 0; y < tiles; y++) {
        for (let x = 0; x < tiles; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#cfcfcf'
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
        }
      }
    })

    const bumpMap = createCanvasTexture((ctx, size) => {
      const imageData = ctx.createImageData(size, size)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.random() * 255
        imageData.data[i] = v
        imageData.data[i + 1] = v
        imageData.data[i + 2] = v
        imageData.data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
    })

    const displacementMap = createCanvasTexture((ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.5, '#888888')
      grad.addColorStop(1, '#000000')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
    })

    const normalMap = createCanvasTexture((ctx, size) => {
      // Base neutre (0.5, 0.5, 1) = #8080ff
      ctx.fillStyle = '#8080ff'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * size
        const y = Math.random() * size
        const r = 4 + Math.random() * 14
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, '#a5a5ff')
        grad.addColorStop(1, '#8080ff')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    const alphaMap = createCanvasTexture((ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(1, '#000000')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
    })

    // lightMap utilise le même pattern qu'un damier pour bien voir l'intensité
    const lightMap = createCanvasTexture((ctx, size) => {
      const grad = ctx.createLinearGradient(0, 0, size, size)
      grad.addColorStop(0, '#000000')
      grad.addColorStop(1, '#ffffff')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
    })

    return { map, bumpMap, displacementMap, normalMap, alphaMap, lightMap }
  }, [])
}

/**
 * Dessine une forme 2D en "L" utilisée comme profil pour l'extrusion.
 */
function createLShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0, 2)
  shape.lineTo(1, 2)
  shape.lineTo(1, 1)
  shape.lineTo(2, 1)
  shape.lineTo(2, 0)
  shape.lineTo(0, 0)
  return shape
}

function ExtrudedShape({
  matcapId,
  matcapResolution,
  depth,
  bevelSize,
  bevelSegments,
  rotationY,
  color,
  flatShading,
  wireframe,
  wireframeLinewidth,
  transparent,
  opacity,
  alphaTest,
  side,
  fog,
  depthWrite,
  depthTest,
  toneMapped,
  useMap,
  useBumpMap,
  bumpScale,
  useDisplacementMap,
  displacementScale,
  displacementBias,
  useNormalMap,
  normalScaleX,
  normalScaleY,
  useAlphaMap,
  useLightMap,
  lightMapIntensity,
}: ExtrudedMatcapProps) {
  const [matcapTexture] = useMatcapTexture(matcapId, matcapResolution)
  const maps = useProceduralMaps()

  const geometry = useMemo(() => {
    const shape = createLShape()
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevelSize,
      bevelSize,
      bevelSegments,
      curveSegments: 12,
    })
    // lightMap nécessite un 2e set d'UV (uv2) — on réutilise les uv existants
    const uvAttribute = geom.getAttribute('uv')
    if (uvAttribute) geom.setAttribute('uv2', uvAttribute)
    return geom
  }, [depth, bevelSize, bevelSegments])

  return (
    <Center>
      <mesh geometry={geometry} rotation={[0, rotationY, 0]}>
        <meshMatcapMaterial
          matcap={matcapTexture}
          color={color}
          flatShading={flatShading}
          wireframe={wireframe}
          wireframeLinewidth={wireframeLinewidth}
          transparent={transparent}
          opacity={opacity}
          alphaTest={alphaTest}
          side={SIDE_MAP[side]}
          fog={fog}
          depthWrite={depthWrite}
          depthTest={depthTest}
          toneMapped={toneMapped}
          map={useMap ? maps.map : null}
          bumpMap={useBumpMap ? maps.bumpMap : null}
          bumpScale={bumpScale}
          displacementMap={useDisplacementMap ? maps.displacementMap : null}
          displacementScale={displacementScale}
          displacementBias={displacementBias}
          normalMap={useNormalMap ? maps.normalMap : null}
          normalScale={[normalScaleX, normalScaleY]}
          alphaMap={useAlphaMap ? maps.alphaMap : null}
          {...({
            lightMap: useLightMap ? maps.lightMap : null,
            lightMapIntensity,
          } as Record<string, unknown>)}
        />
      </mesh>
    </Center>
  )
}

function ExtrudedMatcapPreview(props: ExtrudedMatcapProps) {
  return (
    <Canvas
      style={{ height: '500px', background: '#1a1a2e' }}
      camera={{ position: [4, 4, 4], fov: 50 }}
    >
      <ExtrudedShape {...props} />
      <OrbitControls />
    </Canvas>
  )
}

const meta: Meta<typeof ExtrudedMatcapPreview> = {
  title: 'Three/Aquarelle/ExtrudedMatcap',
  component: ExtrudedMatcapPreview,
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
    depth: { control: { type: 'range', min: 0.1, max: 3, step: 0.1 } },
    bevelSize: { control: { type: 'range', min: 0, max: 0.3, step: 0.01 } },
    bevelSegments: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    rotationY: { control: { type: 'range', min: 0, max: Math.PI * 2, step: 0.1 } },

    // MeshMatcapMaterial
    color: { control: 'color' },
    flatShading: { control: 'boolean' },
    wireframe: { control: 'boolean' },
    wireframeLinewidth: { control: { type: 'range', min: 0.5, max: 10, step: 0.5 } },
    transparent: { control: 'boolean' },
    opacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    alphaTest: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    side: { control: { type: 'radio' }, options: ['front', 'back', 'double'] },
    fog: { control: 'boolean' },
    depthWrite: { control: 'boolean' },
    depthTest: { control: 'boolean' },
    toneMapped: { control: 'boolean' },

    // Maps procédurales
    useMap: { control: 'boolean' },
    useBumpMap: { control: 'boolean' },
    bumpScale: { control: { type: 'range', min: 0, max: 5, step: 0.05 } },
    useDisplacementMap: { control: 'boolean' },
    displacementScale: { control: { type: 'range', min: -1, max: 1, step: 0.01 } },
    displacementBias: { control: { type: 'range', min: -1, max: 1, step: 0.01 } },
    useNormalMap: { control: 'boolean' },
    normalScaleX: { control: { type: 'range', min: -3, max: 3, step: 0.1 } },
    normalScaleY: { control: { type: 'range', min: -3, max: 3, step: 0.1 } },
    useAlphaMap: { control: 'boolean' },
    useLightMap: { control: 'boolean' },
    lightMapIntensity: { control: { type: 'range', min: 0, max: 3, step: 0.1 } },
  },
}

export default meta
type Story = StoryObj<typeof ExtrudedMatcapPreview>

const baseMatcapArgs = {
  color: '#ffffff',
  flatShading: false,
  wireframe: false,
  wireframeLinewidth: 1,
  transparent: false,
  opacity: 1,
  alphaTest: 0,
  side: 'front' as const,
  fog: true,
  depthWrite: true,
  depthTest: true,
  toneMapped: true,
  useMap: false,
  useBumpMap: false,
  bumpScale: 1,
  useDisplacementMap: false,
  displacementScale: 0.2,
  displacementBias: 0,
  useNormalMap: false,
  normalScaleX: 1,
  normalScaleY: 1,
  useAlphaMap: false,
  useLightMap: false,
  lightMapIntensity: 1,
}

export const Default: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8', // matcap métal gris (drei default)
    matcapResolution: 256,
    depth: 1,
    bevelSize: 0.05,
    bevelSegments: 4,
    rotationY: 0.6,
    ...baseMatcapArgs,
  },
}

export const GoldMatcap: Story = {
  args: {
    matcapId: '735236_C39B36_D1BC7B_A55F2B', // matcap doré
    matcapResolution: 256,
    depth: 1.2,
    bevelSize: 0.08,
    bevelSegments: 6,
    rotationY: 1.2,
    ...baseMatcapArgs,
    color: '#ffe9b3',
  },
}

export const FlatDisc: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
    matcapResolution: 256,
    depth: 0.3,
    bevelSize: 0.02,
    bevelSegments: 2,
    rotationY: 0,
    ...baseMatcapArgs,
    flatShading: true,
  },
}

export const Wireframe: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
    matcapResolution: 256,
    depth: 1,
    bevelSize: 0.05,
    bevelSegments: 4,
    rotationY: 0.6,
    ...baseMatcapArgs,
    wireframe: true,
    wireframeLinewidth: 2,
  },
}

export const Transparent: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
    matcapResolution: 256,
    depth: 1,
    bevelSize: 0.05,
    bevelSegments: 4,
    rotationY: 0.6,
    ...baseMatcapArgs,
    transparent: true,
    opacity: 0.4,
    side: 'double',
  },
}

export const BumpAndDisplacement: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
    matcapResolution: 256,
    depth: 1,
    bevelSize: 0.05,
    bevelSegments: 4,
    rotationY: 0.6,
    ...baseMatcapArgs,
    useBumpMap: true,
    bumpScale: 2,
    useDisplacementMap: true,
    displacementScale: 0.3,
    displacementBias: -0.15,
  },
}

export const NormalMapped: Story = {
  args: {
    matcapId: '3B3C3F_DAD9D5_929290_ABACA8',
    matcapResolution: 256,
    depth: 1,
    bevelSize: 0.05,
    bevelSegments: 4,
    rotationY: 0.6,
    ...baseMatcapArgs,
    useNormalMap: true,
    normalScaleX: 2,
    normalScaleY: 2,
  },
}

export const FullyLoaded: Story = {
  args: {
    matcapId: '735236_C39B36_D1BC7B_A55F2B',
    matcapResolution: 512,
    depth: 1.2,
    bevelSize: 0.08,
    bevelSegments: 6,
    rotationY: 0.8,
    ...baseMatcapArgs,
    useMap: true,
    useBumpMap: true,
    bumpScale: 1,
    useDisplacementMap: true,
    displacementScale: 0.15,
    displacementBias: -0.05,
    useNormalMap: true,
    normalScaleX: 1.5,
    normalScaleY: 1.5,
    useAlphaMap: true,
    transparent: true,
    useLightMap: true,
    lightMapIntensity: 1.5,
  },
}









