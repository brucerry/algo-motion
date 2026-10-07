import { describe, expect, it } from 'vitest'
import { runCoinChange } from './coinChange'
const oracle = (amount: number, coins: number[]) => {
    const queue: [number, number][] = [[0, 0]],
        seen = new Set([0])
    for (let index = 0; index < queue.length; index++) {
        const [sum, count] = queue[index]
        if (sum === amount) return count
        for (const coin of coins)
            if (sum + coin <= amount && !seen.has(sum + coin)) {
                seen.add(sum + coin)
                queue.push([sum + coin, count + 1])
            }
    }
    return Infinity
}
describe('minimum-coin change', () => {
    it('matches an independent breadth-first optimum and reconstructs exact amounts', () => {
        for (const coins of [
            [1, 5, 7],
            [2, 4, 6],
            [3, 3, 8],
        ])
            for (let amount = 0; amount <= 24; amount++) {
                const result = runCoinChange({
                    amount,
                    coin1: coins[0],
                    coin2: coins[1],
                    coin3: coins[2],
                })
                const final = result.frames.at(-1)!.state,
                    optimum = oracle(amount, coins)
                expect(final.table[amount]).toBe(optimum)
                if (Number.isFinite(optimum)) {
                    expect(result.outcome).toBe('success')
                    expect(final.chosen.length).toBe(optimum)
                    expect(final.chosen.reduce((sum, coin) => sum + coin, 0)).toBe(amount)
                } else {
                    expect(result.outcome).toBe('no-solution')
                    expect(final.chosen).toEqual([])
                }
            }
    })
    it('shows the non-greedy optimum and replays unchanged', () => {
        const params = { amount: 10, coin1: 1, coin2: 5, coin3: 7 }
        const run = runCoinChange(params)
        expect(run.frames.at(-1)!.state.chosen).toEqual([5, 5])
        expect(
            run.frames.some(
                (frame) => frame.event === 'consider' && frame.state.predecessor !== null,
            ),
        ).toBe(true)
        expect(runCoinChange(params)).toEqual(run)
        expect(() => runCoinChange({ ...params, coin1: 0 })).toThrow()
    })
})
