import ArrayItems from '../common/ArrayItems'
import type { SceneProps } from '../../engine/types'
import type { BinaryState } from './binary'

export default function BinaryScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<BinaryState>) {
    const active = [state.low, state.high, state.mid].filter(
        (index): index is number => index !== null && index >= 0 && index < state.items.length,
    )
    const completed = state.items
        .map((_, index) => index)
        .filter((index) => index < state.low || index > state.high)
    return (
        <ArrayItems
            items={state.items}
            active={active}
            completed={completed}
            result={state.found === null ? [] : [state.found]}
            selectedId={selectedId}
            onSelect={onSelect}
            theme={theme}
        />
    )
}
