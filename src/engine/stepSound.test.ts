import { describe, expect, it } from 'vitest'
import { shouldPlayStepCue } from './stepSound'

const transition = {
    enabled: true,
    source: 'playback' as const,
    sameRun: true,
    previousFrame: 2,
    nextFrame: 3,
    hidden: false,
}

describe('step cue eligibility', () => {
    it('allows only displayed playback and manual transitions', () => {
        expect(shouldPlayStepCue(transition)).toBe(true)
        expect(shouldPlayStepCue({ ...transition, source: 'manual' })).toBe(true)
        expect(shouldPlayStepCue({ ...transition, enabled: false })).toBe(false)
        expect(shouldPlayStepCue({ ...transition, source: null })).toBe(false)
        expect(shouldPlayStepCue({ ...transition, previousFrame: 3 })).toBe(false)
    })

    it('ignores initial frames, changed runs, and hidden tabs', () => {
        expect(shouldPlayStepCue({ ...transition, previousFrame: null })).toBe(false)
        expect(shouldPlayStepCue({ ...transition, nextFrame: null })).toBe(false)
        expect(shouldPlayStepCue({ ...transition, sameRun: false })).toBe(false)
        expect(shouldPlayStepCue({ ...transition, hidden: true })).toBe(false)
    })
})
