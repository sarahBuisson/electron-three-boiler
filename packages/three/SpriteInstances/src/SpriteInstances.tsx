/**
 * Copie de @react-three/drei SpritesInstances.tsx
 * Source: https://github.com/pmndrs/drei/blob/master/src/core/SpritesInstances.tsx
 *
 * Modifications:
 * - Suppression des imports internes drei (../helpers/ts-utils, ../helpers/deprecated)
 * - ForwardRefComponent défini localement
 * - setUpdateRange défini localement (compatibilité three.js >= r151)
 */

import * as THREE from 'three'
import * as React from 'react'
import { extend, useFrame } from '@react-three/fiber'
import type { ThreeElement, ThreeElements } from '@react-three/fiber'

// ---------------------------------------------------------------------------
// Helpers locaux (remplacent ../helpers/ts-utils et ../helpers/deprecated)
// ---------------------------------------------------------------------------

export type ForwardRefComponent<P, T> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<T>
>

/** Compatibilité three.js r151+ : setDrawRange remplace updateRange */
function setUpdateRange(
  attribute: THREE.BufferAttribute,
  updateRange: { start: number; count: number }
) {
  if ('setUsage' in attribute && (attribute as any).updateRanges !== undefined) {
    // three.js >= r151
    ;(attribute as any).updateRanges[0] = updateRange
  } else {
    ;(attribute as any).updateRange = updateRange
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

declare module '@react-three/fiber' {
  interface ThreeElements {
    positionMesh: ThreeElement<typeof PositionMesh>
  }
}

type Api = {
  getParent: () => React.RefObject<InstancedMesh>
  subscribe: (ref: React.RefObject<any>) => void
}

export type SpritesInstancesProps = Omit<ThreeElements['instancedMesh'], 'ref' | 'args'> & {
  context?: React.Context<Api>
  range?: number
  limit?: number
  frames?: number
}

export type InstanceProps = Omit<ThreeElements['positionMesh'], 'ref'> & {
  context?: React.Context<Api>
}

export type InstancedAttributeProps = Omit<ThreeElements['instancedBufferAttribute'], 'ref' | 'args'> & {
  name: string
  defaultValue: any
  normalized?: boolean
  usage?: number
}

type InstancedMesh = Omit<THREE.InstancedMesh, 'instanceMatrix' | 'instanceColor'> & {
  instanceMatrix: THREE.InstancedBufferAttribute
  instanceColor: THREE.InstancedBufferAttribute
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

function isFunctionChild(
  value: any
): value is (
  props: React.ForwardRefExoticComponent<Omit<InstanceProps, 'ref'> & React.RefAttributes<unknown>>
) => React.ReactNode {
  return typeof value === 'function'
}

const _instanceLocalMatrix = /* @__PURE__ */ new THREE.Matrix4()
const _instanceWorldMatrix = /* @__PURE__ */ new THREE.Matrix4()
const _instanceIntersects: THREE.Intersection[] = []
const _mesh = /* @__PURE__ */ new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>()

// ---------------------------------------------------------------------------
// PositionMesh
// ---------------------------------------------------------------------------

export class PositionMesh extends THREE.Group {
  color: THREE.Color
  instance: React.RefObject<THREE.InstancedMesh | undefined>
  instanceKey: React.RefObject<PositionMesh | undefined>

  constructor() {
    super()
    this.color = new THREE.Color('white')
    this.instance = { current: undefined }
    this.instanceKey = { current: undefined }
  }

  get geometry() {
    return this.instance.current?.geometry
  }

  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const parent = this.instance.current
    if (!parent) return
    if (!parent.geometry || !parent.material) return
    _mesh.geometry = parent.geometry
    const matrixWorld = parent.matrixWorld
    const instanceId = parent.userData.instances.indexOf(this.instanceKey)
    if (instanceId === -1 || instanceId > parent.count) return
    parent.getMatrixAt(instanceId, _instanceLocalMatrix)
    _instanceWorldMatrix.multiplyMatrices(matrixWorld, _instanceLocalMatrix)
    _mesh.matrixWorld = _instanceWorldMatrix
    if (parent.material instanceof THREE.Material) _mesh.material.side = parent.material.side
    else _mesh.material.side = (parent.material as THREE.Material[])[0].side
    _mesh.raycast(raycaster, _instanceIntersects)
    for (let i = 0, l = _instanceIntersects.length; i < l; i++) {
      const intersect = _instanceIntersects[i]
      intersect.instanceId = instanceId
      intersect.object = this
      intersects.push(intersect)
    }
    _instanceIntersects.length = 0
  }
}

// ---------------------------------------------------------------------------
// Context & matrices
// ---------------------------------------------------------------------------

const globalContext = /* @__PURE__ */ React.createContext<Api>(null!)
const parentMatrix = /* @__PURE__ */ new THREE.Matrix4()
const instanceMatrix = /* @__PURE__ */ new THREE.Matrix4()
const tempMatrix = /* @__PURE__ */ new THREE.Matrix4()
const translation = /* @__PURE__ */ new THREE.Vector3()
const rotation = /* @__PURE__ */ new THREE.Quaternion()
const scale = /* @__PURE__ */ new THREE.Vector3()

const isInstancedBufferAttribute = (attr: any): attr is THREE.InstancedBufferAttribute =>
  attr.isInstancedBufferAttribute

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

export const Instance = /* @__PURE__ */ React.forwardRef(
  ({ context, children, ...props }: InstanceProps, ref) => {
    React.useMemo(() => extend({ PositionMesh }), [])
    const group = React.useRef<PositionMesh>(null!)
    React.useImperativeHandle(ref, () => group.current, [])
    const { subscribe, getParent } = React.useContext<Api>(context || globalContext)
    React.useLayoutEffect(() => subscribe(group), [])
    return (
      <positionMesh instance={getParent()} instanceKey={group} ref={group} {...props}>
        {children}
      </positionMesh>
    )
  }
)

// ---------------------------------------------------------------------------
// SpritesInstances
// ---------------------------------------------------------------------------

export const SpritesInstances: ForwardRefComponent<SpritesInstancesProps, THREE.InstancedMesh> =
  /* @__PURE__ */ React.forwardRef<THREE.InstancedMesh, SpritesInstancesProps>(
    ({ context, children, range, limit = 1000, frames = Infinity, ...props }, ref) => {
      const [{ localContext, instance }] = React.useState(() => {
        const localContext = React.createContext<Api>(null!)
        return {
          localContext,
          instance: React.forwardRef((props: InstanceProps, ref) => (
            <Instance context={localContext} {...props} ref={ref} />
          )),
        }
      })

      const parentRef = React.useRef<InstancedMesh>(null!)
      React.useImperativeHandle(ref, () => parentRef.current, [])
      const [instances, setSpritesInstances] = React.useState<React.RefObject<PositionMesh>[]>([])
      const [[matrices, colors]] = React.useState(() => {
        const mArray = new Float32Array(limit * 16)
        for (let i = 0; i < limit; i++) tempMatrix.identity().toArray(mArray, i * 16)
        return [mArray, new Float32Array([...new Array(limit * 3)].map(() => 1))]
      })

      React.useEffect(() => {
        parentRef.current.instanceMatrix.needsUpdate = true
      })

      let iterations = 0
      let count = 0

      const attributes = React.useRef<[string, THREE.InstancedBufferAttribute][]>([])
      React.useLayoutEffect(() => {
        attributes.current = Object.entries(parentRef.current.geometry.attributes).filter(
          ([_name, value]) => isInstancedBufferAttribute(value)
        ) as [string, THREE.InstancedBufferAttribute][]
      })

      useFrame(() => {
        if (frames === Infinity || iterations < frames) {
          parentRef.current.updateMatrix()
          parentRef.current.updateMatrixWorld()
          parentMatrix.copy(parentRef.current.matrixWorld).invert()

          count = Math.min(limit, range !== undefined ? range : limit, instances.length)
          parentRef.current.count = count
          setUpdateRange(parentRef.current.instanceMatrix, { start: 0, count: count * 16 })
          setUpdateRange(parentRef.current.instanceColor, { start: 0, count: count * 3 })

          for (let i = 0; i < instances.length; i++) {
            const instance = instances[i].current
            instance.matrixWorld.decompose(translation, rotation, scale)
            instanceMatrix.compose(translation, rotation, scale).premultiply(parentMatrix)
            instanceMatrix.toArray(matrices, i * 16)
            parentRef.current.instanceMatrix.needsUpdate = true
            instance.color.toArray(colors, i * 3)
            parentRef.current.instanceColor.needsUpdate = true
          }
          iterations++
        }
      })

      const api = React.useMemo(
        () => ({
          getParent: () => parentRef,
          subscribe: (ref: React.RefObject<PositionMesh>) => {
            setSpritesInstances((instances) => [...instances, ref])
            return () =>
              setSpritesInstances((instances) =>
                instances.filter((item) => item.current !== ref.current)
              )
          },
        }),
        []
      )

      return (
        <instancedMesh
          userData={{ instances, limit, frames }}
          matrixAutoUpdate={false}
          ref={parentRef}
          args={[null as any, null as any, 0]}
          raycast={() => null}
          {...props}
        >
          <instancedBufferAttribute
            attach="instanceMatrix"
            args={[matrices, 16]}
            usage={THREE.DynamicDrawUsage}
          />
          <instancedBufferAttribute
            attach="instanceColor"
            args={[colors, 3]}
            usage={THREE.DynamicDrawUsage}
          />
          {isFunctionChild(children) ? (
            <localContext.Provider value={api}>{children(instance)}</localContext.Provider>
          ) : context ? (
            <context.Provider value={api}>{children}</context.Provider>
          ) : (
            <globalContext.Provider value={api}>{children}</globalContext.Provider>
          )}
        </instancedMesh>
      )
    }
  )

// ---------------------------------------------------------------------------
// Merged
// ---------------------------------------------------------------------------

export interface MergedProps extends Omit<SpritesInstancesProps, 'children'> {
  meshes: THREE.Mesh[] | Record<string, THREE.Object3D>
  children: (
    ...instances: [
      React.FC<InstanceProps> & Record<string, React.FC<InstanceProps>>,
      ...React.FC<InstanceProps>[],
    ]
  ) => React.ReactNode
}

export const Merged: ForwardRefComponent<MergedProps, THREE.Group> =
  /* @__PURE__ */ React.forwardRef<THREE.Group, MergedProps>(function Merged(
    { meshes, children, ...props },
    ref
  ) {
    const isArray = Array.isArray(meshes)
    if (!isArray)
      for (const key of Object.keys(meshes))
        // @ts-expect-error
        if (!meshes[key].isMesh) delete meshes[key]

    const render = (args: any) =>
      isArray
        ? // @ts-expect-error
          children(...args)
        : children(
            // @ts-expect-error
            Object.keys(meshes)
              // @ts-expect-error
              .filter((key) => meshes[key].isMesh)
              .reduce((acc, key, i) => ({ ...acc, [key]: args[i] }), {})
          )

    // @ts-expect-error
    const components = (isArray ? meshes : Object.values(meshes)).map(({ geometry, material }) => (
      <SpritesInstances key={geometry.uuid} geometry={geometry} material={material} {...props} />
    ))

    return <group ref={ref}>{renderRecursive(render, components)}</group>
  })

function renderRecursive(
  render: Function,
  components: Array<React.ReactElement<{ children: any }> | Function>,
  results: unknown[] = []
): React.ReactElement {
  if (!components[0]) return render(results)

  function nextRender(value: any) {
    return renderRecursive(render, components.slice(1), results.concat([value]))
  }

  return typeof components[0] === 'function'
    ? (components[0] as Function)({ results, render: nextRender })
    : React.cloneElement(components[0] as React.ReactElement<{ children: any }>, {
        children: nextRender,
      })
}

// ---------------------------------------------------------------------------
// createSpritesInstances
// ---------------------------------------------------------------------------

export function createSpritesInstances<T = InstanceProps>() {
  const context = React.createContext<Api>(null!)
  return [
    React.forwardRef<THREE.InstancedMesh, SpritesInstancesProps>((props, fref) => (
      <SpritesInstances ref={fref} context={context} {...props} />
    )),
    React.forwardRef<PositionMesh & T, T & InstanceProps>((props, fref) => (
      <Instance ref={fref} context={context} {...props} />
    )),
  ] as const
}

// ---------------------------------------------------------------------------
// InstancedAttribute
// ---------------------------------------------------------------------------

export const InstancedAttribute = React.forwardRef(
  ({ name, defaultValue, normalized, usage = THREE.DynamicDrawUsage }: InstancedAttributeProps, fref) => {
    const ref = React.useRef<THREE.InstancedBufferAttribute>(null!)
    React.useImperativeHandle(fref, () => ref.current, [])
    React.useLayoutEffect(() => {
      const parent = (ref.current as any).__r3f.parent.object
      parent.geometry.attributes[name] = ref.current
      const value = Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      const array = Array.from({ length: parent.userData.limit }, () => value).flat()
      ref.current.array = new Float32Array(array)
      ref.current.itemSize = value.length
      // @ts-expect-error
      ref.current.count = array.length / ref.current.itemSize
      return () => {
        delete parent.geometry.attributes[name]
      }
    }, [name])

    let iterations = 0
    useFrame(() => {
      const parent = (ref.current as any).__r3f.parent.object
      if (parent.userData.frames === Infinity || iterations < parent.userData.frames) {
        for (let i = 0; i < parent.userData.instances.length; i++) {
          const instance = parent.userData.instances[i].current
          const value = instance[name]
          if (value !== undefined) {
            ref.current.set(
              Array.isArray(value)
                ? value
                : typeof value.toArray === 'function'
                  ? value.toArray()
                  : [value],
              i * ref.current.itemSize
            )
            ref.current.needsUpdate = true
          }
        }
        iterations++
      }
    })

    // @ts-expect-error
    return <instancedBufferAttribute ref={ref} usage={usage} normalized={normalized} />
  }
)



