import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededValues } from '../common/seededInputs'
import type { ArrayVisualItem } from '../common/ArrayItems'

export type TwoSumParams = Params & { count: number; target: number; seed: number }
export type TwoSumState = {
    items: ArrayVisualItem[]
    target: number
    left: number
    right: number
    sum: number | null
    pair: [number, number] | null
    comparisons: number
}

export function runTwoSum(params: TwoSumParams, input?: number[]): SimulationRun<TwoSumState> {
    const values = input
        ? [...input]
        : seededValues(
              params.count,
              params.seed,
              'array-two-sum',
              1,
              Math.max(20, params.count * 2),
          ).sort((a, b) => a - b)
    if (
        values.length > 160 ||
        values.some((value, index) => index > 0 && value < values[index - 1])
    )
        throw new Error('Two-sum requires a bounded ascending array.')
    const items = values.map((value, id) => ({ id, value }))
    const frames: Frame<TwoSumState>[] = []
    let left = 0,
        right = items.length - 1,
        sum: number | null = null,
        pair: [number, number] | null = null,
        comparisons = 0
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: TwoSumState = {
            items,
            target: params.target,
            left,
            right,
            sum,
            pair: pair && [pair[0], pair[1]],
            comparisons,
        }
        const metrics: Metric[] = [
            { label: 'Left', value: left },
            { label: 'Right', value: right },
            { label: 'Current sum', value: sum ?? '—' },
            { label: 'Comparisons', value: comparisons },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record('initialize', `Find two distinct values whose sum is ${params.target}.`, [1])
    while (left < right) {
        sum = items[left].value + items[right].value
        comparisons++
        record(
            'compare',
            `${items[left].value} + ${items[right].value} = ${sum}; target is ${params.target}.`,
            [2],
        )
        if (sum === params.target) {
            pair = [left, right]
            record(
                'success',
                `Indices ${left} and ${right} have distinct positions and sum to ${params.target}.`,
                [3],
            )
            return { frames, outcome: 'success' }
        }
        if (sum < params.target) {
            left++
            record(
                'move-left',
                'The sum is too small; move the left pointer to a larger value.',
                [4],
            )
        } else {
            right--
            record(
                'move-right',
                'The sum is too large; move the right pointer to a smaller value.',
                [5],
            )
        }
    }
    sum = null
    record(
        'no-solution',
        'The pointers have met or crossed. No two distinct indices make the target sum.',
        [6],
    )
    return { frames, outcome: 'no-solution' }
}

export function inspectTwoSum(state: TwoSumState, selected: string): Metric[] | null {
    const index = Number(selected)
    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) return null
    return [
        { label: 'Index', value: index },
        { label: 'Value', value: state.items[index].value },
        {
            label: 'State',
            value: state.pair?.includes(index)
                ? 'Matching pair'
                : index === state.left
                  ? 'Left pointer'
                  : index === state.right
                    ? 'Right pointer'
                    : index < state.left || index > state.right
                      ? 'Passed'
                      : 'Between pointers',
        },
    ]
}
