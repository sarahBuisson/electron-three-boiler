import type { Meta, StoryObj } from '@storybook/react-vite'
import { AbstractTableauProssessor } from './TableauProssessor'
import * as THREE from 'three'
import {
    Kase2D,

    Tableau,
    HexagonalTableau,
    hexToOrtho,
    NormalTableau
} from '@electron-three-boiler/model-tableau'
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Color, Euler, Quaternion, Vector3, Object3D } from 'three';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TableauStoryProps {
    width: number
    height: number
}

// ---------------------------------------------------------------------------
// Normal story component
// ---------------------------------------------------------------------------


class StoryTableauProssessor extends AbstractTableauProssessor<Kase2D, Tableau<Kase2D>> {


    computePosition(x: number, y: number): [number, number, number] {
        if (this.tableau instanceof HexagonalTableau) {
            const ortho = hexToOrtho(x, y, 1)
            return [ortho.x, 0, ortho.y]
        }
        return [x, 0, y]
    }

    processCase(kase: Kase2D): void {
        this.contentMap.set(kase.positionKey(),
            <mesh position={this.computePosition(kase.x, kase.y)}>
                <sphereGeometry args={[0.5, 1, 1]}/>
                <meshBasicMaterial color={new Color(0.5 * kase.x, 0.5 * kase.y, 1)}/>
            </mesh>)

    }

    processConnection(kase1: Kase2D, kase2: Kase2D): void {
      let position = this.computePosition((kase1.x + kase2.x * 0.9) / 1.9, (kase1.y + kase2.y * 0.9) / 1.9);
      this.contentMap.set(kase1.positionKey() + kase1.positionKey(),
            <mesh
                position={position}
                rotation={this.calculateLookAtRotation(new Vector3(...position), new Vector3(...this.computePosition(kase2.x,  kase2.y)))}>
                <boxGeometry args={[0.1, 0.1, 1]}/>
                <meshBasicMaterial color={new Color(0.5 * kase1.x, 0.5 * kase1.y, 1)}/>
            </mesh>)

    }

    processCorner(kase: Kase2D, kase1: Kase2D, kase2: Kase2D): void {
      const positionCorner= (this.tableau instanceof HexagonalTableau)?this.calculateAveragePosition([kase,kase1,kase2]):this.calculateAveragePosition([kase2,kase1]);

        this.contentMap.set(kase.positionKey() + kase1.positionKey() + kase2.positionKey(), <mesh
            position={positionCorner}>
            <boxGeometry args={[1, 0.2, 1]}/>
            <meshBasicMaterial color={new Color(0.5 * kase1.x, 0.5 * kase1.y, 1)}/>
        </mesh>)
    }


    calculateAveragePosition(kases: Kase2D[]): [number, number, number] {
        const x = kases.reduce((sum, kase) => sum + kase.x, 0) / kases.length
        const y = kases.reduce((sum, kase) => sum + kase.y, 0) / kases.length
        return [x, 0, y]
    }

    calculateLookAtRotation(positionA: Vector3, positionB: Vector3): Euler {
        // Compute the direction vector from A to B
        const direction = new Vector3().subVectors(positionB, positionA).normalize();

        // Create a default "look-at" vector (negative Z-axis in Three.js)
        const lookAtVector = new Vector3(0, 0, -1);

        // Compute the quaternion to rotate the object
        const quaternion = new Quaternion().setFromUnitVectors(lookAtVector, direction);

        // Convert the quaternion to Euler angles
        const euler = new Euler().setFromQuaternion(quaternion);
        return euler;
    }
}

function NormalPreview(_props: TableauStoryProps) {
    const _tableau = NormalTableau.initialize(_props.width, _props.height, (x, y) => new Kase2D(x, y)) as NormalTableau<Kase2D>
    return Preview(_props, _tableau);
}

// ---------------------------------------------------------------------------
// Hexa story component
// ---------------------------------------------------------------------------


function HexaPreview(_props: TableauStoryProps) {
    const _tableau = HexagonalTableau.initialize(_props.width, _props.height, (x, y) => new Kase2D(x, y)) as HexagonalTableau<Kase2D>
    return Preview(_props, _tableau)
}

function Preview(_props: TableauStoryProps, _tableau: Tableau<Kase2D>) {
    _tableau.allKases().forEach(kase => {
        const neighbors = _tableau.neighbors(kase);
        neighbors[Math.floor(Math.random() * neighbors.length)]?.addConnection(kase)
    })

    const _processor = new StoryTableauProssessor(_tableau)
    _processor.processAll()
    const threeObjects = new Array<Element>();
    _processor.contentMap.forEach((kase, key) =>
        threeObjects.push(<group key={key}>{kase}</group>)
    )
    return <Canvas style={{height: "500px", background: "#0d0d1a"}}><OrbitControls
        target={[_props.width / 2, 1, _props.height / 2]}></OrbitControls>{threeObjects}</Canvas>
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<TableauStoryProps> = {
    title: 'Algorithme/TableauProssessor',
    parameters: {layout: 'fullscreen'},
    argTypes: {
        width: {control: {type: 'range', min: 2, max: 20, step: 1}},
        height: {control: {type: 'range', min: 2, max: 20, step: 1}},
    },
    args: {
        width: 6,
        height: 6,
    },
}

export default meta

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Normal: StoryObj<TableauStoryProps> = {
    render: (args) => <NormalPreview {...args} />,
}

export const Hexa: StoryObj<TableauStoryProps> = {
    render: (args) => <HexaPreview {...args} />,
}

