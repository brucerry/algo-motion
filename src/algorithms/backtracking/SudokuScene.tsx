import { Html, Line } from '@react-three/drei'
import type { SceneProps } from '../../engine/types'
import type { SudokuState } from './sudoku'
import { scenePalette } from '../../visual/scenePalette'
export default function SudokuScene({
    state,
    selectedId,
    onSelect,
    theme,
}: SceneProps<SudokuState>) {
    const colors = scenePalette(theme)
    return (
        <group>
            {state.board.map((value, cell) => {
                const x = ((cell % 9) - 4) * 0.72,
                    z = (Math.floor(cell / 9) - 4) * 0.72
                const color =
                    selectedId === String(cell)
                        ? colors.selected
                        : state.conflicts.includes(cell)
                          ? colors.rejected
                          : state.current === cell
                            ? colors.current
                            : state.solved
                              ? colors.solution
                              : state.givens[cell]
                                ? colors.start
                                : value
                                  ? colors.visited
                                  : colors.unvisited
                return (
                    <group key={cell} position={[x, 0, z]}>
                        <mesh
                            position={[0, 0.13, 0]}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelect(String(cell))
                            }}
                        >
                            <boxGeometry args={[0.65, 0.26, 0.65]} />
                            <meshStandardMaterial color={color} roughness={1} />
                        </mesh>
                        <Html center position={[0, 0.36, 0]} style={{ pointerEvents: 'none' }}>
                            <span
                                className="scene-annotation"
                                style={{ fontWeight: state.givens[cell] ? 900 : 500 }}
                            >
                                {value ||
                                    (state.current === cell ? `?${state.candidate ?? ''}` : '·')}
                            </span>
                        </Html>
                    </group>
                )
            })}
            {[-3.24, -1.08, 1.08, 3.24].flatMap((at, i) => [
                <Line
                    key={`row-${i}`}
                    points={[
                        [-3.24, 0.29, at],
                        [3.24, 0.29, at],
                    ]}
                    color={colors.ink}
                    lineWidth={3}
                />,
                <Line
                    key={`col-${i}`}
                    points={[
                        [at, 0.29, -3.24],
                        [at, 0.29, 3.24],
                    ]}
                    color={colors.ink}
                    lineWidth={3}
                />,
            ])}
        </group>
    )
}
