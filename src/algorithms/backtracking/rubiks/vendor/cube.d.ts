export default class SolverCube {
    constructor()
    static fromString(facelets: string): SolverCube
    static initSolver(): void
    move(notation: string): SolverCube
    asString(): string
    solveUpright(maxDepth: number): string | null
    solutionPhase1Length: number
    co: number[]
    eo: number[]
    ep: number[]
}
