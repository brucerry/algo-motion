import { lazy } from 'react'
import type { AlgorithmModule } from '../../engine/types'
import { rrtModule } from './module'
import { inspectRrt } from './rrt'
import { rrtStarSteps, runRrtStar, type RrtStarParams, type RrtStarState } from './rrtStar'
export const rrtStarModule: AlgorithmModule<RrtStarState> = {
    meta: {
        ...rrtModule.meta,
        id: 'rrt-star',
        name: 'Rapidly-exploring Random Tree Star',
        shortName: 'RRT*',
        description: 'Choose cheaper parents and rewire branches while improving the best route.',
        tags: ['robotics', 'sampling', 'rewiring'],
    },
    parameters: [
        ...rrtModule.parameters,
        {
            type: 'number',
            key: 'rewireRadius',
            label: 'Maximum rewire radius',
            defaultValue: 2.5,
            min: 0.1,
            max: 100,
            step: 0.05,
            bounds: (params) => ({
                min: Number(params.stepSize),
                max: Number(params.workspace) / 2,
            }),
            description:
                'Cap for the shrinking 3D neighborhood used in parent selection and rewiring.',
        },
    ],
    defaults: { ...rrtModule.defaults, rewireRadius: 2.5 },
    presets: [
        {
            name: 'Open-space improvement',
            values: { obstacleCount: 0, maxIterations: 500, seed: 19 },
        },
        {
            name: 'Visible rewiring',
            values: { obstacleCount: 5, maxIterations: 800, rewireRadius: 3, seed: 91 },
        },
        { name: 'Short budget', values: { maxIterations: 1, goalBias: 0, seed: 32 } },
    ],
    pseudocode: [
        'tree ← {start}; best route ← none',
        'sample, steer, and reject collisions or duplicates',
        'choose the cheapest collision-free nearby parent',
        'insert the new node and its edge',
        'rewire cheaper neighbors; update descendant costs',
        'connect or improve the goal route; keep searching',
        'return best route after the iteration budget, or incomplete',
    ].map((text, index) => ({ id: index + 1, text })),
    education: {
        overview:
            'RRT* adds cost-aware parent choice and rewiring to a sampling tree and continues after its first feasible route.',
        intuition:
            'New points can create shortcuts for existing branches. Every rewired descendant inherits the cost improvement. The highlighted route is the best found so far; finite budgets and this configurable radius do not guarantee a globally shortest route.',
        complexity:
            'Linear nearest/neighbor scans plus collision checks and descendant propagation: worst case up to O(N³ + N²B) time and O(N) tree storage for N iterations and B obstacles, excluding replay frames.',
        applications: 'Improving feasible robot-motion routes in continuous collision spaces.',
        formula: 'r_n = \\min(r_{max},\\gamma(\\log(n)/n)^{1/3})',
        legend: [
            ...rrtModule.education.legend,
            {
                label: 'Frontier',
                color: '#e3c26e',
                meaning: 'Nearby parent candidates or rewired edge',
                mark: '↪',
            },
        ],
        references: [
            {
                label: 'Karaman and Frazzoli, Sampling-based Algorithms for Optimal Motion Planning (2011)',
                url: 'https://arxiv.org/abs/1105.1186',
                kind: 'original',
            },
            {
                label: 'This site: 3D spheres, linear neighbor scans, and configurable radius cap',
                url: '#/algorithm/rrt-star',
                kind: 'implementation',
            },
        ],
    },
    run: (params) => runRrtStar(params as RrtStarParams),
    steps: (params) => rrtStarSteps(params as RrtStarParams),
    renderer: lazy(() => import('./RrtScene')),
    inspect: inspectRrt,
}
