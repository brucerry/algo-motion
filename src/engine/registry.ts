import type { AlgorithmModule } from './types'
import { astarModule, bfsModule, dfsModule, dijkstraModule } from '../algorithms/grid/modules'
import { rrtModule } from '../algorithms/rrt/module'
import { gradientModule } from '../algorithms/gradient/module'
import { bubbleModule } from '../algorithms/sorting/module'
import { bstModule } from '../algorithms/tree/module'
import { knapsackModule } from '../algorithms/dp/module'
import { queensModule } from '../algorithms/backtracking/module'
import { intervalModule } from '../algorithms/greedy/module'
import { binaryModule, twoSumModule } from '../algorithms/array/modules'
import { insertionModule, quickModule, mergeModule } from '../algorithms/sorting/sortModules'
import { traversalModule } from '../algorithms/tree/traversalModule'
import { coinModule } from '../algorithms/dp/coinModule'
import { sudokuModule } from '../algorithms/backtracking/sudokuModule'
import { rrtStarModule } from '../algorithms/rrt/starModule'

export type RegisteredAlgorithm = AlgorithmModule<any>
export const algorithms: RegisteredAlgorithm[] = [
    bfsModule,
    dijkstraModule,
    astarModule,
    dfsModule,
    rrtModule,
    gradientModule,
    bubbleModule,
    bstModule,
    knapsackModule,
    queensModule,
    intervalModule,
    binaryModule,
    twoSumModule,
    insertionModule,
    quickModule,
    mergeModule,
    traversalModule,
    coinModule,
    sudokuModule,
    rrtStarModule,
]
export const algorithmById = (id: string | null | undefined): RegisteredAlgorithm | undefined =>
    algorithms.find((algorithm) => algorithm.meta.id === id)

const compareLabels = (left: string, right: string) =>
    left.localeCompare(right, 'en', { sensitivity: 'base' })

export const categories = [...new Set(algorithms.map((algorithm) => algorithm.meta.category))].sort(
    compareLabels,
)
export const algorithmsInCategory = (category: string): RegisteredAlgorithm[] =>
    algorithms
        .filter((algorithm) => algorithm.meta.category === category)
        .sort((left, right) => compareLabels(left.meta.shortName, right.meta.shortName))
