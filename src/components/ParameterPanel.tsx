import { useEffect, useRef, useState } from 'react'
import type { ParameterDefinition, Params, ParamValue } from '../engine/types'
import { parseParameter } from '../engine/parameters'
import { SketchIcon } from './SketchArt'

type Props = {
    definitions: ParameterDefinition[]
    params: Params
    presets: { name: string; values: Partial<Params> }[]
    onChange: (key: string, value: ParamValue) => void
    onPreset: (values: Partial<Params>) => void
    onReset: () => void
    onRandomize: () => void
    error?: string
}

function ParameterControl({
    definition,
    value,
    onChange,
    idPrefix,
}: {
    definition: ParameterDefinition
    value: ParamValue
    onChange: (value: ParamValue) => void
    idPrefix: string
}) {
    const [draft, setDraft] = useState(String(value))
    const [touched, setTouched] = useState(false)
    const sliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        setDraft(String(value))
        setTouched(false)
    }, [value, definition.key])
    useEffect(
        () => () => {
            if (sliderTimer.current) clearTimeout(sliderTimer.current)
        },
        [],
    )
    const result = parseParameter(definition, draft)
    const error = touched ? result.error : undefined
    const fieldId = `${idPrefix}-${definition.key}`
    const commit = () => {
        setTouched(true)
        if (!result.error && result.value !== undefined) onChange(result.value)
    }
    if (definition.type === 'boolean')
        return (
            <label className="field switch-field" title={definition.description}>
                <span>
                    <strong>{definition.label}</strong>
                    {definition.description && <small>{definition.description}</small>}
                </span>
                <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(event) => onChange(event.target.checked)}
                />
            </label>
        )
    if (definition.type === 'select')
        return (
            <label className="field" title={definition.description}>
                <span className="field-title">{definition.label}</span>
                <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
                    {definition.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {definition.description && <small>{definition.description}</small>}
            </label>
        )
    return (
        <div className="field" title={definition.description}>
            <label htmlFor={fieldId} className="field-title">
                {definition.label}
            </label>
            <div className="number-row">
                {definition.type === 'number' && definition.control === 'slider' && (
                    <input
                        aria-label={`${definition.label} slider`}
                        type="range"
                        min={definition.min}
                        max={definition.max}
                        step={definition.step || 1}
                        value={Number.isFinite(Number(draft)) ? Number(draft) : Number(value)}
                        onChange={(event) => {
                            const next = event.target.value
                            setDraft(next)
                            if (sliderTimer.current) clearTimeout(sliderTimer.current)
                            sliderTimer.current = setTimeout(() => onChange(Number(next)), 160)
                        }}
                    />
                )}
                <input
                    id={fieldId}
                    type="number"
                    value={draft}
                    min={definition.type === 'number' ? definition.min : 0}
                    max={definition.type === 'number' ? definition.max : 4294967295}
                    step={definition.type === 'number' ? definition.step || 'any' : 1}
                    aria-invalid={!!error}
                    aria-describedby={error ? `error-${fieldId}` : undefined}
                    onChange={(event) => {
                        setDraft(event.target.value)
                        setTouched(true)
                    }}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                />
            </div>
            {(definition.type === 'number' || definition.type === 'seed') && (
                <small className="parameter-range">
                    Allowed: {definition.type === 'number' ? definition.min : 0}–
                    {definition.type === 'number' ? definition.max : 4294967295}
                </small>
            )}
            {error && (
                <small id={`error-${fieldId}`} className="error-text" role="alert">
                    {error}
                </small>
            )}
            {definition.description && <small>{definition.description}</small>}
        </div>
    )
}

export function ParameterFields({
    definitions,
    params,
    onChange,
    idPrefix,
}: {
    definitions: ParameterDefinition[]
    params: Params
    onChange: (key: string, value: ParamValue) => void
    idPrefix: string
}) {
    return definitions.map((definition) => (
        <ParameterControl
            key={definition.key}
            definition={definition}
            value={params[definition.key]}
            onChange={(value) => onChange(definition.key, value)}
            idPrefix={idPrefix}
        />
    ))
}

export default function ParameterPanel({
    definitions,
    params,
    presets,
    onChange,
    onPreset,
    onReset,
    onRandomize,
    error,
}: Props) {
    const [presetName, setPresetName] = useState('')
    useEffect(() => setPresetName(''), [definitions])
    return (
        <div className="parameter-body">
            <div className="field">
                <label className="field-title" htmlFor="preset-select">
                    Preset
                </label>
                <select
                    id="preset-select"
                    value={presetName}
                    onChange={(event) => {
                        setPresetName(event.target.value)
                        const preset = presets.find((entry) => entry.name === event.target.value)
                        if (preset) onPreset(preset.values)
                    }}
                >
                    <option value="">Choose a scenario…</option>
                    {presets.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                            {preset.name}
                        </option>
                    ))}
                </select>
            </div>
            <ParameterFields
                definitions={definitions}
                params={params}
                onChange={onChange}
                idPrefix="param"
            />
            {error && (
                <p className="error-box" role="alert">
                    {error}
                </p>
            )}
            <div className="parameter-actions">
                {definitions.some((item) => item.type === 'seed') && (
                    <button
                        className="secondary-button"
                        onClick={onRandomize}
                        title="Choose and display a new seed"
                    >
                        <SketchIcon name="shuffle" size={15} /> Randomize
                    </button>
                )}
                <button
                    className="secondary-button"
                    onClick={onReset}
                    title="Restore default parameters"
                >
                    <SketchIcon name="restart" size={15} /> Defaults
                </button>
            </div>
        </div>
    )
}
