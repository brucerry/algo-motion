import { describe, expect, it } from 'vitest'
import { outcomeLabel } from './outcome'

describe('terminal outcome labels', () => {
    it('distinguishes success, missing results, run limits, and errors', () => {
        expect(outcomeLabel).toEqual({
            success: 'Completed',
            'no-path': 'No path',
            'no-solution': 'No solution',
            limit: 'Iteration limit',
            error: 'Error',
        })
    })
})
