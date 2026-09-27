import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededUniqueValues } from '../common/seededInputs'

export type BstParams = Params & { count: number; seed: number; target: number }
export type TreeNode = {
    id: number
    key: number
    left: number | null
    right: number | null
    depth: number
    x: number
}
export type BstState = {
    nodes: TreeNode[]
    current: number | null
    visited: number[]
    target: number
    direction: 'left' | 'right' | null
    found: number | null
    missingParent: number | null
}

export function buildBst(values: number[]): TreeNode[] {
    if (values.length > 120 || new Set(values).size !== values.length)
        throw new Error('Tree keys must be distinct and bounded.')
    const nodes: TreeNode[] = []
    for (const key of values) {
        const id = nodes.length
        if (!id) {
            nodes.push({ id, key, left: null, right: null, depth: 0, x: 0 })
            continue
        }
        let cursor = 0
        while (true) {
            const parent = nodes[cursor]
            const side = key < parent.key ? 'left' : 'right'
            if (parent[side] === null) {
                parent[side] = id
                nodes.push({ id, key, left: null, right: null, depth: parent.depth + 1, x: 0 })
                break
            }
            cursor = parent[side]!
        }
    }
    let rank = 0
    const assign = (id: number | null) => {
        if (id === null) return
        assign(nodes[id].left)
        nodes[id].x = rank++
        assign(nodes[id].right)
    }
    assign(nodes.length ? 0 : null)
    nodes.forEach((node) => {
        node.x -= (nodes.length - 1) / 2
    })
    return nodes
}

export function runBst(params: BstParams, input?: number[]): SimulationRun<BstState> {
    const nodes = buildBst(input ?? seededUniqueValues(params.count, params.seed, 'bst-keys'))
    const frames: Frame<BstState>[] = []
    const visited: number[] = []
    let current: number | null = null
    let direction: BstState['direction'] = null
    let found: number | null = null
    let missingParent: number | null = null
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: BstState = {
            nodes,
            current,
            visited: [...visited],
            target: params.target,
            direction,
            found,
            missingParent,
        }
        const metrics: Metric[] = [
            { label: 'Visited nodes', value: visited.length },
            { label: 'Target', value: params.target },
            { label: 'Direction', value: direction ?? '—' },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record('initialize', `Search for ${params.target} starting at the root.`, [1])
    let cursor: number | null = nodes.length ? 0 : null
    while (cursor !== null) {
        current = cursor
        visited.push(cursor)
        const node: TreeNode = nodes[cursor]
        direction = null
        record('compare', `Compare ${params.target} with node ${node.key}.`, [2])
        if (params.target === node.key) {
            found = cursor
            record('success', `Found ${params.target} at this node.`, [3])
            return { frames, outcome: 'success' }
        }
        direction = params.target < node.key ? 'left' : 'right'
        record(
            'branch',
            `${params.target} is ${direction === 'left' ? 'smaller' : 'larger'} than ${node.key}; follow the ${direction} child.`,
            [4],
        )
        missingParent = cursor
        cursor = node[direction]
    }
    current = null
    record('no-solution', `${params.target} is absent; the chosen branch has no child.`, [5])
    return { frames, outcome: 'no-solution' }
}

export function inspectBst(state: BstState, selected: string): Metric[] | null {
    const node = state.nodes.find((item) => String(item.id) === selected)
    if (!node) return null
    return [
        { label: 'Key', value: node.key },
        { label: 'Depth', value: node.depth },
        { label: 'Left child', value: node.left === null ? 'None' : state.nodes[node.left].key },
        { label: 'Right child', value: node.right === null ? 'None' : state.nodes[node.right].key },
        {
            label: 'State',
            value:
                state.found === node.id
                    ? 'Found'
                    : state.current === node.id
                      ? 'Current'
                      : state.visited.includes(node.id)
                        ? 'Visited'
                        : 'Unvisited',
        },
    ]
}
