import type { AlgorithmModule, Params } from './types'
import { eagerTrace, type TraceSource } from './trace'
import { workerTrace } from './workerTrace'

export function moduleTrace(module: AlgorithmModule<any>, params: Params): TraceSource<any> {
    if (module.createTrace) return module.createTrace(params)
    if (module.steps) return workerTrace({ kind: 'algorithm', algorithmId: module.meta.id, params })
    if (module.run) return eagerTrace(module.run(params))
    throw new Error('Algorithm has no trace producer.')
}
