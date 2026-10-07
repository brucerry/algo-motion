import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps, type ProducedStep } from '../../engine/steps'
import { buildBst, type BstState } from './bst'
import { seededUniqueValues } from '../common/seededInputs'
export type TraversalParams = Params & { count: number; seed: number }
export type TraversalState = BstState & { stack: number[]; output: number[] }
export function* traversalSteps(
    params: TraversalParams,
    input?: number[],
): Generator<ProducedStep<TraversalState>, SimulationRun<TraversalState>['outcome']> {
    const nodes = buildBst(input ?? seededUniqueValues(params.count, params.seed, 'bst-keys'))
    const stack: number[] = [],
        output: number[] = [],
        visited: number[] = []
    let current: number | null = nodes.length ? 0 : null,
        index = 0
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<TraversalState> => {
        const step = index++
        return {
            index: step,
            materialize: () => ({
                index: step,
                event,
                explanation,
                activeLines,
                state: {
                    nodes,
                    current,
                    stack: [...stack],
                    output: [...output],
                    visited: [...visited],
                    target: 0,
                    direction: null,
                    found: null,
                    missingParent: null,
                },
                metrics: [
                    { label: 'Visited nodes', value: visited.length },
                    { label: 'Stack depth', value: stack.length },
                    { label: 'Latest key', value: output.at(-1) ?? '—' },
                ],
            }),
        }
    }
    yield record(
        'initialize',
        'Visit each node in left, node, right order using an explicit stack.',
        [1],
    )
    while (current !== null || stack.length) {
        while (current !== null) {
            stack.push(current)
            yield record('push', `Push key ${nodes[current].key}; descend to its left child.`, [2])
            current = nodes[current].left
        }
        current = stack.pop()!
        yield record('pop', `Pop key ${nodes[current].key} after completing its left subtree.`, [3])
        visited.push(current)
        output.push(nodes[current].key)
        yield record(
            'visit',
            `Append key ${nodes[current].key} at output position ${output.length - 1}.`,
            [4],
        )
        current = nodes[current].right
        yield record('right', 'Continue with the right subtree, or return to the stack.', [5])
    }
    yield record(
        'success',
        `Visited all ${nodes.length} nodes once. The output keys are ascending.`,
        [6],
    )
    return 'success'
}
export const runTraversal = (params: TraversalParams, input?: number[]) =>
    collectSteps(traversalSteps(params, input))
export function inspectTraversal(state: TraversalState, selected: string): Metric[] | null {
    const node = state.nodes[Number(selected)]
    if (!node) return null
    const order = state.visited.indexOf(node.id)
    return [
        { label: 'Key', value: node.key },
        { label: 'Depth', value: node.depth },
        { label: 'Visit position', value: order >= 0 ? order : 'Not yet visited' },
        {
            label: 'Stack position',
            value: state.stack.includes(node.id) ? state.stack.indexOf(node.id) : 'Not on stack',
        },
    ]
}
