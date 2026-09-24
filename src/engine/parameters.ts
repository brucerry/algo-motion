import type { ParameterDefinition, Params, ParamValue } from './types'

export function defaultsFor(definitions: ParameterDefinition[]): Params {
    return Object.fromEntries(
        definitions.map((definition) => [definition.key, definition.defaultValue]),
    )
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
    return { params, errors }
}
