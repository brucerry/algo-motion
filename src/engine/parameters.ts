import type { ParameterDefinition, Params, ParamValue } from './types'

export function defaultsFor(definitions: ParameterDefinition[]): Params {
    return Object.fromEntries(
        definitions.map((definition) => [definition.key, definition.defaultValue]),
    )
}

export function resolveParameterDefinition(
    definition: ParameterDefinition,
    params: Params,
): ParameterDefinition {
    if (definition.type !== 'number' || !definition.bounds) return definition
    const bounds = definition.bounds(params)
    const min = Math.max(definition.min, bounds.min ?? definition.min)
    const max = Math.min(definition.max, bounds.max ?? definition.max)
    return { ...definition, min: Math.min(min, max), max }
}

export function resolveParameterDefinitions(
    definitions: ParameterDefinition[],
    params: Params,
): ParameterDefinition[] {
    return definitions.map((definition) => resolveParameterDefinition(definition, params))
}

export function parseParameter(
    definition: ParameterDefinition,
    value: unknown,
): { value?: ParamValue; error?: string } {
    if (definition.type === 'boolean') {
        if (value === true || value === 'true') return { value: true }
        if (value === false || value === 'false') return { value: false }
        return { error: `${definition.label} must be true or false.` }
    }
    if (definition.type === 'select') {
        if (
            typeof value === 'string' &&
            definition.options.some((option) => option.value === value)
        )
            return { value }
        return { error: `Choose a valid ${definition.label.toLowerCase()}.` }
    }
    if (value === '' || value === null || value === undefined || typeof value === 'boolean')
        return { error: `${definition.label} must be a number.` }
    const number = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(number)) return { error: `${definition.label} must be finite.` }
    if (definition.type === 'seed') {
        if (!Number.isInteger(number) || number < 0 || number > 4294967295)
            return { error: `${definition.label} must be an integer from 0 to 4294967295.` }
        return { value: number }
    }
    if (
        number < definition.min ||
        number > definition.max ||
        (definition.integer && !Number.isInteger(number))
    ) {
        return {
            error: `${definition.label} must be ${definition.integer ? 'an integer ' : ''}from ${definition.min} to ${definition.max}.`,
        }
    }
    return { value: number }
}

export function validateParameters(
    definitions: ParameterDefinition[],
    raw: Record<string, unknown>,
): { params: Params; errors: Record<string, string> } {
    const params = defaultsFor(definitions)
    const errors: Record<string, string> = {}
    for (const definition of definitions) {
        if (!(definition.key in raw)) continue
        const result = parseParameter(definition, raw[definition.key])
        if (result.error) errors[definition.key] = result.error
        else params[definition.key] = result.value!
    }
    for (let pass = 0; pass < definitions.length; pass++) {
        let changed = false
        for (const definition of definitions) {
            if (definition.type !== 'number' || !definition.bounds) continue
            const resolved = resolveParameterDefinition(definition, params)
            if (resolved.type !== 'number') continue
            const value = Number(params[definition.key])
            const adjusted = Math.max(resolved.min, Math.min(resolved.max, value))
            if (adjusted === value) continue
            params[definition.key] = adjusted
            errors[definition.key] =
                `${definition.label} adjusted to ${adjusted} (allowed ${resolved.min} to ${resolved.max}).`
            changed = true
        }
        if (!changed) break
    }
    return { params, errors }
}
