import * as THREE from 'three'

/**
 * Paramètres de {@link MeshCustomMatcapMaterial}.
 * Hérite de tous les paramètres standards de `THREE.MeshMatcapMaterial`
 * (color, matcap, map, bumpMap, displacementMap, normalMap, alphaMap, lightMap, ...)
 * et ajoute des points d'injection GLSL pour personnaliser le shader interne.
 */
export interface MeshCustomMatcapMaterialParameters extends THREE.MeshMatcapMaterialParameters {
  /** Uniforms supplémentaires accessibles dans vos GLSL custom (vertex ET fragment) */
  uniforms?: Record<string, THREE.IUniform>

  /** GLSL injecté tout en haut du vertex shader (déclarations uniform/varying) */
  vertexHeader?: string
  /** GLSL injecté juste après `#include <begin_vertex>` (manipuler `transformed` = position locale) */
  vertexMain?: string

  /** GLSL injecté tout en haut du fragment shader (déclarations uniform/varying) */
  fragmentHeader?: string
  /** GLSL injecté juste après `#include <normal_fragment_maps>` (manipuler `normal` avant le calcul matcap) */
  fragmentNormal?: string
  /** GLSL injecté juste avant `#include <opaque_fragment>` (manipuler `outgoingLight` / `diffuseColor.a`) */
  fragmentMain?: string

  /** Échappatoire complète : appelé après toutes les injections, reçoit le shader brut Three.js */
  onShaderCompile?: (shader: THREE.WebGLProgramParametersWithUniforms) => void

  /**
   * Si `true` (défaut), un uniform `uTime` (secondes écoulées) est déclaré
   * automatiquement et mis à jour à chaque frame via `onBeforeRender`.
   */
  autoUpdateTime?: boolean
}

/**
 * Variante custom de `THREE.MeshMatcapMaterial` permettant d'injecter du GLSL
 * dans le vertex et le fragment shader interne de Three.js, sans avoir à
 * réécrire tout le shader matcap (projection de la normale en espace vue).
 *
 * @example
 * ```ts
 * const material = new MeshCustomMatcapMaterial({
 *   matcap: matcapTexture,
 *   uniforms: { uRimColor: { value: new THREE.Color('#66ccff') } },
 *   fragmentHeader: `uniform vec3 uRimColor;`,
 *   fragmentMain: /* glsl *\/ `
 *     float rim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
 *     outgoingLight += uRimColor * pow(rim, 3.0);
 *   `,
 * })
 * ```
 */
export class MeshCustomMatcapMaterial extends THREE.MeshMatcapMaterial {
  customUniforms: Record<string, THREE.IUniform>
  vertexHeader: string
  vertexMain: string
  fragmentHeader: string
  fragmentNormal: string
  fragmentMain: string
  onShaderCompile?: (shader: THREE.WebGLProgramParametersWithUniforms) => void
  autoUpdateTime: boolean

  private _shader: THREE.WebGLProgramParametersWithUniforms | null = null
  private _clock = new THREE.Clock()

  constructor(params: MeshCustomMatcapMaterialParameters = {}) {
    const {
      uniforms = {},
      vertexHeader = '',
      vertexMain = '',
      fragmentHeader = '',
      fragmentNormal = '',
      fragmentMain = '',
      onShaderCompile,
      autoUpdateTime = true,
      ...matcapParams
    } = params

    super(matcapParams)

    this.customUniforms = uniforms
    this.vertexHeader = vertexHeader
    this.vertexMain = vertexMain
    this.fragmentHeader = fragmentHeader
    this.fragmentNormal = fragmentNormal
    this.fragmentMain = fragmentMain
    this.onShaderCompile = onShaderCompile
    this.autoUpdateTime = autoUpdateTime
  }

  override onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms): void => {
    // Injecte les uniforms custom
    for (const key of Object.keys(this.customUniforms)) {
      shader.uniforms[key] = this.customUniforms[key]
    }
    if (this.autoUpdateTime && !shader.uniforms['uTime']) {
      shader.uniforms['uTime'] = { value: 0 }
    }

    // ── Vertex shader ──────────────────────────────────────────────────────
    if (this.vertexHeader) {
      shader.vertexShader = `${this.vertexHeader}\n${shader.vertexShader}`
    }
    if (this.vertexMain) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n${this.vertexMain}`,
      )
    }

    // ── Fragment shader ────────────────────────────────────────────────────
    if (this.fragmentHeader) {
      shader.fragmentShader = `${this.fragmentHeader}\n${shader.fragmentShader}`
    }
    if (this.fragmentNormal) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${this.fragmentNormal}`,
      )
    }
    if (this.fragmentMain) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `${this.fragmentMain}\n#include <opaque_fragment>`,
      )
    }

    this.onShaderCompile?.(shader)
    this._shader = shader
  }

  override onBeforeRender = (): void => {
    if (this.autoUpdateTime && this._shader) {
      this._shader.uniforms['uTime']!.value = this._clock.getElapsedTime()
    }
  }

  /**
   * Force la recompilation du shader WebGL.
   * À appeler après avoir modifié `vertexHeader` / `vertexMain` /
   * `fragmentHeader` / `fragmentNormal` / `fragmentMain` à chaud.
   */
  recompile(): void {
    this.needsUpdate = true
  }
}

