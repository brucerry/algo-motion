import type { ParameterDefinition, Params } from './types'
import { validateParameters } from './parameters'

export function encodeHash(algorithmId: string, params: Params): string {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
        query.set(key, String(value))
    return `#/algorithm/${encodeURIComponent(algorithmId)}?${query.toString()}`
}

export function parseHash(hash: string): {
    algorithmId: string | null
    raw: Record<string, string>
    explicit: boolean
} {
    const match = /^#\/algorithm\/([^?/#]+)(?:\?(.*))?$/.exec(hash)
    if (!match) return { algorithmId: null, raw: {}, explicit: false }
    let algorithmId: string
    try {
        algorithmId = decodeURIComponent(match[1])
    } catch {
        return { algorithmId: null, raw: {}, explicit: false }
    }
    return {
        algorithmId,
        raw: Object.fromEntries(new URLSearchParams(match[2] || '')),
        explicit: true,
    }
}

export function decodeHash(hash: string, definitions: ParameterDefinition[]) {
    const route = parseHash(hash)
    const { params, errors } = validateParameters(definitions, route.raw)
    return { ...route, params, errors }
}
