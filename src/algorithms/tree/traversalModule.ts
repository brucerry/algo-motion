import { lazy } from 'react'
import type { AlgorithmModule } from '../../engine/types'
import { bstModule } from './module'
import {
    inspectTraversal,
    runTraversal,
    traversalSteps,
    type TraversalParams,
    type TraversalState,
} from './traversal'
export const traversalModule: AlgorithmModule<TraversalState> = {
    meta: {
        ...bstModule.meta,
        id: 'inorder-traversal',
        name: 'In-order Traversal',
        shortName: 'In-order Traversal',
        description: 'Visit left subtree, node, then right subtree to reveal sorted keys.',
        tags: ['tree', 'traversal', 'stack'],
    },
    parameters: bstModule.parameters.filter((parameter) => parameter.key !== 'target'),
    defaults: { count: 9, seed: 12345 },
    presets: [
        { name: 'Small tree', values: { count: 6, seed: 32 } },
        { name: 'Large traversal', values: { count: 512, seed: 19 } },
    ],
    pseudocode: [
        'current ← root; stack ← empty',
        'push current; descend left until empty',
        'pop the next node',
        'visit node and append its key',
        'current ← right child',
        'return the ascending visit order',
    ].map((text, index) => ({ id: index + 1, text })),
    education: {
        overview: 'In-order traversal visits every BST key in ascending order.',
        intuition:
            'The explicit stack remembers ancestors while their smaller left keys are visited. Pop an ancestor, visit it, and then explore its larger right keys.',
        complexity: 'O(n) time and O(h) stack space for tree height h, excluding replay frames.',
        applications: 'Enumerating ordered sets, validating BST order, and producing sorted keys.',
        legend: bstModule.education.legend,
        references: bstModule.education.references,
    },
    run: (params) => runTraversal(params as TraversalParams),
    steps: (params) => traversalSteps(params as TraversalParams),
    renderer: lazy(() => import('./BstScene')),
    cameraForState: bstModule.cameraForState,
    inspect: inspectTraversal,
}
