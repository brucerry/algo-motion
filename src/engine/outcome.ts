import type { SimulationRun } from './types'

export const outcomeLabel: Record<SimulationRun<unknown>['outcome'], string> = {
    success: 'Completed',
    'no-path': 'No path',
    'no-solution': 'No solution',
    limit: 'Iteration limit',
    error: 'Error',
}
