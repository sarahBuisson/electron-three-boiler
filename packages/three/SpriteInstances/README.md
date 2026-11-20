# @electron-three-boiler/sprite-instances

Copie locale de `@react-three/drei` `Instances` — permet l'instanciation performante de meshes Three.js via React Three Fiber, sans dépendance à `@react-three/drei`.

## Installation

```bash
npm install github:username/electron-three-boiler#@electron-three-boiler/sprite-instances@0.1.0
```

## Usage

```typescript
import { Instances, Instance, createInstances, Merged, InstancedAttribute } from '@electron-three-boiler/sprite-instances'
```

### Instances + Instance (basique)

```tsx
<Instances geometry={sphereGeometry} material={material} limit={1000}>
  {Array.from({ length: 500 }, (_, i) => (
    <Instance key={i} position={[i * 0.1, 0, 0]} />
  ))}
</Instances>
```

### createInstances (recommandé — contexte isolé)

```tsx
const [Spheres, Sphere] = createInstances()

<Spheres geometry={sphereGeometry} material={material}>
  <Sphere position={[0, 0, 0]} color="red" />
  <Sphere position={[1, 0, 0]} color="blue" />
</Spheres>
```

### InstancedAttribute (attributs personnalisés)

```tsx
<Instances>
  <InstancedAttribute name="aCustom" defaultValue={0} />
  <Instance aCustom={1.5} />
</Instances>
```

## Source

Basé sur [pmndrs/drei SpriteInstances.tsx](https://github.com/pmndrs/drei/blob/master/src/core/Instances.tsx).
Modifications: suppression des helpers internes drei, implémentations locales de `ForwardRefComponent` et `setUpdateRange`.

