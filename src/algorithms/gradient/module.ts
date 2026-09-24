import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import {
    gradientDefaults,
    inspectDescent,
    runDescent,
    type DescentState,
    type GradientParams,
} from './descent'

const parameters: ParameterDefinition[] = [
    {
        type: 'select',
        key: 'objective',
        label: 'Objective surface',
        defaultValue: 'bowl',
        options: [
            { label: 'Circular bowl', value: 'bowl' },
            { label: 'Elongated bowl', value: 'ellipse' },
            { label: 'Rippled bowl', value: 'ripple' },
        ],
    },
    {
        type: 'number',
        key: 'learningRate',
        label: 'Learning rate',
        defaultValue: 0.25,
        min: 0.01,
        max: 0.4,
        step: 0.01,
        control: 'slider',
    },
    {
        type: 'number',
        key: 'startX',
        label: 'Starting X',
        defaultValue: -3.2,
        min: -4,
        max: 4,
        step: 0.1,
    },
    {
        type: 'number',
        key: 'startY',
        label: 'Starting Y',
        defaultValue: 2.8,
        min: -4,
        max: 4,
        step: 0.1,
    },
    {
        type: 'number',
        key: 'maxIterations',
        label: 'Maximum iterations',
        defaultValue: 100,
        min: 1,
        max: 300,
        step: 1,
        integer: true,
        control: 'slider',
    },
    {
        type: 'number',
        key: 'tolerance',
        label: 'Convergence tolerance',
        defaultValue: 0.02,
        min: 0.001,
        max: 0.5,
        step: 0.001,
    },
]

export const gradientModule: AlgorithmModule<DescentState> = {
    meta: {
        id: 'gradient-descent',
        name: 'Gradient Descent',
        shortName: 'Gradient Descent',
        category: 'Optimization',
        dimensionality: '3D',
        description: 'Follow a mathematical surface downhill, one gradient step at a time.',
        tags: ['optimization', 'calculus', 'surfaces'],
    },
    parameters,
    defaults: gradientDefaults,
    presets: [
        {
            name: 'Gentle bowl',
            values: { objective: 'bowl', learningRate: 0.25, startX: -3.2, startY: 2.8 },
        },
        {
            name: 'Elongated valley',
            values: { objective: 'ellipse', learningRate: 0.18, startX: -3.5, startY: 3 },
        },
        {
            name: 'Local ripples',
            values: { objective: 'ripple', learningRate: 0.2, startX: -3, startY: 3 },
        },
    ],
    pseudocode: [
        { id: 1, text: 'point ← starting position' },
        { id: 2, text: 'evaluate f(point) and ∇f(point)' },
        { id: 3, text: 'step ← learningRate × ∇f(point)' },
        { id: 4, text: 'point ← point − step' },
        { id: 5, text: 'stop when gradient is sufficiently small' },
        { id: 6, text: 'otherwise stop at iteration limit or error' },
    ],
    education: {
        overview:
            'Gradient descent iteratively reduces an objective by moving opposite its gradient.',
        intuition:
            'The gradient points uphill. A learning-rate-scaled move in the opposite direction usually descends toward a nearby minimum.',
        complexity:
            'O(N) objective and gradient evaluations for N steps, excluding the surface mesh and recorded frames.',
        applications: 'Model training, parameter fitting, and numerical optimization.',
        formula: String.raw`x_{k+1}=x_k-\eta\nabla f(x_k)`,
        legend: [
            {
                label: 'Surface',
                color: '#83baca',
                mark: '▧',
                meaning: 'Sketched mesh height represents objective value',
            },
            {
                label: 'Current point',
                color: '#ed986c',
                mark: '●',
                meaning: 'Current iterate; outlined when selected',
            },
            {
                label: 'Trail',
                color: '#398e70',
                mark: '━',
                meaning: 'Drawn line through previous iterates',
            },
            {
                label: 'Descent direction',
                color: '#cb8b28',
                mark: '➜',
                meaning: 'Arrow opposite the current gradient',
            },
        ],
        references: [
            {
                label: 'Nocedal & Wright, Numerical Optimization (standard reference)',
                url: 'https://doi.org/10.1007/978-0-387-40065-5',
                kind: 'standard',
            },
            {
                label: 'This site: three illustrative objective surfaces',
                url: '#/algorithm/gradient-descent',
                kind: 'implementation',
            },
        ],
    },
    run: (params) => runDescent(params as GradientParams),
    renderer: lazy(() => import('./GradientScene')),
    inspect: inspectDescent,
}
