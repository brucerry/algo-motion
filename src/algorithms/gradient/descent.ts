import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'

export type ObjectiveId = 'bowl' | 'ellipse' | 'ripple'
export type GradientParams = Params & {
    objective: ObjectiveId
    learningRate: number
    startX: number
    startY: number
    maxIterations: number
    tolerance: number
}
export type Point = { x: number; y: number; value: number }
export type DescentState = {
    objective: ObjectiveId
    current: Point
    trail: Point[]
    gradient: [number, number]
    magnitude: number
    distanceMoved: number
    iteration: number
    stoppingReason: 'running' | 'converged' | 'limit' | 'numerical-error'
}
export type Objective = {
    name: string
    formula: string
    value: (x: number, y: number) => number
    gradient: (x: number, y: number) => [number, number]
}
export const objectives: Record<ObjectiveId, Objective> = {
    bowl: {
        name: 'Circular bowl',
        formula: 'f(x,y)=0.12(x^2+y^2)',
        value: (x, y) => 0.12 * (x * x + y * y),
        gradient: (x, y) => [0.24 * x, 0.24 * y],
    },
    ellipse: {
        name: 'Elongated bowl',
        formula: 'f(x,y)=0.08x^2+0.3y^2',
        value: (x, y) => 0.08 * x * x + 0.3 * y * y,
        gradient: (x, y) => [0.16 * x, 0.6 * y],
    },
    ripple: {
        name: 'Rippled bowl',
        formula: String.raw`f(x,y)=0.14(x^2+y^2)+0.6\sin(x)\sin(y)`,
        value: (x, y) => 0.14 * (x * x + y * y) + 0.6 * Math.sin(x) * Math.sin(y),
        gradient: (x, y) => [
            0.28 * x + 0.6 * Math.cos(x) * Math.sin(y),
            0.28 * y + 0.6 * Math.sin(x) * Math.cos(y),
        ],
    },
}
export const gradientDefaults: GradientParams = {
    objective: 'bowl',
    learningRate: 0.25,
    startX: -3.2,
    startY: 2.8,
    maxIterations: 100,
    tolerance: 0.02,
}

export function runDescent(params: GradientParams): SimulationRun<DescentState> {
    if (
        !(params.objective in objectives) ||
        !Number.isFinite(params.learningRate) ||
        params.learningRate <= 0 ||
        params.learningRate > 0.4 ||
        !Number.isFinite(params.startX) ||
        !Number.isFinite(params.startY) ||
        Math.abs(params.startX) > 4 ||
        Math.abs(params.startY) > 4 ||
        !Number.isInteger(params.maxIterations) ||
        params.maxIterations < 1 ||
        params.maxIterations > 300 ||
        !Number.isFinite(params.tolerance) ||
        params.tolerance <= 0 ||
        params.tolerance > 0.5
    )
        throw new Error('Gradient descent settings exceed safe limits.')
    const objective = objectives[params.objective]
    let x = params.startX,
        y = params.startY
    let gradient = objective.gradient(x, y)
    let magnitude = Math.hypot(...gradient)
    let distanceMoved = 0
    const trail: Point[] = []
    const frames: Frame<DescentState>[] = []
    const record = (
        iteration: number,
        stoppingReason: DescentState['stoppingReason'],
        explanation: string,
        activeLines: number[],
    ) => {
        const current = { x, y, value: objective.value(x, y) }
        trail.push(current)
        const state: DescentState = {
            objective: params.objective,
            current,
            trail: [...trail],
            gradient: [...gradient],
            magnitude,
            distanceMoved,
            iteration,
            stoppingReason,
        }
        const metrics: Metric[] = [
            { label: 'Iteration', value: iteration },
            { label: 'x', value: +x.toFixed(3) },
            { label: 'y', value: +y.toFixed(3) },
            { label: 'f(x, y)', value: +current.value.toFixed(4) },
            { label: '|gradient|', value: +magnitude.toFixed(4) },
            { label: 'Distance moved', value: +distanceMoved.toFixed(4) },
        ]
        frames.push({
            index: frames.length,
            state,
            event: stoppingReason,
            explanation,
            activeLines,
            metrics,
        })
    }
    record(
        0,
        'running',
        `Start at (${x.toFixed(2)}, ${y.toFixed(2)}) with f=${objective.value(x, y).toFixed(3)}.`,
        [1],
    )
    if (magnitude <= params.tolerance) {
        record(
            0,
            'converged',
            `The starting gradient magnitude ${magnitude.toFixed(4)} is within the convergence tolerance.`,
            [5],
        )
        return { frames, outcome: 'success' }
    }
    for (let iteration = 1; iteration <= params.maxIterations; iteration++) {
        const nextX = x - params.learningRate * gradient[0]
        const nextY = y - params.learningRate * gradient[1]
        const nextGradient = objective.gradient(nextX, nextY)
        const nextMagnitude = Math.hypot(...nextGradient)
        const value = objective.value(nextX, nextY)
        if (![nextX, nextY, nextMagnitude, value].every(Number.isFinite)) {
            record(
                iteration - 1,
                'numerical-error',
                `The next position would become non-finite at iteration ${iteration}. Adjust the learning rate or starting point.`,
                [6],
            )
            return { frames, outcome: 'error', error: 'Non-finite descent state.' }
        }
        distanceMoved = Math.hypot(nextX - x, nextY - y)
        x = nextX
        y = nextY
        gradient = nextGradient
        magnitude = nextMagnitude
        if (magnitude <= params.tolerance || distanceMoved <= params.tolerance * 0.1) {
            record(
                iteration,
                'converged',
                `The gradient magnitude is ${magnitude.toFixed(4)} after moving ${distanceMoved.toFixed(4)}. Convergence tolerance was met.`,
                [5],
            )
            return { frames, outcome: 'success' }
        }
        record(
            iteration,
            'running',
            `Move opposite the gradient to (${x.toFixed(2)}, ${y.toFixed(2)}); f=${value.toFixed(3)}, gradient magnitude=${magnitude.toFixed(3)}.`,
            [2, 3, 4],
        )
    }
    record(
        params.maxIterations,
        'limit',
        `Stopped at the ${params.maxIterations}-iteration limit without meeting convergence tolerance.`,
        [6],
    )
    return { frames, outcome: 'limit' }
}

export function inspectDescent(state: DescentState, selected: string): Metric[] | null {
    if (selected !== 'current') return null
    return [
        {
            label: 'Position',
            value: `(${state.current.x.toFixed(3)}, ${state.current.y.toFixed(3)})`,
        },
        { label: 'f(x, y)', value: +state.current.value.toFixed(4) },
        { label: 'Gradient', value: state.gradient.map((value) => value.toFixed(3)).join(', ') },
        { label: 'Stop reason', value: state.stoppingReason },
    ]
}
