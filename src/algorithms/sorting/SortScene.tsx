import { Html } from '@react-three/drei'
import ArrayItems from '../common/ArrayItems'
import type { SceneProps } from '../../engine/types'
import type { SortState } from './strategies'

export default function SortScene({ state, onSelect, selectedId, theme }: SceneProps<SortState>) {
    return (
        <group>
            <ArrayItems
                items={state.items}
                active={state.active}
                completed={state.completed}
                result={state.pivot === null ? [] : [state.pivot]}
                liftedId={state.lifted}
                selectedId={selectedId}
                onSelect={onSelect}
                theme={theme}
            />
            <Html center position={[0, 2.9, 0]} style={{ pointerEvents: 'none' }}>
                <span className="scene-annotation">
                    {state.range ? `Range ${state.range[0]}–${state.range[1]}` : 'Ascending array'}
                    {state.pivot !== null ? ` · Pivot #${state.pivot}` : ''}
                    {state.boundary !== null ? ` · Partition boundary #${state.boundary}` : ''}
                </span>
            </Html>
            {state.buffer.length > 0 && (
                <group position={[0, 0, 3]}>
                    <ArrayItems
                        items={state.buffer}
                        active={[state.buffer.length - 1]}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        theme={theme}
                    />
                    <Html center position={[0, -0.4, 0]} style={{ pointerEvents: 'none' }}>
                        <span className="scene-annotation">
                            Merge buffer · {state.buffer.length} items
                        </span>
                    </Html>
                </group>
            )}
        </group>
    )
}
