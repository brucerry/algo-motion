import type { CubeState } from './replay'
import { facelets, notation } from './model'

export default function CubeDetails({
    state,
    selectedId,
    onSelect,
}: {
    state: CubeState
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    return (
        <section
            className="cube-details"
            aria-label="Cube notation and selection"
            data-cubies={state.cube.length}
            data-stickers={state.cube.flatMap((cubie) => cubie.stickers).length}
            data-facelets={facelets(state.cube)}
        >
            <p>
                <strong>{state.phase}</strong> {state.move ? `Turn ${notation(state.move)} · ` : ''}
                {state.applied} solution moves applied
            </p>
            <p>
                <strong>Scramble</strong> <span data-testid="cube-scramble">{state.scramble}</span>
            </p>
            <p>
                <strong>Solution</strong>{' '}
                <span data-testid="cube-solution">
                    {state.solution ||
                        (state.phase === 'Solved'
                            ? 'No moves needed'
                            : 'Shown from replay step 1 when available')}
                </span>
            </p>
            <label>
                Inspect cubie{' '}
                <select
                    aria-label="Inspect cubie"
                    value={selectedId ?? ''}
                    onChange={(event) => onSelect(event.target.value || null)}
                >
                    <option value="">Choose a cubie</option>
                    {state.cube.map((cubie) => (
                        <option key={cubie.id} value={cubie.id}>
                            {cubie.stickers.length === 3
                                ? 'Corner'
                                : cubie.stickers.length === 2
                                  ? 'Edge'
                                  : 'Center'}{' '}
                            · home ({cubie.id})
                        </option>
                    ))}
                </select>
            </label>
            <small>
                Cube-fixed faces: U Up · R Right · F Front · D Down · L Left · B Back. ′ inverse · 2
                half turn. 2R inner layer · Rw outer two layers · 2-3R depth range. A layer or wide
                turn counts as one move. Inspection positions use an exact doubled integer lattice.
            </small>
        </section>
    )
}
