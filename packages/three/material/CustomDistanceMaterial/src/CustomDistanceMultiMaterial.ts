import * as THREE from 'three'

/**
 * Comme CustomDistanceBisMaterial, mais accepte une liste de couleurs (2 ou plus)
 * pour former un dégradé multi-étapes réparti automatiquement entre le point
 * le plus proche et le point le plus éloigné de la caméra (bounding sphere de l'objet).
 *
 * colors[0]                → point le plus proche de la caméra
 * colors[colors.length - 1] → point le plus éloigné de la caméra
 * les couleurs intermédiaires sont réparties uniformément le long du dégradé.
 */

// Taille max du tableau de couleurs côté GLSL (les slots inutilisés sont ignorés via uNumColors)
const MAX_COLORS = 16

const vertexShader = /* glsl */ `
  varying float vDistance;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDistance = length(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  #define MAX_COLORS ${MAX_COLORS}

  uniform vec3 uColors[MAX_COLORS];
  uniform int uNumColors;
  uniform float uMinDist;
  uniform float uMaxDist;

  varying float vDistance;

  void main() {
    float range = uMaxDist - uMinDist;
    float t = range > 0.0001
      ? clamp((vDistance - uMinDist) / range, 0.0, 1.0)
      : 0.0;

    int segments = uNumColors - 1;
    float scaled = t * float(max(segments, 1));
    int idx = int(floor(scaled));
    idx = clamp(idx, 0, max(segments - 1, 0));
    float localT = clamp(scaled - float(idx), 0.0, 1.0);

    vec3 color = uColors[0];
    for (int i = 0; i < MAX_COLORS - 1; i++) {
      if (i == idx) {
        color = mix(uColors[i], uColors[i + 1], localT);
      }
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export interface CustomDistanceMultiMaterialParameters {
  /** Liste des couleurs du dégradé (au moins 2), de la plus proche à la plus éloignée */
  colors?: THREE.ColorRepresentation[]
  size?: number
}

const _worldCenter = new THREE.Vector3()

function buildColorsArray(colors: THREE.ColorRepresentation[]): THREE.Color[] {
  const arr: THREE.Color[] = []
  const last = colors[colors.length - 1] ?? 0x000000
  for (let i = 0; i < MAX_COLORS; i++) {
    arr.push(new THREE.Color(colors[i] ?? last))
  }
  return arr
}

export class CustomDistanceMultiMaterial extends THREE.ShaderMaterial {
  constructor(params: CustomDistanceMultiMaterialParameters = {}) {
    const { colors = [0xffffff, 0x888888, 0x000000], size = 0.5 } = params

    if (colors.length < 2) {
      console.warn(
        '[CustomDistanceMultiMaterial] Il faut au moins 2 couleurs, valeur par défaut utilisée.',
      )
    }

    const safeColors = colors.length >= 2 ? colors : [0xffffff, 0x000000]

    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColors: { value: buildColorsArray(safeColors) },
        uNumColors: { value: Math.min(safeColors.length, MAX_COLORS) },
        uMinDist: { value: -size },
        uMaxDist: { value: size },
      },
    })
  }

  override onBeforeRender(
    _renderer: THREE.WebGLRenderer,
    _scene: THREE.Scene,
    camera: THREE.Camera,
    geometry: THREE.BufferGeometry,
    object: THREE.Object3D,
  ): void {
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere()
    }

    const sphere = geometry.boundingSphere!

    // Centre de la bounding sphere en world space
    _worldCenter.copy(sphere.center).applyMatrix4(object.matrixWorld)

    // Rayon world (tient compte du scale)
    const worldRadius = sphere.radius * object.matrixWorld.getMaxScaleOnAxis()

    // Distance caméra → centre
    const camDist = camera.position.distanceTo(_worldCenter)

    this.uniforms['uMinDist']!.value = Math.max(0, camDist - worldRadius)
    this.uniforms['uMaxDist']!.value = camDist + worldRadius
  }

  /** Couleurs actuellement utilisées (dans l'ordre proche → loin) */
  get colors(): THREE.Color[] {
    const count = this.uniforms['uNumColors']!.value as number
    const all = this.uniforms['uColors']!.value as THREE.Color[]
    return all.slice(0, count)
  }

  set colors(newColors: THREE.ColorRepresentation[]) {
    if (newColors.length < 2) {
      console.warn('[CustomDistanceMultiMaterial] Il faut au moins 2 couleurs.')
      return
    }
    const count = Math.min(newColors.length, MAX_COLORS)
    const all = this.uniforms['uColors']!.value as THREE.Color[]
    const last = newColors[newColors.length - 1]!
    for (let i = 0; i < MAX_COLORS; i++) {
      all[i]!.set(newColors[i] ?? last)
    }
    this.uniforms['uNumColors']!.value = count
  }

  static readonly MAX_COLORS = MAX_COLORS
}

