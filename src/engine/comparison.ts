import { algorithmById, algorithmsInCategory, type RegisteredAlgorithm } from './registry'
import { validateParameters } from './parameters'
import type { Frame, Metric, ParameterDefinition, Params } from './types'
import type { GridEnvironment } from '../algorithms/grid/grid'
import { seededValues } from '../algorithms/common/seededInputs'

const graphSharedKeys = ['width', 'depth', 'density', 'diagonal', 'seed', 'weightMode']
const arraySharedKeys = ['count', 'seed']

export function comparisonMembers(category: string): RegisteredAlgorithm[] {
    const members = algorithmsInCategory(category)
    return members.length > 1 ? members : []
}

export function comparisonSharedDefinitions(category: string): ParameterDefinition[] {
    const keys =
        category === 'Graph Search'
            ? graphSharedKeys
            : category === 'Array Techniques'
              ? arraySharedKeys
              : []
    if (!keys.length) return []
    const members = comparisonMembers(category)
    return keys.map((key) => {
        const definition = members
            .flatMap((member) => member.parameters)
            .find((item) => item.key === key)
        if (!definition) throw new Error(`Missing shared comparison parameter: ${key}`)
        return definition
    })
}

export function initialComparisonSettings(
    category: string,
    activeId: string,
    activeParams: Params,
    saved: Record<string, Params> = {},
): { shared: Params; individual: Record<string, Params> } {
    const members = comparisonMembers(category)
    const definitions = comparisonSharedDefinitions(category)
    const sharedRaw: Params = {}
    for (const definition of definitions) {
        const preferred = activeParams[definition.key]
        const fallback = saved['dijkstra']?.[definition.key]
        sharedRaw[definition.key] = preferred ?? fallback ?? definition.defaultValue
    }
    const shared = validateParameters(definitions, sharedRaw).params
    const individual = Object.fromEntries(
        members.map((member) => {
            const raw = member.meta.id === activeId ? activeParams : (saved[member.meta.id] ?? {})
            return [
                member.meta.id,
                validateParameters(member.parameters, { ...raw, ...shared }).params,
            ]
        }),
    )
    return { shared, individual }
}

export function effectiveComparisonParams(
    module: RegisteredAlgorithm,
    shared: Params,
    individual: Params,
): Params {
    return {
        ...validateParameters(module.parameters, { ...individual, ...shared }).params,
        ...shared,
    }
}

export function comparisonSpecificDefinitions(
    module: RegisteredAlgorithm,
    category: string,
): ParameterDefinition[] {
    const shared = new Set(
        comparisonSharedDefinitions(category).map((definition) => definition.key),
    )
    return module.parameters.filter((definition) => !shared.has(definition.key))
}

export function sharedSortedArray(shared: Params): number[] {
    const count = Number(shared.count)
    return seededValues(
        count,
        Number(shared.seed),
        'array-comparison',
        1,
        Math.max(20, count * 2),
    ).sort((left, right) => left - right)
}

export function comparisonInputLabel(id: string, params: Params): string {
    const module = algorithmById(id)
    if (!module) return 'Unknown input'
    switch (module.meta.category) {
        case 'Graph Search':
            return `${params.width}×${params.depth} ${params.weightMode === 'terrain' ? 'weighted' : 'uniform'} grid`
        case 'Array Techniques':
            return `Sorted array of ${params.count}; ${id === 'binary-search' ? 'target value' : 'target sum'} ${params.target}`
        case 'Optimization':
            return id === 'gradient-descent'
                ? `${params.objective} surface; learning rate ${params.learningRate}`
                : `${params.count} scheduling activities; seed ${params.seed}`
        default:
            return module.meta.name
    }
}

function routeCost(path: number[], environment: GridEnvironment): number {
    return path.slice(1).reduce((sum, cell, index) => {
        const previous = path[index]
        const diagonal =
            cell % environment.width !== previous % environment.width &&
            Math.floor(cell / environment.width) !== Math.floor(previous / environment.width)
        return sum + environment.weights[cell] * (diagonal ? Math.SQRT2 : 1)
    }, 0)
}

export function comparisonSummary(id: string, frame: Frame<any> | null): Metric[] {
    if (!frame) return []
    const state = frame.state
    if (['astar', 'bfs', 'dfs', 'dijkstra'].includes(id)) {
        const path: number[] = state.path
        return [
            { label: 'Visited', value: state.visited.length },
            { label: 'Hops', value: path.length ? path.length - 1 : '—' },
            {
                label: id === 'bfs' ? 'Hop distance' : id === 'dfs' ? 'First route' : 'Path cost',
                value: path.length
                    ? id === 'bfs' || id === 'dfs'
                        ? path.length - 1
                        : +routeCost(path, state.environment).toFixed(2)
                    : '—',
            },
        ]
    }
    if (id === 'binary-search')
        return [
            { label: 'Comparisons', value: state.comparisons },
            { label: 'Found index', value: state.found ?? '—' },
        ]
    if (id === 'sorted-two-sum')
        return [
            { label: 'Comparisons', value: state.comparisons },
            { label: 'Pair indices', value: state.pair ? state.pair.join(', ') : '—' },
        ]
    if (id === 'gradient-descent')
        return [
            { label: 'Iteration', value: state.iteration },
            { label: 'Objective value', value: +state.current.value.toFixed(4) },
        ]
    if (id === 'interval-scheduling')
        return [
            { label: 'Accepted activities', value: state.accepted.length },
            { label: 'Considered', value: state.accepted.length + state.rejected.length },
        ]
    return frame.metrics.slice(0, 2)
}
