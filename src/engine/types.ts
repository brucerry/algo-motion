import type { ComponentType, LazyExoticComponent } from 'react'

export type ParamValue = string | number | boolean
export type Params = Record<string, ParamValue>

type BaseParam = { key: string; label: string; description?: string }
export type ParameterDefinition =
    | (BaseParam & {
          type: 'number'
          defaultValue: number
          min: number
          max: number
          step?: number
          integer?: boolean
          control?: 'slider' | 'number'
          bounds?: (params: Params) => { min?: number; max?: number }
      })
    | (BaseParam & { type: 'seed'; defaultValue: number })
    | (BaseParam & { type: 'boolean'; defaultValue: boolean })
    | (BaseParam & {
          type: 'select'
          defaultValue: string
          options: { label: string; value: string }[]
      })

export type Metric = { label: string; value: string | number }
export type Frame<S> = {
    index: number
    state: S
    activeLines: number[]
    explanation: string
    event: string
    metrics: Metric[]
}
export type SimulationRun<S> = {
    frames: Frame<S>[]
    outcome: 'success' | 'no-path' | 'no-solution' | 'limit' | 'error'
    error?: string
}
export type PseudocodeLine = { id: number; text: string }
export type Reference = {
    label: string
    url: string
    kind: 'original' | 'standard' | 'variant' | 'implementation'
}
export type Education = {
    overview: string
    intuition: string
    complexity: string
    applications: string
    formula?: string
    legend: { label: string; color: string; meaning: string; mark?: string }[]
    references: Reference[]
}
export type AlgorithmMeta = {
    id: string
    name: string
    shortName: string
    category: string
    dimensionality:
        '2D grid in 3D' | '3D' | 'Array in 3D' | 'Table in 3D' | 'Board in 3D' | 'Timeline in 3D'
    description: string
    tags: string[]
    camera?: { distance: number; targetY?: number; perspective?: [number, number, number] }
}
export type SceneProps<S> = {
    state: S
    onSelect: (id: string | null) => void
    selectedId: string | null
    reducedMotion: boolean
    theme: 'light' | 'dark'
}
export type Renderer<S> =
    ComponentType<SceneProps<S>> | LazyExoticComponent<ComponentType<SceneProps<S>>>
export type AlgorithmModule<S, P extends Params = Params> = {
    meta: AlgorithmMeta
    parameters: ParameterDefinition[]
    defaults: P
    presets: { name: string; values: Partial<P> }[]
    pseudocode: PseudocodeLine[]
    education: Education
    run: (params: P) => SimulationRun<S>
    renderer: Renderer<S>
    inspect: (state: S, id: string) => Metric[] | null
}
