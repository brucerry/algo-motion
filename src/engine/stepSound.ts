export type StepCueSource = 'playback' | 'manual' | null

export function shouldPlayStepCue({
    enabled,
    source,
    sameRun,
    previousFrame,
    nextFrame,
    hidden,
}: {
    enabled: boolean
    source: StepCueSource
    sameRun: boolean
    previousFrame: number | null
    nextFrame: number | null
    hidden: boolean
}) {
    return (
        enabled &&
        source !== null &&
        sameRun &&
        previousFrame !== null &&
        nextFrame !== null &&
        previousFrame !== nextFrame &&
        !hidden
    )
}

export class StepSound {
    private context: AudioContext | null = null

    async enable() {
        const Constructor = window.AudioContext
        if (!Constructor) return false
        try {
            this.context ??= new Constructor()
            if (this.context.state === 'suspended') await this.context.resume()
            return this.context.state === 'running'
        } catch {
            return false
        }
    }

    play() {
        const context = this.context
        if (!context || context.state !== 'running') return false
        try {
            const oscillator = context.createOscillator()
            const volume = context.createGain()
            const now = context.currentTime
            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(540, now)
            oscillator.frequency.exponentialRampToValueAtTime(380, now + 0.09)
            volume.gain.setValueAtTime(0.0001, now)
            volume.gain.exponentialRampToValueAtTime(0.055, now + 0.012)
            volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
            oscillator.connect(volume)
            volume.connect(context.destination)
            oscillator.start(now)
            oscillator.stop(now + 0.13)
            oscillator.onended = () => {
                oscillator.disconnect()
                volume.disconnect()
            }
            return true
        } catch {
            return false
        }
    }

    close() {
        const context = this.context
        this.context = null
        if (context) void context.close().catch(() => {})
    }
}
