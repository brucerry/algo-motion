import { lazy } from 'react'
import type { AlgorithmModule } from '../../../engine/types'
import { cubeTrace } from './trace'
import { inspectCube, type CubeState } from './replay'
import type { CubeParams } from './model'

export const rubiksModule: AlgorithmModule<CubeState> = {
    meta: {
        id: 'rubiks-cube',
        name: 'Rubik’s Cube — Two-Phase Solver',
        shortName: 'Rubik’s Cube',
        category: 'Backtracking',
        dimensionality: '3D',
        description: 'Turn a tactile 3×3 cube along a verified two-phase solution path.',
        tags: ['backtracking', 'iterative deepening', 'pruning', 'two-phase search'],
        camera: { distance: 7.6, perspective: [5.2, 4.2, 6.2] },
    },
    parameters: [
        {
            type: 'number',
            key: 'scrambleLength',
            label: 'Scramble length',
            defaultValue: 20,
            min: 0,
            max: 100,
            integer: true,
            control: 'slider',
            description:
                'Legal face turns used to create the input. A longer scramble does not necessarily need a longer solution.',
        },
        { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 42 },
    ],
    defaults: { scrambleLength: 20, seed: 42 },
    presets: [
        { name: 'Already solved', values: { scrambleLength: 0 } },
        { name: 'Short scramble', values: { scrambleLength: 5 } },
        { name: 'Standard scramble', values: { scrambleLength: 20 } },
        { name: 'Long scramble', values: { scrambleLength: 60 } },
    ],
    pseudocode: [
        'generate legal seeded scramble; check for solved input',
        'prepare coordinate move tables and pruning lower bounds',
        'iteratively deepen search to solved orientations + slice membership',
        'search phase 2 with U/D turns and side-face half turns',
        'replay each verified solution move in order',
        'verify all stickers match their centers; report success',
    ].map((text, index) => ({ id: index + 1, text })),
    education: {
        overview:
            'Solve a full 3×3 Rubik’s Cube with Kociemba’s two-phase search. The animation replays the verified solution path; internal search branches are not individually replayed.',
        intuition:
            'Phase 1 fixes corner/edge orientations and puts the four equatorial edges in their slice. Phase 2 solves permutations using only U, D and side-face half turns. Iterative deepening explores increasing depths; pruning-table lower bounds reject branches that cannot reach the goal at the remaining depth. This finds a valid solution, not a guaranteed shortest one.',
        complexity:
            'Exponential search in solution depth; pruning and restricted move sets reduce the explored state space. Coordinate lookup tables cost preparation time and memory. Replay storage is proportional to solution length. Browser timing is not an algorithm benchmark.',
        applications:
            'Puzzle solving, heuristic state-space search, admissible lower bounds, and subgroup decomposition. U/R/F/D/L/B mean Up/Right/Front/Down/Left/Back relative to the cube. A bare letter is clockwise looking at that face; ′ is inverse and 2 is a half turn. A half turn counts as one face turn.',
        legend: [
            {
                label: 'U / D',
                color: '#f2cc42',
                meaning: 'Up: white; Down: yellow. Centers define each face.',
            },
            { label: 'R / L', color: '#df4944', meaning: 'Right: red; Left: orange.' },
            { label: 'F / B', color: '#379d69', meaning: 'Front: green; Back: blue.' },
            {
                label: 'Selected',
                color: '#d6a54a',
                meaning: 'Inspect the cubie’s identity, location, and stickers.',
            },
        ],
        references: [
            {
                label: 'Kociemba: Two-Phase Algorithm',
                url: 'https://kociemba.org/math/twophase.htm',
                kind: 'original',
            },
            {
                label: 'Kociemba: Implementation and pruning tables',
                url: 'https://kociemba.org/math/imptwophase.htm',
                kind: 'standard',
            },
            {
                label: 'cube.js solver implementation (MIT)',
                url: 'https://github.com/ldez/cubejs/tree/6b3da493894d9aed54f4c8aafccadbe676e745b5',
                kind: 'implementation',
            },
        ],
    },
    createTrace: (params) => cubeTrace(params as CubeParams),
    renderer: lazy(() => import('./CubeScene')),
    inspect: inspectCube,
}
