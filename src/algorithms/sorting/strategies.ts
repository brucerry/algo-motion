import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps, type ProducedStep } from '../../engine/steps'
import { seededValues } from '../common/seededInputs'
import type { SortItem } from './bubble'

export type SortKind = 'insertion-sort' | 'quick-sort' | 'merge-sort'
export type SortParams = Params & { count: number; seed: number }
export type SortState = {
    items: SortItem[]
    active: number[]
    completed: number[]
    range: [number, number] | null
    pivot: number | null
    boundary: number | null
    lifted: number | null
    buffer: SortItem[]
    comparisons: number
    moves: number
}
export const sortingValues = (params: SortParams) =>
    seededValues(params.count, params.seed, 'bubble-values', 1, 18)

export function* sortSteps(
    kind: SortKind,
    params: SortParams,
    input?: number[],
): Generator<ProducedStep<SortState>, SimulationRun<SortState>['outcome']> {
    const values = input ?? sortingValues(params)
    if (values.length > 140 || values.some((value) => !Number.isFinite(value)))
        throw new Error('Sorting requires at most 140 finite values.')
    const items = values.map((value, id) => ({ id, value }))
    let active: number[] = [],
        completed: number[] = [],
        range: SortState['range'] = null
    let pivot: number | null = null,
        boundary: number | null = null,
        lifted: number | null = null
    let buffer: SortItem[] = [],
        comparisons = 0,
        moves = 0,
        index = 0
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<SortState> => {
        const step = index++
        return {
            index: step,
            materialize: () => ({
                index: step,
                event,
                explanation,
                activeLines,
                state: {
                    items: [...items],
                    active: [...active],
                    completed: [...completed],
                    range: range && [...range],
                    pivot,
                    boundary,
                    lifted,
                    buffer: [...buffer],
                    comparisons,
                    moves,
                },
                metrics: [
                    { label: 'Comparisons', value: comparisons },
                    { label: 'Moves', value: moves },
                ],
            }),
        }
    }
    yield record(
        'initialize',
        'Sort the seeded array in ascending order; item identity is preserved.',
        [1],
    )
    if (kind === 'insertion-sort') {
        completed = items.length ? [0] : []
        for (let at = 1; at < items.length; at++) {
            const key = items[at]
            lifted = key.id
            range = [0, at]
            let position = at
            active = [at]
            yield record('lift', `Lift key ${key.value} from index ${at}.`, [2])
            while (position > 0) {
                active = [position - 1, position]
                comparisons++
                yield record(
                    'compare',
                    `Compare ${items[position - 1].value} with lifted key ${key.value}.`,
                    [3],
                )
                if (items[position - 1].value <= key.value) break
                items.splice(position, 1)
                items.splice(position - 1, 0, key)
                position--
                moves++
                yield record(
                    'shift',
                    'Shift the larger neighbor right while carrying the lifted key left.',
                    [4],
                )
            }
            lifted = null
            moves++
            active = [position]
            completed = Array.from({ length: at + 1 }, (_, i) => i)
            yield record(
                'insert',
                `Insert ${key.value} at index ${position}; the prefix is sorted.`,
                [5],
            )
        }
    } else if (kind === 'quick-sort') {
        const stack: [number, number][] = items.length ? [[0, items.length - 1]] : []
        while (stack.length) {
            const [low, high] = stack.pop()!
            if (low > high) continue
            if (low === high) {
                completed.push(low)
                continue
            }
            range = [low, high]
            pivot = high
            boundary = low
            active = [high]
            yield record(
                'pivot',
                `Partition indices ${low}–${high} around pivot ${items[high].value}.`,
                [2],
            )
            for (let cursor = low; cursor < high; cursor++) {
                active = [cursor, high]
                comparisons++
                yield record(
                    'compare',
                    `Compare ${items[cursor].value} with pivot ${items[high].value}.`,
                    [3],
                )
                if (items[cursor].value <= items[high].value) {
                    if (boundary !== cursor) {
                        ;[items[boundary], items[cursor]] = [items[cursor], items[boundary]]
                        moves += 2
                        active = [boundary, cursor]
                        yield record(
                            'swap',
                            'Move this value into the partition at or below the pivot.',
                            [4],
                        )
                    }
                    boundary++
                }
            }
            if (boundary !== high) {
                ;[items[boundary], items[high]] = [items[high], items[boundary]]
                moves += 2
            }
            pivot = boundary
            active = [boundary]
            completed.push(boundary)
            yield record(
                'partition',
                `Pivot is fixed at index ${boundary}; sort both remaining ranges.`,
                [5],
            )
            stack.push([boundary + 1, high], [low, boundary - 1])
        }
    } else {
        function* merge(low: number, high: number): Generator<ProducedStep<SortState>, void> {
            if (low >= high) return
            const middle = Math.floor((low + high) / 2)
            range = [low, high]
            active = [low, middle, high]
            yield record(
                'split',
                `Split ${low}–${high} into ${low}–${middle} and ${middle + 1}–${high}.`,
                [2],
            )
            yield* merge(low, middle)
            yield* merge(middle + 1, high)
            range = [low, high]
            buffer = []
            let left = low,
                right = middle + 1
            while (left <= middle || right <= high) {
                active = [left <= middle ? left : -1, right <= high ? right : -1].filter(
                    (i) => i >= 0,
                )
                if (left <= middle && right <= high) {
                    comparisons++
                    yield record('compare', 'Compare the heads of the two sorted halves.', [3])
                }
                if (right > high || (left <= middle && items[left].value <= items[right].value))
                    buffer.push(items[left++])
                else buffer.push(items[right++])
                moves++
                yield record(
                    'buffer',
                    `Append ${buffer.at(-1)!.value} to the merge buffer; choose the left item on ties.`,
                    [4],
                )
            }
            items.splice(low, high - low + 1, ...buffer)
            moves += buffer.length
            active = Array.from({ length: high - low + 1 }, (_, i) => low + i)
            yield record('merge', `Copy the sorted buffer back to indices ${low}–${high}.`, [5])
            buffer = []
        }
        yield* merge(0, items.length - 1)
    }
    active = []
    range = null
    pivot = null
    boundary = null
    lifted = null
    buffer = []
    completed = items.map((_, i) => i)
    yield record(
        'success',
        `All ${items.length} values are sorted. ${kind === 'quick-sort' ? 'Quick Sort is not stable: equal items can change relative order.' : 'Equal values kept their original relative order.'}`,
        [6],
    )
    return 'success'
}
export const runSort = (kind: SortKind, params: SortParams, input?: number[]) =>
    collectSteps(sortSteps(kind, params, input))
export function inspectSort(state: SortState, selected: string): Metric[] | null {
    const position = state.items.findIndex((item) => String(item.id) === selected)
    if (position < 0) return null
    const item = state.items[position]
    return [
        { label: 'Value', value: item.value },
        { label: 'Original position', value: item.id },
        { label: 'Current position', value: position },
        {
            label: 'State',
            value:
                state.lifted === item.id
                    ? 'Lifted key'
                    : position === state.pivot
                      ? 'Pivot'
                      : state.active.includes(position)
                        ? 'Active'
                        : 'Waiting',
        },
    ]
}
