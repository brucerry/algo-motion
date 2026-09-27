import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { seededIntervals, type Interval } from '../common/seededInputs'

export type IntervalParams = Params & { count: number; seed: number }
export type IntervalState = {
    intervals: Interval[]
    order: number[]
    current: number | null
    accepted: number[]
    rejected: number[]
    lastEnd: number
}

export function runIntervals(
    params: IntervalParams,
    input?: Interval[],
): SimulationRun<IntervalState> {
    const intervals = input ?? seededIntervals(params.count, params.seed)
    if (
        intervals.length > 120 ||
        new Set(intervals.map((item) => item.id)).size !== intervals.length ||
        intervals.some(
            (item) =>
                !Number.isInteger(item.start) ||
                !Number.isInteger(item.end) ||
                item.end <= item.start,
        )
    )
        throw new Error(
            'Intervals must have distinct IDs and valid endpoints within the safe count.',
        )
    const sorted = [...intervals].sort((a, b) => a.end - b.end || a.start - b.start || a.id - b.id)
    const order = sorted.map((item) => item.id)
    const accepted: number[] = []
    const rejected: number[] = []
    const frames: Frame<IntervalState>[] = []
    let current: number | null = null
    let lastEnd = -Infinity
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: IntervalState = {
            intervals,
            order,
            current,
            accepted: [...accepted],
            rejected: [...rejected],
            lastEnd,
        }
        const metrics: Metric[] = [
            { label: 'Accepted', value: accepted.length },
            { label: 'Rejected', value: rejected.length },
            { label: 'Last finish', value: Number.isFinite(lastEnd) ? lastEnd : '—' },
        ]
        frames.push({ index: frames.length, state, activeLines, event, explanation, metrics })
    }
    record(
        'initialize',
        'Sort activities by finishing time. Intervals use [start, end), so touching endpoints are compatible.',
        [1],
    )
    for (const interval of sorted) {
        current = interval.id
        record(
            'consider',
            `Consider activity ${interval.id + 1}: [${interval.start}, ${interval.end}).`,
            [2],
        )
        if (interval.start >= lastEnd) {
            accepted.push(interval.id)
            lastEnd = interval.end
            record(
                'accept',
                `Accept activity ${interval.id + 1}; it starts at or after the last accepted finish.`,
                [3],
            )
        } else {
            rejected.push(interval.id)
            record(
                'reject',
                `Reject activity ${interval.id + 1}; it overlaps the last accepted activity.`,
                [4],
            )
        }
    }
    current = null
    record(
        'success',
        `Selected ${accepted.length} non-overlapping activities, a maximum-size set.`,
        [5],
    )
    return { frames, outcome: 'success' }
}

export function inspectInterval(state: IntervalState, selected: string): Metric[] | null {
    const interval = state.intervals.find((item) => String(item.id) === selected)
    if (!interval) return null
    return [
        { label: 'Activity', value: interval.id + 1 },
        { label: 'Start', value: interval.start },
        { label: 'End (exclusive)', value: interval.end },
        { label: 'Finish order', value: state.order.indexOf(interval.id) + 1 },
        {
            label: 'State',
            value: state.accepted.includes(interval.id)
                ? 'Accepted'
                : state.rejected.includes(interval.id)
                  ? 'Rejected'
                  : state.current === interval.id
                    ? 'Considering'
                    : 'Waiting',
        },
    ]
}
