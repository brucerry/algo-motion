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

    dispose(): void {
        if (!this.live) return
        this.live = false
        for (const unsubscribe of this.unsubscribers) unsubscribe()
        for (const source of Object.values(this.sources)) source.dispose()
    }
}
