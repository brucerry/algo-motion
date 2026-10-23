// Benchmark-only representation baseline. Keep the reference search unchanged
// while replacing its nested move arrays with flat, typed integer buffers.
import { readFileSync } from 'node:fs'

export async function compactCubeReference() {
    const cubeUrl = new URL('../src/algorithms/backtracking/rubiks/vendor/cube.js', import.meta.url)
    let source = readFileSync(
        new URL('../src/algorithms/backtracking/rubiks/vendor/solve.js', import.meta.url),
        'utf8',
    )
    source = source.replace("'./cube.js'", JSON.stringify(cubeUrl.href))
    const moveStart = source.indexOf('    computeMoveTable = function')
    const moveEnd = source.indexOf('    // Because we only have', moveStart)
    source =
        source.slice(0, moveStart) +
        `
    computeMoveTable = function(context, coord, size) {
        const result = new (coord === 'URtoDF' ? Uint32Array : Uint16Array)(size * 18);
        const cube = new Cube();
        const apply = context === 'corners' ? 'cornerMultiply' : 'edgeMultiply';
        for (let i = 0; i < size; i++) {
            cube[coord](i);
            for (let face = 0; face < 6; face++) {
                for (let power = 0; power < 3; power++) {
                    cube[apply](Cube.moves[face]);
                    result[i * 18 + face * 3 + power] = cube[coord]();
                }
                cube[apply](Cube.moves[face]);
            }
        }
        return result;
    }
` +
        source.slice(moveEnd)
    const mergeStart = source.indexOf('                this.moveTables.mergeURtoDF = (function')
    const mergeEnd = source.indexOf('            } else {', mergeStart)
    source =
        source.slice(0, mergeStart) +
        `
                this.moveTables.mergeURtoDF = new Int32Array(336 * 336);
                for (let a = 0; a < 336; a++)
                    for (let b = 0; b < 336; b++)
                        this.moveTables.mergeURtoDF[a * 336 + b] = mergeURtoDF(a, b);
` +
        source.slice(mergeEnd)
    const pruneStart = source.indexOf(
        '        table = (function',
        source.indexOf('    computePruningTable = function'),
    )
    const pruneEnd = source.indexOf('        if (phase === 1)', pruneStart)
    source =
        source.slice(0, pruneStart) +
        '        table = new Uint32Array(Math.ceil(size / 8)).fill(0xffffffff);\n' +
        source.slice(pruneEnd)
    for (const [table, index] of [
        ['FRtoBR', 'slice * 24'],
        ['twist', 'twist'],
        ['flip', 'flip'],
        ['parity', 'parity'],
        ['FRtoBR', 'slice'],
        ['URFtoDLF', 'URFtoDLF'],
        ['URtoDF', 'URtoDF'],
    ]) {
        source = source.replaceAll(
            `Cube.moveTables.${table}[${index}][move]`,
            `Cube.moveTables.${table}[(${index}) * 18 + move]`,
        )
    }
    source = source.replace(
        'Cube.moveTables[table][index][move]',
        "Cube.moveTables[table][index * (table === 'mergeURtoDF' ? 336 : 18) + move]",
    )
    source +=
        '\nCube.moveTables.parity = new Uint8Array(Cube.moveTables.parity.flat());\nexport default Cube;\n'
    return (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')))
        .default
}
