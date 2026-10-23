import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export function runCargo(args) {
    const localCargo = join(homedir(), '.cargo', 'bin', 'cargo')
    const cargo = process.env.CARGO || (existsSync(localCargo) ? localCargo : 'cargo')
    const result = spawnSync(cargo, args, { cwd: projectRoot, stdio: 'inherit' })
    if (result.error)
        console.error(
            'Rust is required for the cube solver. Install rustup, then retry. See docs/development.md.',
        )
    if (result.error || result.status !== 0) process.exit(result.status || 1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    runCargo(process.argv.slice(2))
