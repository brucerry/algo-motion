export const BINARY_MAX_COUNT = 16_384
export const TREE_MAX_COUNT = 2_048
export const treeKeyMaximum = (count: number) =>
    count <= 24 ? 100 : count <= 120 ? 1000 : count * 4
