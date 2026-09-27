import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededValues } from '../common/seededInputs'
import type { ArrayVisualItem } from '../common/ArrayItems'

export type BinaryParams = Params & { count: number; target: number; seed: number }
export type BinaryState = {
    items: ArrayVisualItem[]
    target: number
    low: number
    mid: number | null
    high: number
    found: number | null
    comparisons: number
}

export function runBinary(params: BinaryParams, input?: number[]): SimulationRun<BinaryState> {
    const values = input
        ? [...input]
        : seededValues(
              params.count,
              params.seed,
              'array-binary',
              1,
              Math.max(20, params.count * 2),
          ).sort((a, b) => a - b)
    if (
        values.length > 160 ||
        values.some((value, index) => index > 0 && value < values[index - 1])
    )
        throw new Error('Binary search requires a bounded ascending array.')
    const items = values.map((value, id) => ({ id, value }))
    const frames: Frame<BinaryState>[] = []
    let low = 0,
        high = items.length - 1,
        mid: number | null = null,
        found: number | null = null,
        comparisons = 0
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: BinaryState = {
            items,
            target: params.target,
            low,
            mid,
            high,
            found,
            comparisons,
        }
        const metrics: Metric[] = [
            { label: 'Low', value: low },
            { label: 'High', value: high },
            { label: 'Comparisons', value: comparisons },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record(
        'initialize',
        `Find the first occurrence of ${params.target} in an ascending array.`,
        [1],
    )
    while (low <= high) {
        mid = Math.floor((low + high) / 2)
        comparisons++
        record(
            'compare',
            `Compare middle value ${items[mid].value} at index ${mid} with ${params.target}.`,
            [2],
        )
        if (items[mid].value >= params.target) {
            if (items[mid].value === params.target) found = mid
            high = mid - 1
            record(
                'discard-right',
                `The first match cannot lie to the right of index ${mid}; keep searching left.`,
                [3],
            )
        } else {
            low = mid + 1
            record(
                'discard-left',
                `Values through index ${mid} are too small; discard that range.`,
                [4],
            )
        }
    }
    mid = null
    record(
        found === null ? 'no-solution' : 'success',
        found === null
            ? `Target ${params.target} is absent; the search range is empty.`
            : `The first ${params.target} is at index ${found}.`,
        [5],
    )
    return { frames, outcome: found === null ? 'no-solution' : 'success' }
}

export function inspectBinary(state: BinaryState, selected: string): Metric[] | null {
    const index = Number(selected)
    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) return null
    return [
        { label: 'Index', value: index },
        { label: 'Value', value: state.items[index].value },
        {
            label: 'State',
            value:
                state.found === index
                    ? 'Matching candidate'
                    : index === state.mid
                      ? 'Middle'
                      : index < state.low || index > state.high
                        ? 'Discarded'
                        : 'In range',
        },
    ]
}
