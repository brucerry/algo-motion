import type { Frame } from './types'
import type { TraceSource } from './trace'

export class ComparisonTraceSet {
    private live = true
    private unsubscribers: (() => void)[]

    constructor(
        readonly sources: Record<string, TraceSource<any>>,
        onChange: () => void,
    ) {
        this.unsubscribers = Object.values(sources).map((source) =>
            source.subscribe(() => {
                if (this.live) onChange()
            }),
        )
    }

    available(): number {
        return Math.max(
            0,
            ...Object.values(this.sources).map((source) => source.snapshot().available),
        )
    }

    allSettled(): boolean {
        return Object.values(this.sources).every(
            (source) => source.snapshot().status !== 'generating',
        )
    }

    totalKnown(): boolean {
        return Object.values(this.sources).every((source) => source.snapshot().total !== null)
    }

    async frame(id: string, index: number): Promise<Frame<any> | null> {
        const source = this.sources[id]
        if (!this.live || !source || source.snapshot().available === 0) return null
        const target = Math.min(index, source.snapshot().available - 1)
        const frame = await source.frame(target)
        return this.live ? frame : null
    }

    cancel(id: string): void {
        this.sources[id]?.cancel()
    }

    detach(): void {
        if (!this.live) return
        this.live = false
        for (const unsubscribe of this.unsubscribers) unsubscribe()
    }

    dispose(): void {
        if (!this.live) return
        this.detach()
        for (const source of Object.values(this.sources)) source.dispose()
    }
}

// Owns computation separately from a timeline's subscriptions. Reconfiguration
// replaces only changed inputs, retaining the other runs and their outcomes.
export class ComparisonRuns {
    private runs = new Map<string, { key: string; source: TraceSource<any> }>()
    configure(
        entries: { id: string; key: string; create: () => TraceSource<any> }[],
    ): Record<string, TraceSource<any>> {
        const keep = new Set(entries.map((entry) => entry.id))
        for (const [id, run] of this.runs)
            if (!keep.has(id)) {
                run.source.dispose()
                this.runs.delete(id)
            }
        const sources: Record<string, TraceSource<any>> = {}
        for (const entry of entries) {
            let run = this.runs.get(entry.id)
            if (run?.key !== entry.key) {
                run?.source.dispose()
                this.runs.delete(entry.id)
                run = { key: entry.key, source: entry.create() }
                this.runs.set(entry.id, run)
            }
            sources[entry.id] = run.source
        }
        return sources
    }
    dispose(): void {
        for (const run of this.runs.values()) run.source.dispose()
        this.runs.clear()
    }
}
