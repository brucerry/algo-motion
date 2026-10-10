import { lazy } from 'react'
import type { AlgorithmModule } from '../../../engine/types'
import { cubeTrace } from './trace'
import { inspectCube, type CubeState } from './replay'
import { cubeSize, normalizeSize, type CubeParams } from './model'

export const rubiksModule: AlgorithmModule<CubeState> = {
    meta: {
        id: 'rubiks-cube',
        name: 'Rubik’s Cube — Two-Phase & Reduction',
        shortName: 'Rubik’s Cube',
        category: 'Backtracking',
        dimensionality: '3D',
        description:
            'Solve tactile cubes with verified two-phase search or constructive reduction.',
        tags: ['backtracking', 'iterative deepening', 'pruning', 'two-phase search'],
        camera: { distance: 7.6, perspective: [5.2, 4.2, 6.2] },
    },
    parameters: [
        {
            type: 'select',
            key: 'size',
            label: 'Cube size',
            defaultValue: '3',
            options: [
                { value: '3', label: '3×3 — Two-phase' },
                { value: '4', label: '4×4 — Reduction' },
                { value: '5', label: '5×5 — Reduction' },
            ],
        },
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
                'Legal layer turns used to create the input. Larger cubes include inner and wide turns. A longer scramble does not necessarily need a longer solution.',
        },
        { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 42 },
    ],
    defaults: { size: '3', scrambleLength: 20, seed: 42 },
    presets: [
        { name: 'Already solved', values: { scrambleLength: 0 } },
        { name: 'Short scramble', values: { scrambleLength: 5 } },
        { name: 'Standard scramble', values: { scrambleLength: 20 } },
        { name: 'Long scramble', values: { scrambleLength: 60 } },
    ],
    preservePresetParams: true,
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
    cameraForState: (state) => {
        const factor = cubeSize(state.cube) / 3
        return { distance: 7.6 * factor, perspective: [5.2 * factor, 4.2 * factor, 6.2 * factor] }
    },
    educationForParams: (params) =>
        normalizeSize(params.size) === 3
            ? rubiksModule.education
            : {
                  ...rubiksModule.education,
                  overview: `Solve the full ${params.size}×${params.size} cube using constructive center and edge reduction, applicable parity correction, and a final two-phase 3×3 search. Replay shows verified solution moves; internal search branches are not replayed.`,
                  intuition: `Setup moves conjugate exact three-piece commutators. Centers are assigned by color, including joint last-center cases; wings are grouped while restoring centers. ${params.size === '4' ? 'The 4×4 checks single flipped-group and permutation parity.' : 'The 5×5 handles axial and diagonal center orbits and aligns wings with their middle edges, including last-wing parity. Its middle-edge projection follows ordinary 3×3 parity rules.'} Every reduced state is checked before two-phase search. This strategy finds a valid solution, not a shortest one.`,
                  complexity:
                      'The constructive stages resolve fixed 24-piece orbits with generated setup tables, followed by exponential two-phase search with pruning lower bounds. Compact replay uses sparse exact checkpoints and a bounded frame cache. Preparation time and browser timing are not algorithm benchmarks.',
                  applications:
                      'Cube-fixed U/R/F/D/L/B name faces. R2 is a half turn; 2R turns just the second layer; Rw turns the outer two layers together. An explicit range such as 2-3R turns those two depths. ′ reverses the selected layer turn. Each single-layer, wide, or half turn counts as one solution move; stage-only frames count as zero.',
              },
    pseudocodeForParams: (params) =>
        normalizeSize(params.size) === 3
            ? rubiksModule.pseudocode
            : [
                  'generate legal seeded layer scramble; check for solved input',
                  'prepare exact setup commutators on 24-piece orbits',
                  normalizeSize(params.size) === 4
                      ? 'solve canonical center blocks with joint remaining-piece handling'
                      : 'solve axial and diagonal center orbits with joint remaining-piece handling',
                  normalizeSize(params.size) === 4
                      ? 'pair both wings of each edge while restoring completed centers'
                      : 'align wings with middle edges; restore centers and correct last-wing parity',
                  normalizeSize(params.size) === 4
                      ? 'verify reduced orientation/permutation parity; correct 4×4 parity if needed'
                      : 'verify complete three-piece edge groups and valid reduced 3×3 parity',
                  'search reduced 3×3 phase 1: orientations and equatorial slice',
                  'search phase 2; lift each outer solution move to the full cube',
                  'verify every full-size sticker and stage boundary; report success',
              ].map((text, i) => ({ id: i + 1, text })),
    renderer: lazy(() => import('./CubeScene')),
    inspect: inspectCube,
}
