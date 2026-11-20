
import * as THREE from 'three'
import { type Kase,Tableau, HexagonalTableau, hexToOrtho } from '@electron-three-boiler/model-tableau'
import { Object3D } from 'three/src/core/Object3D';

export abstract class AbstractTableauProssessor<K extends Kase, T extends Tableau<K>> {

    public  contentMap = new Map<string,Object3D>();
    constructor(public tableau: T) {


    }

   public processAll() {
        this.tableau.allKases().forEach(kase => this.processCase(kase));
        this.tableau.allKases().forEach(kase1 => kase1.connections.forEach(connKey => {

            const kase2 = this.tableau.neighborAt2(kase1, connKey);
            if (kase2) this.processConnection(kase1, kase2);

            const neighs = this.tableau.neighbors(kase1)

            for (let i = 0; i < neighs.length - 1; i++) {
                if (neighs[i].connections.includes(neighs[i + 1].positionKey())) {
                    this.processCorner(kase1, neighs[i], neighs[i + 1]);
                }
            }
        }));
    }

    abstract processCase(kase: K): void

    abstract processConnection(kase1: K, kase2: K): void;

    abstract processCorner(kase: K, kase1: K, kase2: K): void;
}

export class DefaultTableauProssessor extends AbstractTableauProssessor<Kase, Tableau<Kase>> {
    processCase(kase: Kase): void {

    }
    processConnection(kase1: Kase, kase2: Kase): void {

    }
    processCorner(kase: Kase, kase1: Kase, kase2: Kase): void {

    }
}
