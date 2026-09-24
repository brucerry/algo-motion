import ArrayItems from '../common/ArrayItems'
import type { SceneProps } from '../../engine/types'
import type { TwoSumState } from './twoSum'

export default function TwoSumScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<TwoSumState>) {
    const active = [state.left, state.right].filter(
        (index) => index >= 0 && index < state.items.length,
    )
    const completed = state.items
        .map((_, index) => index)
        .filter((index) => index < state.left || index > state.right)
    return (
        <ArrayItems
            items={state.items}
            active={active}
            completed={completed}
            result={state.pair ?? []}
            selectedId={selectedId}
            onSelect={onSelect}
            theme={theme}
        />
    )
}
