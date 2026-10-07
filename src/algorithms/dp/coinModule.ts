import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { knapsackModule } from './module'
import {
    coinSteps,
    inspectCoin,
    runCoinChange,
    type CoinParams,
    type CoinState,
} from './coinChange'
const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'amount',
        label: 'Target amount',
        defaultValue: 10,
        min: 0,
        max: 300,
        integer: true,
        control: 'slider',
    },
    ...[1, 2, 3].map((index): ParameterDefinition => ({
        type: 'number',
        key: `coin${index}`,
        label: `Coin denomination ${index}`,
        defaultValue: [1, 5, 7][index - 1],
        min: 1,
        max: 100,
        integer: true,
        description: 'Positive denomination; duplicates are combined. Coins may be reused.',
    })),
]
export const coinModule: AlgorithmModule<CoinState> = {
    meta: {
        id: 'coin-change',
        name: 'Coin Change — Minimum Coins',
        shortName: 'Coin Change',
        category: 'Dynamic Programming',
        dimensionality: 'Table in 3D',
        description: 'Reuse smaller amounts to find the fewest coins and reconstruct them.',
        tags: ['dynamic programming', 'unbounded', 'minimum coins'],
        camera: { distance: 14, targetY: 0.5, perspective: [0, 10, 12] },
    },
    parameters,
    defaults: { amount: 10, coin1: 1, coin2: 5, coin3: 7 },
    presets: [
        { name: 'Greedy trap', values: { amount: 10, coin1: 1, coin2: 5, coin3: 7 } },
        { name: 'Unreachable amount', values: { amount: 7, coin1: 2, coin2: 4, coin3: 6 } },
        { name: 'Zero amount', values: { amount: 0 } },
    ],
    pseudocode: [
        'dp[0] ← 0; all other amounts ← infinity',
        'for each amount and usable coin',
        'candidate ← dp[amount − coin] + 1',
        'keep a smaller candidate and remember its coin',
        'if reachable, reconstruct by subtracting chosen coins',
        'return the minimum count and chosen coins',
    ].map((text, index) => ({ id: index + 1, text })),
    education: {
        overview:
            'Find the fewest coins needed to make an exact amount, allowing each denomination to be reused.',
        intuition:
            'Every solution ends with a coin. Try each possible last coin and reuse the best result for the remaining amount. Greedy choice alone can fail for arbitrary denominations.',
        complexity:
            'O(A × C) time and O(A) working space for target amount A and C distinct denominations, excluding replay frames.',
        applications:
            'Exact change, resource composition, and shortest sequences of fixed increments.',
        formula: 'dp[a] = 1 + \\min_{c \\leq a} dp[a-c]',
        legend: [
            { label: 'Current', color: '#eb9867', meaning: 'Amount being improved', mark: '◎' },
            { label: 'Frontier', color: '#e3c26e', meaning: 'Predecessor amount', mark: '←' },
            { label: 'Visited', color: '#8bb9cb', meaning: 'Reachable amount', mark: '✓' },
            {
                label: 'Solution',
                color: '#78bd8c',
                meaning: 'Reconstructed amounts and coins',
                mark: '◆',
            },
        ],
        references: knapsackModule.education.references,
    },
    run: (params) => runCoinChange(params as CoinParams),
    steps: (params) => coinSteps(params as CoinParams),
    renderer: lazy(() => import('./CoinScene')),
    inspect: inspectCoin,
}
