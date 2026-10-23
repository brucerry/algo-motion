import { existsSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot as root, runCargo } from './rust.mjs'

runCargo([
    'build',
    '--locked',
    '--release',
    '--target',
    'wasm32-unknown-unknown',
    '--manifest-path',
    'wasm/cube-solver/Cargo.toml',
])
const source = join(root, 'wasm/cube-solver/target/wasm32-unknown-unknown/release/cube_solver.wasm')
const target = join(root, 'wasm/cube-solver/pkg/cube_solver.wasm')
mkdirSync(join(root, 'wasm/cube-solver/pkg'), { recursive: true })
if (!existsSync(target) || !readFileSync(source).equals(readFileSync(target)))
    copyFileSync(source, target)
