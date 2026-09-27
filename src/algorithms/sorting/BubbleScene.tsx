import ArrayItems from '../common/ArrayItems'
import type { SceneProps } from '../../engine/types'
import type { BubbleState } from './bubble'

export default function BubbleScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<BubbleState>) {
    return (
        <ArrayItems
            items={state.items}
            active={state.pair ?? []}
            completed={Array.from(
                { length: state.items.length - state.sortedFrom },
                (_, i) => state.sortedFrom + i,
            )}
            selectedId={selectedId}
            onSelect={onSelect}
            theme={theme}
        />
    )
}
