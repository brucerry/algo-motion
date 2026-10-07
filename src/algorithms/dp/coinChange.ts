import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps, type ProducedStep } from '../../engine/steps'
export type CoinParams = Params & { amount: number; coin1: number; coin2: number; coin3: number }
export type CoinState = {
    amount: number
    coins: number[]
    table: number[]
    choices: number[]
    current: number | null
    predecessor: number | null
    coin: number | null
    candidate: number | null
    chosen: number[]
    route: number[]
    comparisons: number
}
export function* coinSteps(
    params: CoinParams,
): Generator<ProducedStep<CoinState>, SimulationRun<CoinState>['outcome']> {
    if (
        !Number.isInteger(params.amount) ||
        params.amount < 0 ||
        params.amount > 300 ||
        [params.coin1, params.coin2, params.coin3].some(
            (coin) => !Number.isInteger(coin) || coin < 1 || coin > 100,
        )
    )
        throw new Error('Use an amount from 0 to 300 and positive integer coins from 1 to 100.')
    const coins = [...new Set([params.coin1, params.coin2, params.coin3])].sort((a, b) => a - b)
    const table = Array<number>(params.amount + 1).fill(Infinity),
        choices = Array<number>(params.amount + 1).fill(-1)
    table[0] = 0
    let current: number | null = 0,
        predecessor: number | null = null,
        coin: number | null = null
    let candidate: number | null = null,
        comparisons = 0,
        index = 0
    const chosen: number[] = [],
        route: number[] = []
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<CoinState> => {
        const step = index++
        return {
            index: step,
            materialize: () => ({
                index: step,
                event,
                explanation,
                activeLines,
                state: {
                    amount: params.amount,
                    coins,
                    table: [...table],
                    choices: [...choices],
                    current,
                    predecessor,
                    coin,
                    candidate,
                    chosen: [...chosen],
                    route: [...route],
                    comparisons,
                },
                metrics: [
                    { label: 'Considered coins', value: comparisons },
                    {
                        label: 'Minimum coins',
                        value: Number.isFinite(table[params.amount])
                            ? table[params.amount]
                            : 'Unreachable',
                    },
                    { label: 'Reconstructed coins', value: chosen.length },
                ],
            }),
        }
    }
    yield record(
        'initialize',
        'Amount zero needs zero coins. Other amounts begin unreachable.',
        [1],
    )
    for (current = 1; current <= params.amount; current++) {
        for (coin of coins) {
            if (coin > current) continue
            predecessor = current - coin
            candidate = Number.isFinite(table[predecessor]) ? table[predecessor] + 1 : null
            comparisons++
            yield record(
                'consider',
                `For amount ${current}, consider coin ${coin} and predecessor ${predecessor}; candidate is ${candidate ?? 'unreachable'}.`,
                [2, 3],
            )
            if (candidate !== null && candidate < table[current]) {
                table[current] = candidate
                choices[current] = coin
                yield record(
                    'update',
                    `Amount ${current} now needs ${candidate} coins, ending with denomination ${coin}.`,
                    [4],
                )
            }
        }
    }
    current = params.amount
    predecessor = null
    candidate = null
    coin = null
    if (!Number.isFinite(table[params.amount])) {
        yield record(
            'no-solution',
            `Amount ${params.amount} cannot be made using ${coins.join(', ')}. No coins are reconstructed.`,
            [5],
        )
        return 'no-solution'
    }
    while (current > 0) {
        coin = choices[current]
        route.push(current)
        chosen.push(coin)
        predecessor = current - coin
        yield record(
            'reconstruct',
            `Choose coin ${coin}; the remaining amount is ${predecessor}.`,
            [5],
        )
        current = predecessor
    }
    route.push(0)
    current = null
    predecessor = null
    coin = null
    yield record(
        'success',
        `Minimum ${chosen.length} coins sum to ${params.amount}: ${chosen.join(' + ') || 'empty selection'}.`,
        [6],
    )
    return 'success'
}
export const runCoinChange = (params: CoinParams) => collectSteps(coinSteps(params))
export function inspectCoin(state: CoinState, selected: string): Metric[] | null {
    const amount = Number(selected)
    if (!Number.isInteger(amount) || amount < 0 || amount >= state.table.length) return null
    return [
        { label: 'Amount', value: amount },
        {
            label: 'Minimum coins',
            value: Number.isFinite(state.table[amount]) ? state.table[amount] : 'Unreachable',
        },
        {
            label: 'Last chosen coin',
            value: state.choices[amount] < 0 ? '—' : state.choices[amount],
        },
        {
            label: 'Current candidate',
            value: amount === state.current ? (state.candidate ?? '—') : '—',
        },
    ]
}
