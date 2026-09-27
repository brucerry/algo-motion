export type Theme = 'light' | 'dark'

export const scenePalettes = {
    light: {
        background: '#f4ead1',
        ground: '#e8dcc0',
        grid: '#b7aa91',
        ink: '#34404a',
        unvisited: '#cbded7',
        frontier: '#f5d36e',
        current: '#eb9867',
        visited: '#8bb9cb',
        solution: '#78bd8c',
        obstacle: '#9a7072',
        start: '#5cae9e',
        goal: '#be8fc7',
        selected: '#ffffff',
        tree: '#65828a',
        newest: '#eb9867',
        rejected: '#d67972',
        surface: '#83baca',
        point: '#ed986c',
        trail: '#398e70',
        direction: '#cb8b28',
    },
    dark: {
        background: '#20373b',
        ground: '#294347',
        grid: '#718e88',
        ink: '#f8ebd4',
        unvisited: '#547076',
        frontier: '#f4d57a',
        current: '#f3a16e',
        visited: '#8bbdc9',
        solution: '#88cca0',
        obstacle: '#ac787a',
        start: '#78caba',
        goal: '#d8a6db',
        selected: '#ffffff',
        tree: '#c0d5d3',
        newest: '#f3a16e',
        rejected: '#e58d85',
        surface: '#619cae',
        point: '#f0aa79',
        trail: '#8ed2a5',
        direction: '#f2cc6d',
    },
} as const

export type SceneTone = keyof (typeof scenePalettes)['light']
export const scenePalette = (theme: Theme) => scenePalettes[theme]

const legendTones: Record<string, SceneTone> = {
    Unvisited: 'unvisited',
    Frontier: 'frontier',
    Current: 'current',
    Visited: 'visited',
    Solution: 'solution',
    Obstacle: 'obstacle',
    Start: 'start',
    Goal: 'goal',
    Tree: 'tree',
    Newest: 'newest',
    Rejected: 'rejected',
    Surface: 'surface',
    'Current point': 'point',
    Trail: 'trail',
    'Descent direction': 'direction',
}

export const legendTone = (label: string): SceneTone | undefined => legendTones[label]
