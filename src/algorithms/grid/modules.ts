import { lazy } from 'react'
import type {
    AlgorithmModule,
    Education,
    ParameterDefinition,
    Params,
    PseudocodeLine,
} from '../../engine/types'
import {
    gridDefaults,
    inspectGrid,
    runGrid,
    type GridAlgorithm,
    type GridParams,
    type GridState,
} from './grid'

const GridScene = lazy(() => import('./GridScene'))

const common: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'width',
        label: 'Grid width',
        defaultValue: 16,
        min: 4,
        max: 240,
        step: 1,
        integer: true,
        control: 'slider',
        description: 'Number of cells across the grid.',
    },
    {
        type: 'number',
        key: 'depth',
        label: 'Grid depth',
        defaultValue: 12,
        min: 4,
        max: 240,
        step: 1,
        integer: true,
        control: 'slider',
        description: 'Number of cells from front to back.',
    },
    {
        type: 'number',
        key: 'density',
        label: 'Obstacle density',
        defaultValue: 0.18,
        min: 0,
        max: 0.38,
        step: 0.01,
        control: 'slider',
        description: 'Fraction of cells blocked by seeded obstacles.',
    },
    {
        type: 'boolean',
        key: 'diagonal',
        label: 'Diagonal movement',
        defaultValue: false,
        description: 'Allow diagonals when adjacent corners are clear.',
    },
    {
        type: 'seed',
        key: 'seed',
        label: 'Random seed',
        defaultValue: 12345,
        description: 'Same seed and settings produce the same map.',
    },
]
const weightMode: ParameterDefinition = {
    type: 'select',
    key: 'weightMode',
    label: 'Edge weighting',
    defaultValue: 'uniform',
    options: [
        { label: 'Uniform', value: 'uniform' },
        { label: 'Terrain 1–6', value: 'terrain' },
    ],
    description: 'Terrain costs are paid when entering a cell.',
}
const heuristic: ParameterDefinition = {
    type: 'select',
    key: 'heuristic',
    label: 'Heuristic',
    defaultValue: 'manhattan',
    options: [
        { label: 'Manhattan', value: 'manhattan' },
        { label: 'Euclidean', value: 'euclidean' },
        { label: 'Chebyshev', value: 'chebyshev' },
    ],
    description: 'Estimate of distance to the goal.',
}
const heuristicWeight: ParameterDefinition = {
    type: 'number',
    key: 'heuristicWeight',
    label: 'Heuristic weight',
    defaultValue: 1,
    min: 0,
    max: 3,
    step: 0.1,
    control: 'slider',
    description: 'Above 1 can reduce exploration but loses optimality guarantees.',
}

const legend = [
    {
        label: 'Unvisited',
        color: '#cbded7',
        mark: '·',
        meaning: 'Low block: traversable cell not yet discovered',
    },
    {
        label: 'Frontier',
        color: '#f5d36e',
        mark: '○',
        meaning: 'Raised block: discovered and waiting',
    },
    {
        label: 'Current',
        color: '#eb9867',
        mark: '◎',
        meaning: 'Tall block with ink ring: cell selected in this step',
    },
    { label: 'Visited', color: '#8bb9cb', mark: '✓', meaning: 'Low block: cell already explored' },
    {
        label: 'Solution',
        color: '#78bd8c',
        mark: '━',
        meaning: 'Raised blocks joined by a drawn route',
    },
    { label: 'Obstacle', color: '#9a7072', mark: '▧', meaning: 'Tall impassable block' },
    { label: 'Start', color: '#5cae9e', mark: '◆', meaning: 'Route origin with a diamond marker' },
    { label: 'Goal', color: '#be8fc7', mark: '▲', meaning: 'Target cell with a pointed marker' },
]

const content: Record<GridAlgorithm, Education> = {
    dfs: {
        overview:
            'Depth-first search follows one branch as far as possible before reversing to try another.',
        intuition:
            'The active stack remembers the current route. Each newly discovered neighbor is explored before its siblings.',
        complexity:
            'Time O(V + E), space O(V), excluding recorded frames. Its first route need not be shortest.',
        applications: 'Reachability, maze exploration, and traversal order.',
        legend,
        references: [
            {
                label: 'Introduction to Algorithms, depth-first search',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    bfs: {
        overview:
            'Breadth-first search explores a graph in increasing numbers of edges from the start.',
        intuition:
            'A queue expands the nearest undiscovered layer first. On an unweighted grid, the first route to the goal uses the fewest moves.',
        complexity:
            'Time O(V + E), space O(V). The route minimizes hops, not weighted terrain cost.',
        applications: 'Unweighted maze solving, reachability checks, and minimum-hop routing.',
        legend,
        references: [
            {
                label: 'Introduction to Algorithms, graph traversal',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    dijkstra: {
        overview:
            'Dijkstra’s algorithm finds minimum-cost paths when all edge costs are nonnegative.',
        intuition:
            'Always settle the frontier cell with the smallest known cost, then relax its neighbors.',
        complexity:
            'With a priority frontier, O((V + E) log V) time and O(V + E) working space on this grid, excluding recorded steps.',
        applications: 'Weighted route planning and network path selection.',
        legend,
        references: [
            {
                label: 'Dijkstra, A note on two problems in connexion with graphs (1959)',
                url: 'https://doi.org/10.1007/BF01386390',
                kind: 'original',
            },
        ],
    },
    astar: {
        overview:
            'A* combines known path cost g with a goal estimate h to choose which frontier cell to explore next.',
        intuition:
            'The f score is g + weight × h. With a suitable admissible estimate and weight 1, A* can find a minimum-cost path while exploring fewer cells.',
        complexity:
            'Worst-case search can still expand exponentially many states in general graphs. This grid implementation uses a priority frontier and records steps for replay.',
        applications: 'Game navigation, robotic route planning, and heuristic search.',
        formula: String.raw`f(n)=g(n)+w\,h(n)`,
        legend,
        references: [
            {
                label: 'Hart, Nilsson & Raphael, A Formal Basis for the Heuristic Determination of Minimum Cost Paths (1968)',
                url: 'https://doi.org/10.1109/TSSC.1968.300136',
                kind: 'original',
            },
            {
                label: 'This site: seeded terrain, visualization frames, and adjustable heuristic weight',
                url: '#/algorithm/astar',
                kind: 'implementation',
            },
        ],
    },
}

const pseudocode: Record<GridAlgorithm, PseudocodeLine[]> = {
    dfs: [
        { id: 1, text: 'start at the first cell' },
        { id: 2, text: 'visit the current cell' },
        { id: 3, text: 'push it on the active stack' },
        { id: 4, text: 'explore each unvisited neighbor in order' },
        { id: 5, text: 'if goal: reconstruct this route' },
        { id: 6, text: 'otherwise: pop and backtrack' },
        { id: 7, text: 'if all branches end: no path' },
    ],
    bfs: [
        { id: 1, text: 'queue ← [start]; mark start discovered' },
        { id: 2, text: 'while queue is not empty:' },
        { id: 3, text: '  current ← dequeue(queue)' },
        { id: 4, text: '  enqueue each undiscovered neighbor' },
        { id: 5, text: 'if current is goal: reconstruct path' },
        { id: 6, text: 'otherwise: no path exists' },
    ],
    dijkstra: [
        { id: 1, text: 'distance[start] ← 0; frontier ← {start}' },
        { id: 2, text: 'while frontier is not empty:' },
        { id: 3, text: '  current ← node with lowest distance' },
        { id: 4, text: '  relax each traversable edge' },
        { id: 5, text: 'if current is goal: reconstruct path' },
        { id: 6, text: 'otherwise: no path exists' },
    ],
    astar: [
        { id: 1, text: 'g(start) ← 0; open ← {start}' },
        { id: 2, text: 'while open is not empty:' },
        { id: 3, text: '  current ← lowest g + weight × h' },
        { id: 4, text: '  update better routes to neighbors' },
        { id: 5, text: 'if current is goal: reconstruct path' },
        { id: 6, text: 'otherwise: no path exists' },
    ],
}

function makeGridModule(
    id: GridAlgorithm,
    name: string,
    description: string,
    parameters: ParameterDefinition[],
    presets: AlgorithmModule<GridState>['presets'],
): AlgorithmModule<GridState> {
    const defaults: Params = Object.fromEntries(
        parameters.map((item) => [item.key, item.defaultValue]),
    )
    return {
        meta: {
            id,
            name,
            shortName: id === 'astar' ? 'A*' : name,
            category: 'Graph Search',
            dimensionality: '2D grid in 3D',
            description,
            tags: ['grid', 'pathfinding', ...(id === 'dfs' ? ['dfs', 'backtracking'] : [])],
        },
        parameters,
        defaults,
        presets,
        pseudocode: pseudocode[id],
        education: content[id],
        renderer: GridScene,
        run: (params) => runGrid(id, { ...gridDefaults, ...params } as GridParams),
        inspect: inspectGrid,
    }
}

export const astarModule = makeGridModule(
    'astar',
    'A* Search',
    'Heuristic-guided shortest-path search on a seeded grid.',
    [...common, heuristic, heuristicWeight],
    [
        { name: 'Easy maze', values: { width: 14, depth: 10, density: 0.12, seed: 1402 } },
        { name: 'Dense obstacles', values: { width: 20, depth: 18, density: 0.32, seed: 8021 } },
        { name: 'Open field', values: { width: 20, depth: 16, density: 0.03, seed: 123 } },
        {
            name: 'Weighted search',
            values: { heuristicWeight: 1.8, diagonal: true, heuristic: 'euclidean' },
        },
    ],
)
export const bfsModule = makeGridModule(
    'bfs',
    'Breadth-First Search',
    'Explore a grid layer by layer and find the fewest-hop route.',
    common,
    [
        { name: 'Open field', values: { density: 0.02, seed: 17 } },
        { name: 'Maze', values: { density: 0.28, seed: 12345 } },
    ],
)
export const dijkstraModule = makeGridModule(
    'dijkstra',
    'Dijkstra',
    'Find the least-cost route across uniform or weighted terrain.',
    [...common, weightMode],
    [
        { name: 'Uniform grid', values: { weightMode: 'uniform', density: 0.16 } },
        {
            name: 'Weighted detour',
            values: {
                width: 6,
                depth: 5,
                density: 0,
                diagonal: false,
                weightMode: 'terrain',
                seed: 353,
            },
        },
    ],
)
export const dfsModule = makeGridModule(
    'dfs',
    'Depth-First Search',
    'Follow one grid branch, then backtrack when it ends.',
    common.map((definition) =>
        definition.type === 'number' && (definition.key === 'width' || definition.key === 'depth')
            ? { ...definition, max: 240 }
            : definition,
    ),
    [
        { name: 'Open field', values: { density: 0.02, seed: 17 } },
        { name: 'Branching maze', values: { density: 0.25, seed: 12345 } },
    ],
)
