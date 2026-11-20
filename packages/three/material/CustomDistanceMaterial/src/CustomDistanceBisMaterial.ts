import * as THREE from 'three'

/**
 * Comme CustomDistanceMaterial, mais calcule automatiquement les distances
 * min/max de l'objet via sa bounding sphere à chaque frame.
 * Le point le plus proche de la caméra → couleur `proche`
 * Le point le plus éloigné de la caméra → couleur `loin`
 * Le reste est un dégradé interpolé automatiquement.
 */

const vertexShader = /* glsl */ `
  varying float vDistance;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDistance = length(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorProche;
  uniform vec3 uColorLoin;
  uniform float uMinDist;
  uniform float uMaxDist;

  varying float vDistance;

  void main() {
    float range = uMaxDist - uMinDist;
    float t = range > 0.0001
      ? clamp((vDistance - uMinDist) / range, 0.0, 1.0)
      : 0.0;
    vec3 color = mix(uColorProche, uColorLoin, t);
    gl_FragColor = vec4(color, 1.0);
  }
`

export interface CustomDistanceBisMaterialParameters {
  /** Couleur du point le plus proche de la caméra */
  proche?: THREE.ColorRepresentation
  /** Couleur du point le plus éloigné de la caméra */
  loin?: THREE.ColorRepresentation,
  size?: number
}

const _worldCenter = new THREE.Vector3()

export class CustomDistanceBisMaterial extends THREE.ShaderMaterial {
  constructor(params: CustomDistanceBisMaterialParameters = {}) {
    const { proche = 0xffffff, loin = 0x000000, size=0.5 } = params

    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorProche: { value: new THREE.Color(proche) },
        uColorLoin:   { value: new THREE.Color(loin) },
        uMinDist:     { value: -size },
        uMaxDist:     { value: size},
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

    this.uniforms['uMinDist'].value = Math.max(0, camDist - worldRadius)
    this.uniforms['uMaxDist'].value = camDist + worldRadius
  }

  get proche(): THREE.Color {
    return this.uniforms['uColorProche'].value as THREE.Color
  }
  set proche(color: THREE.ColorRepresentation) {
    (this.uniforms['uColorProche'].value as THREE.Color).set(color)
  }

  get loin(): THREE.Color {
    return this.uniforms['uColorLoin'].value as THREE.Color
  }
  set loin(color: THREE.ColorRepresentation) {
    (this.uniforms['uColorLoin'].value as THREE.Color).set(color)
  }
}

