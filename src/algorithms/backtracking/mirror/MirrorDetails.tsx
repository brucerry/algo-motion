import { notation } from '../rubiks/model'
import { isMirrorSolved } from './model'
import type { MirrorState } from './replay'

export default function MirrorDetails({
    state,
    selectedId,
    onSelect,
}: {
    state: MirrorState
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    return (
        <section
            className="cube-details"
            aria-label="Mirror notation and selection"
            data-pieces={state.cube.length}
            data-geometry-solved={String(isMirrorSolved(state.cube))}
        >
            <p>
                <strong>{state.phase}</strong> {state.move ? `Turn ${notation(state.move)} · ` : ''}
                {state.applied} solution face turns applied
            </p>
            <p>
                <strong>Scramble</strong>{' '}
                <span data-testid="mirror-scramble">{state.scramble}</span>
            </p>
            <p>
                <strong>Solution</strong>{' '}
                <span data-testid="mirror-solution">
                    {state.solution ||
                        (state.phase === 'Solved'
                            ? 'No moves needed'
                            : 'Shown from replay step 1 when available')}
                </span>
            </p>
            <label>
                Inspect piece{' '}
                <select
                    aria-label="Inspect mirror piece"
                    value={selectedId ?? ''}
                    onChange={(event) => onSelect(event.target.value || null)}
                >
                    <option value="">Choose a piece</option>
                    {state.cube.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.stickers.length === 3
                                ? 'Corner'
                                : p.stickers.length === 2
                                  ? 'Edge'
                                  : 'Center'}{' '}
                            · {p.id}
                        </option>
                    ))}
                </select>
            </label>
            <small>
                Cube-fixed U Up · R Right · F Front · D Down · L Left · B Back. ′ inverse · 2 half
                turn. Each face or half turn counts as one move. Every piece keeps its dimensions
                during a turn.
            </small>
        </section>
    )
}
