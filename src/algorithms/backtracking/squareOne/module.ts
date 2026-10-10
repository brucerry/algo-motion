import { lazy } from 'react'
import type { AlgorithmModule } from '../../../engine/types'
import { rubiksModule } from '../rubiks/module'
import { inspectSquare, type SquareState } from './replay'
import { squareTrace } from './trace'
import type { SquareParams } from './model'
export const squareModule: AlgorithmModule<SquareState> = {
    meta: {
        id: 'square-one',
        name: 'Square-1 — Shape & Permutation Search',
        shortName: 'Square-1',
        category: 'Backtracking',
        dimensionality: '3D',
        description:
            'Restore cube shape, wedge permutations and the middle layer with legal slices.',
        tags: ['shape coordinates', 'parity', 'iterative deepening'],
        camera: { distance: 8.8, perspective: [6, 5.1, 7.4] },
    },
    parameters: rubiksModule.parameters
        .filter((p) => p.key !== 'size')
        .map((p) =>
            p.key === 'scrambleLength'
                ? {
                      ...p,
                      description:
                          '0–100 legal blocks. Each block is a nonzero rotation pair followed by an unblocked slice.',
                  }
                : p,
        ),
    defaults: { scrambleLength: 20, seed: 42 },
    presets: rubiksModule.presets,
    preservePresetParams: true,
    pseudocode: [
        'generate legal seeded rotation-pair / slice blocks',
        'prepare shape/parity and permutation/middle pruning tables',
        'iterative deepening: restore cube shape and required parity',
        'iterative deepening: restore corners, edges and middle layer',
        'replay only legal rotations and unsplit rigid slices',
        'verify all wedges, poses and middle halves; report success',
    ].map((text, i) => ({ id: i + 1, text })),
    education: {
        overview:
            'Square-1 has eight 60° corners, eight 30° edges and two middle halves. Rotations change which pieces meet the slice cuts; a corner spanning a cut blocks the slice. Replay shows a verified solution path rather than internal search branches.',
        intuition:
            'Phase 1 searches 3,678 ring shapes with two parity classes, restoring cube shape and the parity needed by phase 2. Phase 2 searches corner/edge permutations, layer alignments and middle orientation. Generated pruning tables supply lower bounds to iterative deepening. The solver receives only the current state and does not reverse its scramble.',
        complexity:
            'Exponential search in the solution depth; generated coordinate tables provide pruning. Complete replay has no imposed step ceiling; solutions are not guaranteed shortest. Tables and search run in a cancellable worker.',
        applications:
            'Constrained state-space search and rigid shape-changing mechanisms. (a,b) uses 30° units: top clockwise from above, bottom clockwise from below; / is a legal 180° slice. Scramble length counts rotation-pair/slice blocks. Solution counts use one operation per nonzero pair and one per slice; phase markers count zero.',
        legend: [
            {
                label: 'Rigid wedges',
                color: '#549667',
                meaning: 'Eight corners and eight edges keep their widths and colors.',
            },
            {
                label: 'Selected',
                color: '#d1ad64',
                meaning: 'Inspect every wedge and both middle halves.',
            },
        ],
        references: [
            {
                label: 'Jaap Scherphuis: Square-1 rules, notation and parity',
                url: 'https://www.jaapsch.net/puzzles/square1.htm',
                kind: 'standard',
            },
            {
                label: 'Chen Shuang: sq12phase coordinate transitions (pinned MIT source)',
                url: 'https://github.com/cs0x7f/sq12phase/tree/da3a445fc103656c4e8668bce9c5c9ac41e26c41',
                kind: 'implementation',
            },
        ],
    },
    createTrace: (params) => squareTrace(params as SquareParams),
    renderer: lazy(() => import('./SquareScene')),
    inspect: inspectSquare,
}
