import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededValues } from '../common/seededInputs'

export type BubbleParams = Params & { count: number; seed: number }
export type SortItem = { id: number; value: number }
export type BubbleState = {
    items: SortItem[]
    pair: [number, number] | null
    pass: number
    sortedFrom: number
    comparisons: number
    swaps: number
}

export function runBubble(params: BubbleParams, input?: number[]): SimulationRun<BubbleState> {
    const values = input ?? seededValues(params.count, params.seed, 'bubble-values', 1, 18)
    if (values.length > 140) throw new Error('Array exceeds safe limits.')
    let items = values.map((value, id) => ({ id, value }))
    const frames: Frame<BubbleState>[] = []
    let pair: [number, number] | null = null
    let pass = 0
    let sortedFrom = items.length
    let comparisons = 0
    let swaps = 0
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: BubbleState = {
            items,
            pair: pair && [...pair],
            pass,
            sortedFrom,
            comparisons,
            swaps,
        }
        const metrics: Metric[] = [
            { label: 'Pass', value: pass },
            { label: 'Comparisons', value: comparisons },
            { label: 'Swaps', value: swaps },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record('initialize', 'Compare adjacent items and move larger values right.', [1])
    for (pass = 1; pass < items.length; pass++) {
        let changed = false
        for (let index = 0; index < items.length - pass; index++) {
            pair = [index, index + 1]
            comparisons++
            record(
                'compare',
                `Compare ${items[index].value} and ${items[index + 1].value}.`,
                [2, 3],
            )
            if (items[index].value > items[index + 1].value) {
                items = [...items]
                ;[items[index], items[index + 1]] = [items[index + 1], items[index]]
                swaps++
                changed = true
                record('swap', 'The left value is larger, so swap this adjacent pair.', [4])
            }
        }
        pair = null
        sortedFrom = items.length - pass
        record('pass', `Pass ${pass} is complete; the rightmost unsorted item is now fixed.`, [5])
        if (!changed) {
            sortedFrom = 0
            record(
                'early-stop',
                'No swaps occurred in this pass, so the array is already sorted.',
                [6],
            )
            break
        }
    }
    pair = null
    sortedFrom = 0
    record(
        'success',
        'All values are in ascending order. Equal values kept their original order.',
        [7],
    )
    return { frames, outcome: 'success' }
}

export function inspectBubble(state: BubbleState, selected: string): Metric[] | null {
    const item = state.items.find((entry) => String(entry.id) === selected)
    if (!item) return null
    const index = state.items.indexOf(item)
    return [
        { label: 'Value', value: item.value },
        { label: 'Original position', value: item.id },
        { label: 'Current position', value: index },
        {
            label: 'State',
            value: state.pair?.includes(index)
                ? 'Comparing'
                : index >= state.sortedFrom
                  ? 'Sorted'
                  : 'Waiting',
        },
    ]
}
