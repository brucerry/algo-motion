import { canSlice, squareNotation, squareSolved } from './model'
import type { SquareState } from './replay'
export default function SquareDetails({
    state,
    selectedId,
    onSelect,
}: {
    state: SquareState
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    return (
        <section
            className="cube-details"
            aria-label="Square-1 notation and selection"
            data-pieces="18"
            data-solved={String(squareSolved(state.puzzle))}
            data-state={JSON.stringify(state.puzzle)}
        >
            <p>
                <strong>{state.phase}</strong>{' '}
                {state.move ? `${squareNotation(state.move)} · ` : ''}
                {state.applied} solution operations applied ·{' '}
                {canSlice(state.puzzle) ? 'Slice cuts clear' : 'Slice blocked by a corner'}
            </p>
            <p>
                <strong>Scramble</strong>{' '}
                <span data-testid="square-scramble">{state.scramble}</span>
            </p>
            <p>
                <strong>Solution</strong>{' '}
                <span data-testid="square-solution">
                    {state.solution ||
                        (state.phase === 'Solved'
                            ? 'No operations needed'
                            : 'Shown from replay step 1 when available')}
                </span>
            </p>
            <label>
                Inspect piece{' '}
                <select
                    aria-label="Inspect Square-1 piece"
                    value={selectedId ?? ''}
                    onChange={(event) => onSelect(event.target.value || null)}
                >
                    <option value="">Choose a piece</option>
                    {Array.from({ length: 18 }, (_, id) => (
                        <option key={id} value={String(id)}>
                            {id >= 16 ? 'Middle half' : id & 1 ? 'Corner' : 'Edge'} · {id}
                        </option>
                    ))}
                </select>
            </label>
            <small>
                (a,b): top clockwise viewed above, bottom clockwise viewed below; integers in 30°
                units. /: 180° slice through clear cuts. A nonzero rotation pair and each slice
                count as one operation. Corners remain rigid 60° wedges.
            </small>
        </section>
    )
}
