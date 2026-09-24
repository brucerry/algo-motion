import { describe, expect, it } from 'vitest'
import { buildBst, runBst } from './bst'

describe('binary search tree showcase', () => {
    it('places keys according to the BST invariant and finds the exact path', () => {
        const nodes = buildBst([8, 4, 12, 2, 6, 10, 14])
        for (const node of nodes) {
            if (node.left !== null) expect(nodes[node.left].key).toBeLessThan(node.key)
            if (node.right !== null) expect(nodes[node.right].key).toBeGreaterThan(node.key)
        }
        const result = runBst({ count: 7, seed: 1, target: 6 }, [8, 4, 12, 2, 6, 10, 14])
        expect(result.outcome).toBe('success')
        expect(result.frames.at(-1)!.state.visited.map((id) => nodes[id].key)).toEqual([8, 4, 6])
    })

    it('reports a missing child and repeats seeded runs', () => {
        const absent = runBst({ count: 3, seed: 1, target: 5 }, [8, 4, 12])
        expect(absent.outcome).toBe('no-solution')
        expect(absent.frames.at(-1)!.state.found).toBeNull()
        const params = { count: 10, seed: 22, target: 31 }
        expect(runBst(params)).toEqual(runBst(params))
    })
})
