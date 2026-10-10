import type { TraceSource } from './trace'
import type { Frame } from './types'

// Tokens distinguish repeated A→B→A seeks as well as replacement sources.
export class FrameRequests {
    private pending = new Map<TraceSource<any>, { index: number; token: object }>()
    clear() {
        this.pending.clear()
    }
    cancel(source: TraceSource<any>) {
        this.pending.delete(source)
    }
    request<S>(
        source: TraceSource<S>,
        index: number,
        lookup: () => Promise<Frame<S> | null>,
        publish: (frame: Frame<S>) => void,
    ) {
        if (this.pending.get(source)?.index === index) return
        const token = {}
        this.pending.set(source, { index, token })
        void lookup().then((frame) => {
            if (this.pending.get(source)?.token !== token) return
            this.pending.delete(source)
            if (frame) publish(frame)
        })
    }
}
