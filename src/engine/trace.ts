import type { Frame, SimulationRun } from './types'

export type TraceStatus = 'generating' | 'complete' | 'cancelled' | 'error'
export type TraceSnapshot = {
    available: number
    total: number | null
    status: TraceStatus
    outcome: SimulationRun<unknown>['outcome'] | null
    error?: string
}

export interface TraceSource<S> {
    snapshot(): TraceSnapshot
    frame(index: number): Promise<Frame<S> | null>
    subscribe(listener: () => void): () => void
    cancel(): void
    dispose(): void
}

export function eagerTrace<S>(run: SimulationRun<S>): TraceSource<S> {
    const snapshot: TraceSnapshot = {
        available: run.frames.length,
        total: run.frames.length,
        status: run.outcome === 'error' ? 'error' : 'complete',
        outcome: run.outcome,
        error: run.error,
    }
    return {
        snapshot: () => snapshot,
        frame: async (index) => run.frames[index] ?? null,
        subscribe: () => () => {},
        cancel: () => {},
        dispose: () => {},
    }
}

export class MutableTrace<S> implements TraceSource<S> {
    private state: TraceSnapshot = {
        available: 0,
        total: null,
        status: 'generating',
        outcome: null,
    }
    private listeners = new Set<() => void>()
    constructor(
        private lookup: (index: number) => Promise<Frame<S> | null>,
        private stopGeneration: () => void,
        private disposeSource: () => void = stopGeneration,
    ) {}
    snapshot = () => this.state
    frame = (index: number) => this.lookup(index)
    subscribe = (listener: () => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }
    update(next: TraceSnapshot) {
        if (this.state.status !== 'generating') return
        this.state = next
        for (const listener of this.listeners) listener()
    }
    cancel = () => {
        if (this.state.status !== 'generating') return
        this.stopGeneration()
        this.state = { ...this.state, status: 'cancelled', outcome: null, total: null }
        for (const listener of this.listeners) listener()
    }
    dispose = () => this.disposeSource()
}
