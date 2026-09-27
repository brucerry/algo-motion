import type { CSSProperties } from 'react'

export type ServerPhase = 'ready' | 'working' | 'burnout'

export function ComputerServer({
    phase,
    moving,
    stepping,
    step,
    total,
}: {
    phase: ServerPhase
    moving: boolean
    stepping: boolean
    step: number
    total: number
}) {
    const progress = Math.round((100 * step) / Math.max(1, total - 1))
    return (
        <span
            className="server-slot"
            data-server-phase={phase}
            data-server-progress={progress}
            data-moving={moving}
            data-stepping={stepping}
            aria-hidden="true"
        >
            <svg key={step} viewBox="0 0 104 86" className="server-drawing" focusable="false">
                <path className="server-smoke" d="M66 15q-8-6 0-11m9 14q-7-5 0-11m9 13q-6-5 0-11" />
                <path className="server-hair" d="m33 24 5-11 7 7 7-10 6 10 8-8 3 13" />
                <path className="server-antenna" d="M54 22V9m-4 0 4-4 4 4" />
                <path
                    className="server-body"
                    d="M24 22q-4 1-4 7l1 40q0 5 5 5l54-1q5 0 5-5l-1-39q0-6-6-6z"
                />
                <path
                    className="server-screen"
                    d="M29 31q0-2 3-2h41q3 0 3 3l-1 25q0 3-3 3H32q-3 0-3-3z"
                />
                <path className="server-code" d="m36 46 5 3-5 3m9 0h8m2-7h12" />
                <path className="server-code-active" d="M45 40h20" />
                <path className="server-scan" d="M34 32v24" />
                <path className="server-mouth" d="M44 51q8 6 16 0" />
                <path className="server-tired-mouth" d="M48 54q5-6 10 0" />
                <path className="server-eyes" d="M40 42h2m20 0h2" />
                <path className="server-tired-eyes" d="m38 40 5 5m0-5-5 5m22-5 5 5m0-5-5 5" />
                <path className="server-panel" d="M30 66h32m5-1h8" />
                <circle className="server-light" cx="71" cy="67" r="3" />
                <path className="server-feet" d="m34 74-5 6h13l3-6m20 0 3 6h12l-6-7" />
                <path className="server-spark" d="m10 35-4-4m88 14 4-3M13 52l-5 3" />
            </svg>
            <span className="server-caption">
                {phase === 'ready' ? 'READY' : phase === 'burnout' ? 'FINISHED' : 'RUN'} {progress}%
            </span>
            <span className="server-meter">
                <span style={{ width: `${progress}%` }} />
            </span>
        </span>
    )
}

export function WalkingShoes({
    step,
    progress,
    direction,
    moving,
}: {
    step: number
    progress: number
    direction: 'forward' | 'backward'
    moving: boolean
}) {
    return (
        <span
            className="shoes-slot"
            data-shoe-step={step}
            data-direction={direction}
            data-moving={moving}
            style={{ '--shoe-progress': progress } as CSSProperties}
            aria-hidden="true"
        >
            <span className="shoes-track" />
            <svg key={step} className="shoes-drawing" viewBox="0 0 100 62" focusable="false">
                <path
                    className="shoe-left"
                    d="m19 18 15-2 4 16q8 6 17 6l3 8q-8 7-22 4L18 45q-4-2-3-8z"
                />
                <path
                    className="shoe-right"
                    d="m57 11 15 4-4 16q4 7 13 12l-2 9q-8 5-20-2L47 39q-3-3 0-9z"
                />
                <path className="shoe-laces" d="m25 30 11-2m-10 7 12-2m19-5 11 4m-13 1 11 4" />
                <path className="shoe-soles" d="m17 43 39 7m-5-12 27 13" />
            </svg>
        </span>
    )
}
