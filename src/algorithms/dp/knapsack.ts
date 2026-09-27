import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededValues } from '../common/seededInputs'

export type KnapsackParams = Params & { count: number; capacity: number; seed: number }
export type KnapsackItem = { id: number; weight: number; value: number }
export type KnapsackState = {
    items: KnapsackItem[]
    capacity: number
    table: (number | null)[][]
    active: [number, number] | null
    skip: number | null
    take: number | null
    selected: number[]
    phase: 'fill' | 'reconstruct' | 'done'
}

export function runKnapsack(
    params: KnapsackParams,
    input?: KnapsackItem[],
): SimulationRun<KnapsackState> {
    if (!Number.isInteger(params.capacity) || params.capacity < 0 || params.capacity > 180)
        throw new Error('Capacity exceeds safe limits.')
    const weights = seededValues(params.count, params.seed, 'knapsack-weights', 1, 8)
    const values = seededValues(params.count, params.seed, 'knapsack-values', 1, 15)
    const items = input ?? weights.map((weight, id) => ({ id, weight, value: values[id] }))
    if (
        items.length > 80 ||
        items.some(
            (item) =>
                !Number.isInteger(item.weight) ||
                item.weight < 1 ||
                !Number.isInteger(item.value) ||
                item.value < 0,
        )
    )
        throw new Error('Items exceed safe limits.')
    let table: (number | null)[][] = Array.from({ length: items.length + 1 }, (_, row) =>
        Array.from({ length: params.capacity + 1 }, () => (row === 0 ? 0 : null)),
    )
    const frames: Frame<KnapsackState>[] = []
    const selected: number[] = []
    let active: [number, number] | null = null
    let skip: number | null = null
    let take: number | null = null
    let phase: KnapsackState['phase'] = 'fill'
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: KnapsackState = {
            items,
            capacity: params.capacity,
            table,
            active: active && [active[0], active[1]],
            skip,
            take,
            selected: [...selected],
            phase,
        }
        const metrics: Metric[] = [
            { label: 'Best value', value: table[items.length][params.capacity] ?? '—' },
            { label: 'Selected items', value: selected.length },
            { label: 'Capacity', value: params.capacity },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record('initialize', 'Row zero represents choosing from no items, so every value is zero.', [1])
    for (let row = 1; row <= items.length; row++) {
        const item = items[row - 1]
        for (let capacity = 0; capacity <= params.capacity; capacity++) {
            active = [row, capacity]
            skip = table[row - 1][capacity]!
            take =
                item.weight <= capacity
                    ? item.value + table[row - 1][capacity - item.weight]!
                    : null
            const nextRow = [...table[row]]
            nextRow[capacity] = take === null ? skip : Math.max(skip, take)
            table = [...table]
            table[row] = nextRow
            record(
                'fill',
                `Item ${row} (${item.weight} weight, ${item.value} value), capacity ${capacity}: skip ${skip}${take === null ? '; too heavy to take' : `, take ${take}`}. Best is ${table[row][capacity]}.`,
                [2, 3, 4],
            )
        }
    }
    phase = 'reconstruct'
    let capacity = params.capacity
    for (let row = items.length; row > 0; row--) {
        active = [row, capacity]
        const item = items[row - 1]
        skip = table[row - 1][capacity]!
        take = item.weight <= capacity ? item.value + table[row - 1][capacity - item.weight]! : null
        if (take !== null && take > skip) {
            selected.push(item.id)
            record('take', `Take item ${row}; its value improves the optimum at this cell.`, [5])
            capacity -= item.weight
        } else {
            record('skip', `Skip item ${row}; skipping matches or improves the optimum.`, [5])
        }
    }
    selected.reverse()
    active = null
    skip = null
    take = null
    phase = 'done'
    record(
        'success',
        `Optimal value ${table[items.length][params.capacity]} uses ${selected.length} item${selected.length === 1 ? '' : 's'} within capacity.`,
        [6],
    )
    return { frames, outcome: 'success' }
}

export function inspectKnapsack(state: KnapsackState, selected: string): Metric[] | null {
    const match = /^(\d+):(\d+)$/.exec(selected)
    if (!match) return null
    const row = Number(match[1]),
        capacity = Number(match[2])
    if (row >= state.table.length || capacity > state.capacity) return null
    const value = state.table[row][capacity]
    const metrics: Metric[] = [
        { label: 'Item row', value: row },
        { label: 'Capacity', value: capacity },
        { label: 'Best value', value: value ?? 'Not computed yet' },
    ]
    if (row > 0 && value !== null) {
        const item = state.items[row - 1]
        const skip = state.table[row - 1][capacity]
        const take =
            item.weight <= capacity
                ? item.value + state.table[row - 1][capacity - item.weight]!
                : null
        metrics.push(
            { label: 'Skip', value: skip ?? '—' },
            { label: 'Take', value: take ?? 'Too heavy' },
            {
                label: 'Decision',
                value: take !== null && skip !== null && take > skip ? 'Take' : 'Skip',
            },
        )
    }
    return metrics
}
