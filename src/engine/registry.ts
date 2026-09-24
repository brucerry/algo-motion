import type { AlgorithmModule } from './types'
import { astarModule, bfsModule, dijkstraModule } from '../algorithms/grid/modules'
import { rrtModule } from '../algorithms/rrt/module'
import { gradientModule } from '../algorithms/gradient/module'

export type RegisteredAlgorithm = AlgorithmModule<any>
export const algorithms: RegisteredAlgorithm[] = [
    bfsModule,
    dijkstraModule,
    astarModule,
    rrtModule,
    gradientModule,
]
export const algorithmById = (id: string | null | undefined): RegisteredAlgorithm | undefined =>
    algorithms.find((algorithm) => algorithm.meta.id === id)

export const categories = [...new Set(algorithms.map((algorithm) => algorithm.meta.category))]
