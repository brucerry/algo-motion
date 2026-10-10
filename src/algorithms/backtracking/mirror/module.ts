import { lazy } from 'react'
import type { AlgorithmModule } from '../../../engine/types'
import { rubiksModule } from '../rubiks/module'
import { mirrorTrace } from './trace'
import { inspectMirror, type MirrorParams, type MirrorState } from './replay'

export const mirrorModule: AlgorithmModule<MirrorState> = {
    meta: {
        id: 'mirror-cube',
        name: 'Mirror Cube — Shape Restoration',
        shortName: 'Mirror Cube',
        category: 'Backtracking',
        dimensionality: '3D',
        description: 'Restore a metallic shape-changing 3×3 mechanism with unequal rigid pieces.',
        tags: ['shape matching', 'two-phase search', 'iterative deepening'],
        camera: { distance: 10.3, perspective: [7, 5.7, 8.4] },
    },
    parameters: rubiksModule.parameters
        .filter((p) => p.key !== 'size')
        .map((p) =>
            p.key === 'scrambleLength'
                ? {
                      ...p,
                      description:
                          'Legal seeded face turns change the silhouette. Pieces retain their fixed dimensions.',
                  }
                : p,
        ),
    defaults: { scrambleLength: 20, seed: 42 },
    presets: rubiksModule.presets,
    preservePresetParams: true,
    pseudocode: [
        'generate legal seeded face turns on the unequal-cut mechanism',
        'prepare 3×3 correspondence and pruning tables',
        'search phase 1: orientations and equatorial slice membership',
        'search phase 2 with U/D turns and side-face half turns',
        'replay each face turn as a rigid piece transformation',
        'verify abstract solution and actual exterior boxes; report success',
    ].map((text, i) => ({ id: i + 1, text })),
    education: {
        ...rubiksModule.education,
        overview:
            'Mirror Cube uses a 3×3 mechanism with unequal cuts and a single metallic finish. Identify corners, edges and centers by shape, then restore the exterior. Replay shows a verified two-phase solution path, not the internal search branches.',
        intuition:
            'Piece identities and exact orientations correspond to a 3×3 cube. Phase 1 fixes abstract corner/edge orientations and slice membership; phase 2 restores permutations. Each rigid piece turns around the mechanism origin, preserving its home dimensions and changing the silhouette. Success additionally requires the actual boxes to restore the fixed exterior, allowing genuine geometric symmetries.',
        applications:
            'Shape recognition and state-space search. This fixed layout uses the same 0.55 / 0.95 / 1.50 partitions on all three axes; square center faces need no visible extra orientation goal. The dimensions describe this showcase, not a particular manufactured product. U/R/F/D/L/B stay cube-fixed; ′ is inverse and 2 is a half turn. Each face or half turn counts as one move.',
        legend: [
            {
                label: 'Metallic pieces',
                color: '#b9bec7',
                meaning: '26 rigid, unequal boxes; shape determines their role.',
            },
            {
                label: 'Selected',
                color: '#d1ad64',
                meaning: 'Inspect intrinsic dimensions, physical location and orientation.',
            },
        ],
        references: [
            {
                label: 'GANCUBE: Mirror Cube correspondence and shape-based identification',
                url: 'https://www.gancube.com/pages/mirror-cube-tutorial',
                kind: 'standard',
            },
            ...rubiksModule.education.references,
        ],
    },
    createTrace: (params) => mirrorTrace(params as MirrorParams),
    renderer: lazy(() => import('./MirrorScene')),
    inspect: inspectMirror,
}
