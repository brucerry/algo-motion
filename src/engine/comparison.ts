import { algorithmById, algorithmsInCategory, type RegisteredAlgorithm } from './registry'
import { validateParameters } from './parameters'
import type { Frame, Metric, ParameterDefinition, Params } from './types'
import type { GridEnvironment } from '../algorithms/grid/grid'
import { seededValues } from '../algorithms/common/seededInputs'

const graphSharedKeys = ['width', 'depth', 'density', 'diagonal', 'seed', 'weightMode']
const arraySharedKeys = ['count', 'seed']
const topicSharedKeys: Record<string, string[]> = {
    'Graph Search': graphSharedKeys,
    'Array Techniques': arraySharedKeys,
    Sorting: ['count', 'seed'],
    Trees: ['count', 'seed'],
    'Motion Planning': ['workspace', 'obstacleCount', 'obstacleMin', 'obstacleMax', 'seed'],
}

export function comparisonMembers(category: string): RegisteredAlgorithm[] {
    const members = algorithmsInCategory(category)
    return members.length > 1 ? members : []
}

export function comparisonSharedDefinitions(category: string): ParameterDefinition[] {
    const keys = topicSharedKeys[category] ?? []
    if (!keys.length) return []
    const members = comparisonMembers(category)
    return keys.map((key) => {
        const definition = members
            .flatMap((member) => member.parameters)
            .find((item) => item.key === key)
        if (!definition) throw new Error(`Missing shared comparison parameter: ${key}`)
        if (definition.type === 'number') {
            const supported = members
                .flatMap((member) => member.parameters)
                .filter(
                    (item): item is Extract<ParameterDefinition, { type: 'number' }> =>
                        item.key === key && item.type === 'number',
                )
            return {
                ...definition,
                min: Math.max(...supported.map((item) => item.min)),
                max: Math.min(...supported.map((item) => item.max)),
                bounds: (params) => ({
                    min: Math.max(
                        ...supported.map((item) => item.bounds?.(params).min ?? item.min),
                    ),
                    max: Math.min(
                        ...supported.map((item) => item.bounds?.(params).max ?? item.max),
                    ),
                }),
            }
        }
        return definition
    })
}

export function initialComparisonSettings(
    category: string,
    activeId: string,
    activeParams: Params,
    saved: Record<string, Params> = {},
): { shared: Params; individual: Record<string, Params>; notice: string } {
    const members = comparisonMembers(category)
    const definitions = comparisonSharedDefinitions(category)
    const sharedRaw: Params = {}
    const notices: string[] = []
    for (const definition of definitions) {
        const preferred = activeParams[definition.key]
        const fallback = saved['dijkstra']?.[definition.key]
        sharedRaw[definition.key] = preferred ?? fallback ?? definition.defaultValue
        if (definition.type === 'number') {
            const value = Number(sharedRaw[definition.key])
            const clamped = Math.max(definition.min, Math.min(definition.max, value))
            if (Number.isFinite(value) && clamped !== value) {
                sharedRaw[definition.key] = clamped
                notices.push(
                    `${definition.label} adjusted to ${clamped} for comparison (common range ${definition.min} to ${definition.max}).`,
                )
            }
        }
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
    return { shared, individual, notice: notices.join(' ') }
}

export function effectiveComparisonParams(
    module: RegisteredAlgorithm,
    shared: Params,
    individual: Params,
): Params {
    return {
        ...shared,
        ...validateParameters(module.parameters, { ...individual, ...shared }).params,
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
        case 'Sorting':
            return `Same seeded array of ${params.count} values; seed ${params.seed}`
        case 'Trees':
            return `Same BST of ${params.count} keys; ${id === 'bst-search' ? `search target ${params.target}` : 'in-order visit of every key'}`
        case 'Motion Planning':
            return `Same ${params.workspace}³ workspace, ${params.obstacleCount} obstacles; ${params.maxIterations} iterations`
        case 'Dynamic Programming':
            return id === 'coin-change'
                ? `Minimum coins for amount ${params.amount}; denominations ${params.coin1}, ${params.coin2}, ${params.coin3}`
                : `0/1 Knapsack with ${params.count} items and capacity ${params.capacity}`
        case 'Backtracking':
            if (id === 'rubiks-cube')
                return `3×3 Rubik’s Cube; ${params.scrambleLength} scramble moves; seed ${params.seed}`
            return id === 'sudoku'
                ? `9×9 Sudoku; ${params.puzzle === 'unsatisfiable' ? 'unsatisfiable puzzle' : `${params.clueCount} seeded clues`}`
                : `${params.size}×${params.size} N-Queens board`
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
    if (id === 'rubiks-cube')
        return [
            { label: 'Solution moves applied', value: state.applied },
            { label: 'Phase', value: state.phase },
        ]
    if (['bubble-sort', 'insertion-sort', 'quick-sort', 'merge-sort'].includes(id))
        return [
            { label: 'Comparisons', value: state.comparisons },
            { label: 'Moves', value: id === 'bubble-sort' ? state.swaps * 2 : state.moves },
        ]
    if (id === 'bst-search' || id === 'inorder-traversal')
        return [
            { label: 'Visited nodes', value: state.visited.length },
            {
                label: id === 'bst-search' ? 'Found key' : 'Output keys',
                value:
                    id === 'bst-search'
                        ? state.found === null
                            ? '—'
                            : state.nodes[state.found].key
                        : state.output.length,
            },
        ]
    if (id === 'rrt' || id === 'rrt-star')
        return [
            { label: 'Iteration', value: state.iteration },
            {
                label: id === 'rrt' ? 'First route cost' : 'Best route cost',
                value: state.path.length ? +state.nodes[state.path.at(-1)!].cost.toFixed(3) : '—',
            },
        ]
    if (id === 'coin-change')
        return [
            {
                label: 'Minimum coins',
                value: Number.isFinite(state.table[state.amount])
                    ? state.table[state.amount]
                    : 'Unreachable',
            },
            { label: 'Chosen coins', value: state.chosen.length },
        ]
    if (id === 'sudoku')
        return [
            { label: 'Candidates tried', value: state.attempts },
            { label: 'Backtracks', value: state.backtracks },
        ]
    if (id === 'n-queens')
        return [
            { label: 'Candidates tried', value: state.attempts },
            { label: 'Backtracks', value: state.backtracks },
        ]
    if (id === 'knapsack')
        return [
            { label: 'Best value', value: state.table.at(-1)?.[state.capacity] ?? 'Pending' },
            { label: 'Chosen items', value: state.selected.length },
        ]
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

export function comparisonExplanation(category: string, shared: Params): string {
    switch (category) {
        case 'Graph Search':
            return shared.weightMode === 'terrain'
                ? 'BFS optimizes hop count; Dijkstra minimizes weighted terrain cost. DFS returns its first route. Browser timing is not a benchmark.'
                : 'On a uniform grid without diagonals, Dijkstra and BFS can find the same minimum-hop route. DFS returns its first route. Browser timing is not a benchmark.'
        case 'Array Techniques':
            return 'Both methods use the same sorted array. Target value and target sum ask different questions.'
        case 'Sorting':
            return 'All four sorts start with the same values. Comparisons count value checks; moves reflect each strategy’s item shifts or writes. Quick Sort is not stable.'
        case 'Trees':
            return 'Both methods use the same BST. Search follows one path; traversal visits every key. Their visited-node counts answer different questions.'
        case 'Motion Planning':
            return 'Both planners use the same obstacles, start, goal, and seed. RRT stops at its first route; RRT* keeps improving until its iteration budget. A finite run does not guarantee global optimality.'
        case 'Dynamic Programming':
            return 'Knapsack maximizes value with each item used once; Coin Change minimizes reusable coins for an exact amount. Their results are not directly comparable.'
        case 'Backtracking':
            return 'N-Queens, Sudoku, and Rubik’s Cube solve separate problems. Candidates, reversals, and cube solution moves have different meanings; their counts are not directly comparable. Shared steps are replay positions.'
        default:
            return 'These algorithms solve different optimization problems. Their objective values and schedule sizes are not directly comparable.'
    }
}
