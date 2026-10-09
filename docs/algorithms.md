# Algorithms and limits

[Project overview](../README.md) · [User guide](user-guide.md) · [Solver and design notes](design-notes.md)

## Catalog

The workbench contains **21 algorithm showcases across eight topics**.

| Topic               | Algorithms                                          | What the scene shows                                               |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Array Techniques    | Binary Search; Sorted Two-Sum                       | Search intervals, indices, and pointer moves                       |
| Backtracking        | N-Queens; Rubik’s Cube; Sudoku Solver               | Choices and reversals, or a verified cube solution path            |
| Dynamic Programming | 0/1 Knapsack; Coin Change                           | Table dependencies and result reconstruction                       |
| Graph Search        | A*; BFS; Depth-First Search; Dijkstra               | Seeded grids, visited cells, and routes                            |
| Motion Planning     | RRT; RRT*                                           | Collision-aware sampling trees in a true 3D workspace              |
| Optimization        | Gradient Descent; Interval Scheduling               | Descent on three objective surfaces and greedy interval selection  |
| Sorting             | Bubble Sort; Insertion Sort; Merge Sort; Quick Sort | Comparisons, swaps/shifts, partitions, and merge buffers           |
| Trees               | BST Search; In-order Traversal                      | Seeded keys, search paths, a traversal stack, and ascending output |

Each showcase includes pseudocode, current-step explanations, metrics, legends, references, presets, and selection details.

## Graph search

Grid algorithms use a 2D logical grid rendered in a 3D scene. BFS minimizes hops on unweighted movement. Dijkstra accounts for weighted costs. On uniform terrain with diagonal movement disabled, both can return the same minimum-hop route.

Dijkstra’s **Weighted detour** preset provides a deterministic contrast: BFS takes 9 hops at terrain cost 27, while Dijkstra takes 11 hops at cost 20. The comparison panel separates hop counts from weighted costs.

A* optimality depends on its heuristic and movement costs; the UI identifies settings that lose that guarantee. DFS demonstrates traversal and does not promise a shortest route.

## Sorting and tree search

Insertion Sort and Merge Sort preserve equal-item order. Quick Sort uses last-item Lomuto partition and is not stable.

Binary Search uses logarithmically many comparisons. Larger inputs add genuine interval halvings rather than artificial animation steps. BST Search takes O(h) for tree height h; it is logarithmic only when the tree is balanced.

## Constraint solving and dynamic programming

Sudoku generates seeded 9×9 puzzles with 24–65 clues and returns the first valid completion. Puzzle uniqueness is not guaranteed. Its **No solution** preset demonstrates exhaustive failure without changing fixed clues.

N-Queens attempts one queen per row, showing conflicts, accepted placements, and reversals until the first complete solution or exhaustive failure.

Coin Change uses three reusable positive denominations and reconstructs the minimum coins for an exact amount, including unreachable and zero-amount cases. Knapsack shows 0/1 choices, table dependencies, and reconstruction under the selected capacity.

Rubik’s Cube currently supports **3×3**, with all 26 exterior cubies and 54 stickers. It replays an independently verified two-phase solution. See [solver details and notation](design-notes.md#rubiks-cube-solving-and-replay).

## Motion planning and optimization

RRT and RRT* operate in a true 3D workspace with collision checks against spherical obstacles. RRT* selects cheaper parents, rewires branches, propagates improved costs, and continues improving after its first route until the configured budget. A finite run does not guarantee a globally optimal path. Its guide cites [Karaman and Frazzoli’s original paper](https://arxiv.org/abs/1105.1186).

Gradient Descent follows gradients on circular, elongated, or rippled bowl surfaces. Iteration limits and convergence outcomes remain distinct; behavior depends on the objective, starting point, learning rate, and tolerance.

## Input limits

These are the current standalone input maxima from the module parameter definitions. Dependent controls can have lower bounds for a particular input, and shared comparison controls use the intersection of member ranges.

| Showcase                             | Maximum                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| A*, BFS, DFS, Dijkstra               | 240 × 240 grid                                           |
| Binary Search                        | 16,384 items                                             |
| Sorted Two-Sum                       | 160 items                                                |
| Bubble, Insertion, Merge, Quick Sort | 140 items                                                |
| BST Search and In-order Traversal    | 2,048 nodes                                              |
| 0/1 Knapsack                         | 80 items; capacity up to 180, also bounded by item count |
| Coin Change                          | Amount 300; three denominations from 1 to 100            |
| N-Queens                             | 80 × 80 board                                            |
| Sudoku Solver                        | Fixed 9×9 board; 24–65 clues                             |
| Rubik’s Cube                         | Fixed 3×3 cube; 0–100 scramble turns                     |
| Interval Scheduling                  | 120 activities                                           |
| RRT and RRT*                         | Workspace side 200; 180 obstacles; 6,000 iterations      |
| Gradient Descent                     | 3,000 iterations                                         |

All configured scene items remain present and selectable. Large input support does not imply fast completion for expensive searches. Grid and N-Queens runs have no fixed recorded-step ceiling and remain cancellable; algorithms with a configured iteration budget retain that budget. See [generation and outcomes](user-guide.md#generation-and-outcomes).
