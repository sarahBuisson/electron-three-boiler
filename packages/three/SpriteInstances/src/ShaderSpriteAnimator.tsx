import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WebGLProgramParametersWithUniforms } from 'three'

export interface ShaderSpriteAnimatorProps {
  /** Texture spritesheet */
  texture: THREE.Texture
  /** Nombre de colonnes dans le spritesheet */
  columns?: number
  /** Nombre de lignes dans le spritesheet */
  rows?: number
  /** Index de la première frame (inclusive) */
  startFrame?: number
  /** Index de la dernière frame (inclusive, -1 = toutes) */
  endFrame?: number
  /** Frames par seconde */
  fps?: number
  /** Boucler l'animation */
  loop?: boolean
  /** Amplitude de l'ondulation UV (0 = pas d'effet) */
  amplitude?: number
  /** Fréquence spatiale de l'ondulation */
  frequency?: number
  /** Vitesse d'animation du shader */
  speed?: number
  /** Position du sprite */
  position?: [number, number, number]
  /** Scale du sprite */
  scale?: number | [number, number, number]
}

/**
 * SpriteAnimator avec distortion shader.
 * Anime un spritesheet frame par frame et applique une ondulation UV
 * via onBeforeCompile sur le SpriteMaterial de Three.js.
 */
export function ShaderSpriteAnimator({
  texture,
  columns = 1,
  rows = 1,
  startFrame = 0,
  endFrame = -1,
  fps = 12,
  loop = true,
  amplitude = 0.02,
  frequency = 10,
  speed = 2,
  position = [0, 0, 0],
  scale = 1,
}: ShaderSpriteAnimatorProps) {
  const spriteRef = useRef<THREE.Sprite>(null)
  const shaderRef = useRef<WebGLProgramParametersWithUniforms | null>(null)
  const timeRef = useRef(0)
  const frameTimeRef = useRef(0)
  const frameRef = useRef(startFrame)

  const totalFrames = endFrame === -1 ? columns * rows : endFrame - startFrame + 1

  // Clone la texture pour ne pas affecter d'autres usages
  const frameTexture = useMemo(() => {
    const t = texture.clone()
    t.needsUpdate = true
    t.repeat.set(1 / columns, 1 / rows)
    t.offset.set(0, 1 - 1 / rows) // frame 0 = haut-gauche
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    return t
  }, [texture, columns, rows])

  // Material avec onBeforeCompile pour injecter la distortion
  const material = useMemo(() => {
    const mat = new THREE.SpriteMaterial({
      map: frameTexture,
      transparent: true,
    })

    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      // Ajout des uniforms de distortion
      shader.uniforms['uTime']      = { value: 0 }
      shader.uniforms['uAmplitude'] = { value: amplitude }
      shader.uniforms['uFrequency'] = { value: frequency }
      shader.uniforms['uSpeed']     = { value: speed }
      shader.uniforms['uFrameRepeat'] = { value: new THREE.Vector2(1 / columns, 1 / rows) }

      // Déclaration des uniforms dans le fragment shader
      shader.fragmentShader =
        `uniform float uTime;\n` +
        `uniform float uAmplitude;\n` +
        `uniform float uFrequency;\n` +
        `uniform float uSpeed;\n` +
        `uniform vec2  uFrameRepeat;\n` +
        shader.fragmentShader

      // Remplacement du #include <map_fragment> pour injecter la distortion sur les UV
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        /* glsl */ `
        #ifdef USE_MAP
          // Ondulation UV — amplitude proportionnelle à la taille d'une frame
          // pour éviter de déborder sur les frames voisines
          vec2 wave = vec2(
            sin(vUv.y * uFrequency + uTime * uSpeed) * uAmplitude * uFrameRepeat.x,
            cos(vUv.x * uFrequency + uTime * uSpeed) * uAmplitude * uFrameRepeat.y
          );
          vec2 distortedUv = vUv + wave;
          vec4 sampledDiffuseColor = texture2D(map, distortedUv);
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      )

      shaderRef.current = shader
    }

    // Forcer la recompilation si amplitude/frequency/speed changent
    mat.needsUpdate = true

    return mat
  }, [frameTexture, amplitude, frequency, speed, columns, rows])

  // Met à jour les uniforms dynamiquement si les props changent
  useFrame((_, delta) => {
    if (!spriteRef.current) return

    // 1. Avancer le temps pour la distortion
    timeRef.current += delta
    if (shaderRef.current) {
      shaderRef.current.uniforms['uTime'].value      = timeRef.current
      shaderRef.current.uniforms['uAmplitude'].value = amplitude
      shaderRef.current.uniforms['uFrequency'].value = frequency
      shaderRef.current.uniforms['uSpeed'].value     = speed
    }

    // 2. Avancer la frame d'animation
    frameTimeRef.current += delta
    if (frameTimeRef.current >= 1 / fps) {
      frameTimeRef.current = 0

      const localFrame = frameRef.current - startFrame
      const nextLocal  = (localFrame + 1) % totalFrames
      frameRef.current = startFrame + nextLocal

      if (!loop && nextLocal === 0) {
        frameRef.current = startFrame
        frameTimeRef.current = Infinity // geler sur la dernière frame si pas de loop
      }

      // Calculer offset UV de la frame courante
      const absFrame = frameRef.current
      const col  = absFrame % columns
      // row 0 = haut → offset.y = 1 - (row+1)/rows
      const row  = Math.floor(absFrame / columns)

      const map = spriteRef.current.material.map
      if (map) {
        map.offset.set(col / columns, 1 - (row + 1) / rows)
        map.needsUpdate = true
      }
    }
  })

  const scaleArray: [number, number, number] =
    typeof scale === 'number' ? [scale, scale, scale] : scale

  return (
    <sprite ref={spriteRef} position={position} scale={scaleArray} material={material} />
  )
}
