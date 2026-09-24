import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ParameterPanel, { ParameterFields } from './components/ParameterPanel'
import { ComputerServer, WalkingShoes, type ServerPhase } from './components/LearningCompanions'
import { SketchIcon, Sticker } from './components/SketchArt'
import type { CameraCommand } from './components/VisualizationCanvas'
import { algorithmById, algorithms, algorithmsInCategory, categories } from './engine/registry'
import { clampFrame, SPEEDS } from './engine/timeline'
import { encodeHash, parseHash } from './engine/url'
import { resolveParameterDefinitions, validateParameters } from './engine/parameters'
import { outcomeLabel } from './engine/outcome'
import { shouldPlayStepCue, StepSound, type StepCueSource } from './engine/stepSound'
import { legendTone, scenePalette } from './visual/scenePalette'
import type { Frame, Params } from './engine/types'
import { eagerTrace, type TraceSource } from './engine/trace'
import { workerTrace } from './engine/workerTrace'
import { ComparisonTraceSet } from './engine/comparisonTrace'
import {
    comparisonInputLabel,
    comparisonMembers,
    comparisonSharedDefinitions,
    comparisonSpecificDefinitions,
    comparisonSummary,
    effectiveComparisonParams,
    initialComparisonSettings,
    sharedSortedArray,
} from './engine/comparison'
import { runBinary } from './algorithms/array/binary'
import { runTwoSum } from './algorithms/array/twoSum'
import {
    createGrid,
    gridDefaults,
    type GridAlgorithm,
    type GridParams,
} from './algorithms/grid/grid'

type Preferences = {
    algorithmId?: string
    params?: Record<string, Params>
    speed?: number
    theme?: 'dark' | 'light'
}
const storageKey = 'algorithm-motion:preferences'
const legacyStorageKey = 'algorithm-motion-lab:preferences'
const gridIds = ['bfs', 'dijkstra', 'astar', 'dfs']
type TraceSet = {
    key: string
    normal: TraceSource<any> | null
    comparison: Record<string, TraceSource<any>> | null
    session: ComparisonTraceSet | null
}
const VisualizationCanvas = lazy(() => import('./components/VisualizationCanvas'))
const readPreferences = (): Preferences => {
    for (const key of [storageKey, legacyStorageKey]) {
        try {
            const stored = localStorage.getItem(key)
            if (stored) return JSON.parse(stored) as Preferences
        } catch {
            /* storage may be unavailable or contain invalid JSON */
        }
    }
    return {}
}
function initialConfiguration() {
    const prefs = readPreferences(),
        route = parseHash(location.hash)
    const module =
        algorithmById(route.algorithmId) || algorithmById(prefs.algorithmId) || algorithms[2]
    const source =
        route.explicit && route.algorithmId === module.meta.id
            ? route.raw
            : prefs.params?.[module.meta.id] || {}
    const checked = validateParameters(module.parameters, source)
    const notice =
        Object.values(checked.errors).join(' ') ||
        (route.explicit && !algorithmById(route.algorithmId)
            ? 'Unknown algorithm in the link.'
            : '')
    return { id: module.meta.id, params: checked.params, prefs, notice }
}
function Metrics({ items }: { items: { label: string; value: string | number }[] }) {
    return (
        <dl className="metrics">
            {items.map((item) => (
                <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                </div>
            ))}
        </dl>
    )
}

export default function App() {
    const initial = useMemo(initialConfiguration, [])
    const [algorithmId, setAlgorithmId] = useState(initial.id)
    const [openCategories, setOpenCategories] = useState<string[]>([
        algorithmById(initial.id)?.meta.category ?? 'Graph Search',
    ])
    const [params, setParams] = useState<Params>(initial.params)
    const [notice, setNotice] = useState(initial.notice)
    const [configError, setConfigError] = useState('')
    const [index, setIndex] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [soundMessage, setSoundMessage] = useState('')
    const [speed, setSpeed] = useState(
        SPEEDS.includes(initial.prefs.speed as (typeof SPEEDS)[number]) ? initial.prefs.speed! : 1,
    )
    const [theme, setTheme] = useState<'dark' | 'light'>(
        initial.prefs.theme === 'dark' ? 'dark' : 'light',
    )
    const [selected, setSelected] = useState<string | null>(null)
    const [camera, setCamera] = useState<CameraCommand>({ preset: 'perspective', revision: 0 })
    const [compare, setCompare] = useState(false)
    const [compareId, setCompareId] = useState(initial.id)
    const [compareShared, setCompareShared] = useState<Params>({})
    const [compareParams, setCompareParams] = useState<Record<string, Params>>({})
    const [mobileTab, setMobileTab] = useState<'view' | 'algorithms' | 'parameters' | 'learn'>(
        'view',
    )
    const [learningTab, setLearningTab] = useState<'step' | 'guide'>('step')
    const [shortcuts, setShortcuts] = useState(false)
    const [formulaHtml, setFormulaHtml] = useState('')
    const [reducedMotion, setReducedMotion] = useState(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    const soundRef = useRef(new StepSound())
    const cueSourceRef = useRef<StepCueSource>(null)
    const displayedRef = useRef<{ run: TraceSource<any> | null; index: number | null } | null>(null)
    const [traceSet, setTraceSet] = useState<TraceSet | null>(null)
    const [traceVersion, setTraceVersion] = useState(0)
    const [loadedFrames, setLoadedFrames] = useState<
        Map<TraceSource<any>, { index: number; frame: Frame<any> }>
    >(new Map())
    const requestedFrames = useRef(new Map<TraceSource<any>, number>())
    const module = algorithmById(algorithmId) || algorithms[2]
    const members = comparisonMembers(module.meta.category)
    const sharedDefinitions = comparisonSharedDefinitions(module.meta.category)
    const toggleCategory = (category: string) => {
        if (category === module.meta.category) return
        setOpenCategories((open) =>
            open.includes(category)
                ? open.filter((item) => item !== category)
                : [...open, category],
        )
    }

    useEffect(() => {
        return () => soundRef.current.close()
    }, [])
    useEffect(() => {
        const clearPending = () => {
            if (document.hidden) cueSourceRef.current = null
        }
        document.addEventListener('visibilitychange', clearPending)
        return () => document.removeEventListener('visibilitychange', clearPending)
    }, [])
    useEffect(() => {
        const media = matchMedia('(prefers-reduced-motion: reduce)')
        const change = () => setReducedMotion(media.matches)
        media.addEventListener('change', change)
        return () => media.removeEventListener('change', change)
    }, [])
    useEffect(() => {
        const change = () => {
            const route = parseHash(location.hash)
            if (!route.explicit) return
            const target = algorithmById(route.algorithmId)
            if (!target) {
                setNotice('Unknown algorithm in the link.')
                return
            }
            const checked = validateParameters(target.parameters, route.raw)
            setAlgorithmId(target.meta.id)
            setOpenCategories([target.meta.category])
            cueSourceRef.current = null
            setParams(checked.params)
            setNotice(Object.values(checked.errors).join(' '))
            setCompare(false)
            setMobileTab('view')
        }
        window.addEventListener('hashchange', change)
        return () => window.removeEventListener('hashchange', change)
    }, [])
    useEffect(() => {
        cueSourceRef.current = null
        setIndex(0)
        setPlaying(false)
        setSelected(null)
        setConfigError('')
    }, [algorithmId, params, compareShared, compareParams])
    useEffect(() => {
        const prefs = readPreferences()
        prefs.algorithmId = algorithmId
        prefs.params = { ...prefs.params, [algorithmId]: params }
        prefs.speed = speed
        prefs.theme = theme
        try {
            localStorage.setItem(storageKey, JSON.stringify(prefs))
            localStorage.removeItem(legacyStorageKey)
        } catch {
            /* storage may be unavailable */
        }
        const hash = encodeHash(algorithmId, params)
        if (location.hash !== hash)
            history.replaceState(null, '', location.pathname + location.search + hash)
    }, [algorithmId, params, speed, theme])

    const traceKey = JSON.stringify(
        compare
            ? { algorithmId, compare, shared: compareShared, individual: compareParams }
            : { algorithmId, params, compare },
    )
    useEffect(() => {
        let normal: TraceSource<any> | null = null
        let comparison: TraceSet['comparison'] = null
        try {
            if (compare && members.length) {
                comparison = {}
                const category = module.meta.category
                const gridEnvironment =
                    category === 'Graph Search'
                        ? createGrid({ ...gridDefaults, ...compareShared } as GridParams)
                        : null
                const sortedArray =
                    category === 'Array Techniques' ? sharedSortedArray(compareShared) : null
                for (const member of members) {
                    const id = member.meta.id
                    const effective = effectiveComparisonParams(
                        member,
                        compareShared,
                        compareParams[id] ?? {},
                    )
                    if (gridEnvironment && gridIds.includes(id))
                        comparison[id] = workerTrace({
                            kind: 'grid',
                            algorithm: id as GridAlgorithm,
                            params: { ...gridDefaults, ...effective } as GridParams,
                            environment: gridEnvironment,
                        })
                    else if (sortedArray && id === 'binary-search')
                        comparison[id] = eagerTrace(
                            runBinary(effective as Parameters<typeof runBinary>[0], sortedArray),
                        )
                    else if (sortedArray && id === 'sorted-two-sum')
                        comparison[id] = eagerTrace(
                            runTwoSum(effective as Parameters<typeof runTwoSum>[0], sortedArray),
                        )
                    else comparison[id] = eagerTrace(member.run(effective))
                }
            } else if (gridIds.includes(algorithmId)) {
                normal = workerTrace({
                    kind: 'grid',
                    algorithm: algorithmId as GridAlgorithm,
                    params: { ...gridDefaults, ...params } as GridParams,
                })
            } else if (algorithmId === 'n-queens') {
                normal = workerTrace({ kind: 'queens', params: params as { size: number } })
            } else normal = eagerTrace(module.run(params))
        } catch (error) {
            for (const source of Object.values(comparison ?? {})) source.dispose()
            comparison = null
            normal = eagerTrace({
                frames: [],
                outcome: 'error',
                error: error instanceof Error ? error.message : 'Unable to generate experiment.',
            })
        }
        const session = comparison
            ? new ComparisonTraceSet(comparison, () => setTraceVersion((value) => value + 1))
            : null
        const unsubscribe = normal?.subscribe(() => setTraceVersion((value) => value + 1))
        requestedFrames.current.clear()
        setLoadedFrames(new Map())
        setTraceSet({ key: traceKey, normal, comparison, session })
        return () => {
            unsubscribe?.()
            normal?.dispose()
            session?.dispose()
        }
    }, [traceKey])
    const currentSet = traceSet?.key === traceKey ? traceSet : null
    const comparison = currentSet?.comparison ?? null
    const comparisonSession = currentSet?.session ?? null
    const activeModule = compare ? (algorithmById(compareId) ?? module) : module
    const activeParams = compare
        ? effectiveComparisonParams(
              activeModule,
              compareShared,
              compareParams[activeModule.meta.id] ?? {},
          )
        : params
    const run = comparison ? (comparison[compareId] ?? null) : (currentSet?.normal ?? null)
    const snapshot = run?.snapshot() ?? {
        available: 0,
        total: null,
        status: 'generating' as const,
        outcome: null,
        error: undefined,
    }
    const total = comparisonSession?.available() ?? snapshot.available
    useEffect(() => {
        if (!currentSet) return
        const sources = currentSet.comparison
            ? Object.entries(currentSet.comparison)
            : currentSet.normal
              ? [[algorithmId, currentSet.normal] as const]
              : []
        for (const [id, source] of sources) {
            const available = source.snapshot().available
            if (!available) continue
            const target = Math.min(index, available - 1)
            if (loadedFrames.get(source)?.index === target) continue
            if (requestedFrames.current.has(source)) continue
            requestedFrames.current.set(source, target)
            void (
                currentSet.session ? currentSet.session.frame(id, target) : source.frame(target)
            ).then((frame) => {
                if (requestedFrames.current.get(source) !== target) return
                requestedFrames.current.delete(source)
                if (!frame) return
                setLoadedFrames((previous) =>
                    new Map(previous).set(source, { index: target, frame }),
                )
            })
        }
    }, [currentSet, index, traceVersion, loadedFrames])
    const targetIndex = Math.min(index, Math.max(0, snapshot.available - 1))
    const loaded = run ? loadedFrames.get(run) : null
    const frame = loaded?.frame ?? null
    const framePending = snapshot.available > 0 && loaded?.index !== targetIndex
    const lastScene = useRef<{
        key: string
        id: string
        algorithm: typeof module
        frame: Frame<any>
    } | null>(null)
    if (frame)
        lastScene.current = {
            key: traceKey,
            id: activeModule.meta.id,
            algorithm: activeModule,
            frame,
        }
    const scene = frame ? { algorithm: activeModule, frame } : lastScene.current
    const sceneStale =
        !frame &&
        !!lastScene.current &&
        (lastScene.current.key !== traceKey || lastScene.current.id !== activeModule.meta.id)
    const lastDisplayedIndex = Math.max(0, snapshot.available - 1)
    const finished = snapshot.status === 'complete' && index >= lastDisplayedIndex && !framePending
    const comparisonFinished = comparisonSession?.allSettled() ?? snapshot.status !== 'generating'
    const timelineFinished = index >= total - 1 && comparisonFinished
    const outcomeText =
        snapshot.status === 'cancelled'
            ? 'Cancelled'
            : snapshot.outcome
              ? outcomeLabel[snapshot.outcome]
              : 'Generating'
    const previousDisplayed = displayedRef.current
    const displayedChanged =
        previousDisplayed?.run === run && previousDisplayed.index !== frame?.index
    const stepDirection =
        displayedChanged &&
        frame &&
        previousDisplayed.index !== null &&
        frame.index < previousDisplayed.index
            ? 'backward'
            : 'forward'
    const shoesMoving =
        !!frame &&
        !!displayedChanged &&
        cueSourceRef.current !== null &&
        frame.index < lastDisplayedIndex &&
        !reducedMotion
    const serverPhase: ServerPhase =
        !frame || frame.index === 0 ? 'ready' : finished ? 'burnout' : 'working'
    useEffect(() => {
        const previous = displayedRef.current
        const nextFrame = frame?.index ?? null
        if (
            shouldPlayStepCue({
                enabled: soundEnabled,
                source: cueSourceRef.current,
                sameRun: previous?.run === run,
                previousFrame: previous?.index ?? null,
                nextFrame,
                hidden: document.hidden,
            }) &&
            !soundRef.current.play()
        ) {
            setSoundEnabled(false)
            setSoundMessage('Sound unavailable in this browser.')
        }
        displayedRef.current = { run, index: nextFrame }
        cueSourceRef.current = null
    }, [frame, run, soundEnabled])
    useEffect(() => {
        cueSourceRef.current = null
        setIndex(0)
        setPlaying(false)
        setSelected(null)
    }, [compare])
    useEffect(() => {
        setSelected(null)
    }, [compareId])
    useEffect(() => {
        const formula = activeModule.education.formula
        if (learningTab !== 'guide' || !formula) {
            setFormulaHtml('')
            return
        }
        let cancelled = false
        import('katex').then((katex) => {
            if (!cancelled)
                setFormulaHtml(katex.default.renderToString(formula, { throwOnError: false }))
        })
        return () => {
            cancelled = true
        }
    }, [activeModule, learningTab])
    useEffect(() => {
        if (
            index >= total - 1 &&
            (!comparisonSession || comparisonSession.allSettled()) &&
            snapshot.status !== 'generating'
        )
            setPlaying(false)
    }, [index, total, traceVersion, comparisonSession, snapshot.status])
    useEffect(() => {
        if (!playing || total < 2) return
        let handle = 0,
            previous = performance.now(),
            elapsed = 0
        const tick = (time: number) => {
            elapsed += Math.min(time - previous, 100)
            previous = time
            const duration = 260 / speed
            if (elapsed >= duration) {
                const steps = Math.floor(elapsed / duration)
                elapsed %= duration
                cueSourceRef.current = 'playback'
                setIndex((old) => Math.min(total - 1, old + steps))
            }
            handle = requestAnimationFrame(tick)
        }
        handle = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(handle)
    }, [playing, speed, total])
    useEffect(() => {
        const active = document.querySelector<HTMLElement>('.pseudo-line.active')
        const list = active?.parentElement
        if (!active || !list) return
        const top = active.offsetTop - list.offsetTop
        if (top < list.scrollTop)
            list.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' })
        else if (top + active.offsetHeight > list.scrollTop + list.clientHeight)
            list.scrollTo({
                top: top + active.offsetHeight - list.clientHeight,
                behavior: reducedMotion ? 'instant' : 'smooth',
            })
    }, [index, activeModule, reducedMotion])

    const selectAlgorithm = useCallback((id: string) => {
        const target = algorithmById(id)
        if (!target) return
        const checked = validateParameters(target.parameters, readPreferences().params?.[id] || {})
        cueSourceRef.current = null
        setAlgorithmId(id)
        setOpenCategories([target.meta.category])
        setParams(checked.params)
        setCompare(false)
        setNotice('')
        setMobileTab('view')
        location.hash = encodeHash(id, checked.params)
    }, [])
    const toggleComparison = () => {
        cueSourceRef.current = null
        if (compare) {
            setCompare(false)
            return
        }
        const settings = initialComparisonSettings(
            module.meta.category,
            algorithmId,
            params,
            readPreferences().params,
        )
        setCompareShared(settings.shared)
        setCompareParams(settings.individual)
        setCompareId(algorithmId)
        setCompare(true)
    }
    const updateComparisonShared = (key: string, value: Params[string]) => {
        const checked = validateParameters(sharedDefinitions, { ...compareShared, [key]: value })
        if (checked.errors[key]) {
            setConfigError(checked.errors[key])
            return
        }
        const next: Record<string, Params> = {}
        const corrections: string[] = []
        for (const member of members) {
            const validated = validateParameters(member.parameters, {
                ...compareParams[member.meta.id],
                ...checked.params,
            })
            next[member.meta.id] = validated.params
            corrections.push(...Object.values(validated.errors))
        }
        setConfigError('')
        setNotice(corrections.join(' '))
        setCompareShared(checked.params)
        setCompareParams(next)
    }
    const updateComparisonSpecific = (id: string, key: string, value: Params[string]) => {
        const member = algorithmById(id)
        if (!member) return
        const checked = validateParameters(member.parameters, {
            ...compareParams[id],
            [key]: value,
            ...compareShared,
        })
        if (checked.errors[key]) {
            setConfigError(checked.errors[key])
            return
        }
        setConfigError('')
        setCompareParams((previous) => ({ ...previous, [id]: checked.params }))
    }
    const commit = (next: Params, changedKey?: string) => {
        const checked = validateParameters(module.parameters, next)
        if (changedKey ? checked.errors[changedKey] : Object.values(checked.errors).length) {
            setConfigError(
                changedKey ? checked.errors[changedKey] : Object.values(checked.errors).join(' '),
            )
            return
        }
        setConfigError('')
        setNotice(Object.values(checked.errors).join(' '))
        cueSourceRef.current = null
        setParams(checked.params)
    }
    const randomize = () => {
        const value = new Uint32Array(1)
        crypto.getRandomValues(value)
        commit({ ...params, seed: value[0] })
    }
    const cameraPreset = (preset: CameraCommand['preset']) =>
        setCamera((previous) => ({ preset, revision: previous.revision + 1 }))
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (
                target &&
                (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                    target.isContentEditable ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey)
            )
                return
            if (event.code === 'Space') {
                event.preventDefault()
                setPlaying((old) => !old)
            } else if (event.key === 'ArrowRight') {
                event.preventDefault()
                setPlaying(false)
                cueSourceRef.current = 'manual'
                setIndex((old) => clampFrame(old + 1, total))
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                setPlaying(false)
                cueSourceRef.current = 'manual'
                setIndex((old) => clampFrame(old - 1, total))
            } else if (event.key.toLowerCase() === 'r') {
                cueSourceRef.current = null
                setPlaying(false)
                setIndex(0)
            } else if (event.key.toLowerCase() === 'c') cameraPreset('perspective')
        }
        window.addEventListener('keydown', keydown)
        return () => window.removeEventListener('keydown', keydown)
    }, [total])
    const inspection =
        frame && selected !== null ? activeModule.inspect(frame.state, selected) : null
    return (
        <div className={'app theme-' + theme}>
            <div className="page-stickers" aria-hidden="true">
                <Sticker name="planet" className="page-sticker page-sticker-one" />
                <Sticker name="flower" className="page-sticker page-sticker-two" />
                <Sticker name="rainbow" className="page-sticker page-sticker-three" />
                <Sticker name="rocket" className="page-sticker page-sticker-four" />
            </div>
            <header className="topbar">
                <Sticker name="sun" className="topbar-sticker" />
                <div className="brand-mark" aria-hidden="true">
                    <Sticker name="star" className="brand-sticker" />
                </div>
                <div className="brand-copy">
                    <strong>Algorithm Motion</strong>
                    <small>INTERACTIVE 3D EXPLORATIONS</small>
                </div>
                <div className="topbar-spacer" />
                <span className="topbar-context">A visual workbench for algorithms</span>
                <button
                    className="icon-button"
                    title="Keyboard shortcuts"
                    aria-label="Keyboard shortcuts"
                    onClick={() => setShortcuts(true)}
                >
                    <SketchIcon name="help" />
                </button>
                <button
                    className="icon-button"
                    title="Toggle theme"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <SketchIcon name={theme === 'dark' ? 'sun' : 'moon'} />
                </button>
            </header>
            <nav className="mobile-tabs" aria-label="Workbench sections">
                {(['view', 'algorithms', 'parameters', 'learn'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={mobileTab === tab ? 'active' : ''}
                        onClick={() => setMobileTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </nav>
            <div className="workbench">
                <aside
                    className={
                        'sidebar algorithm-sidebar ' +
                        (mobileTab === 'algorithms' ? 'mobile-active' : '')
                    }
                    aria-label="Algorithms"
                >
                    <Sticker name="cloud" className="sidebar-sticker" />
                    <div className="sidebar-heading">
                        <span className="eyebrow">EXPLORE</span>
                        <h2>Algorithms</h2>
                    </div>
                    {categories.map((category) => (
                        <div key={category} className="nav-group">
                            <h3>
                                <button
                                    type="button"
                                    className="category-toggle"
                                    aria-label={category}
                                    aria-expanded={openCategories.includes(category)}
                                    aria-controls={`category-${category.replaceAll(' ', '-').toLowerCase()}`}
                                    onClick={() => toggleCategory(category)}
                                >
                                    <span>{category}</span>
                                    <span aria-hidden="true">
                                        {category === module.meta.category
                                            ? '•'
                                            : openCategories.includes(category)
                                              ? '−'
                                              : '+'}
                                    </span>
                                </button>
                            </h3>
                            <div
                                id={`category-${category.replaceAll(' ', '-').toLowerCase()}`}
                                hidden={!openCategories.includes(category)}
                            >
                                {algorithmsInCategory(category).map((item) => (
                                    <button
                                        key={item.meta.id}
                                        className={
                                            'algorithm-item ' +
                                            (algorithmId === item.meta.id ? 'active' : '')
                                        }
                                        aria-current={
                                            algorithmId === item.meta.id ? 'page' : undefined
                                        }
                                        onClick={() => selectAlgorithm(item.meta.id)}
                                    >
                                        <span className="algorithm-dot" />
                                        {item.meta.shortName}
                                        <span className="item-arrow">
                                            <SketchIcon name="next" size={15} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="sidebar-note">
                        <SketchIcon name="book" size={16} />
                        <span>Each experiment can be replayed step by step.</span>
                    </div>
                </aside>
                <main
                    className={
                        'main-column ' +
                        (mobileTab === 'view' || mobileTab === 'learn' ? 'mobile-active' : '')
                    }
                >
                    <Sticker name="kite" className="main-sticker" />
                    <div className="experiment-heading">
                        <div>
                            <span className="eyebrow">
                                {activeModule.meta.category.toUpperCase()} /{' '}
                                {activeModule.meta.dimensionality}
                            </span>
                            <h1>{activeModule.meta.name}</h1>
                            <p>{activeModule.meta.description}</p>
                        </div>
                        {members.length > 1 && (
                            <button
                                className={'secondary-button ' + (compare ? 'selected' : '')}
                                onClick={toggleComparison}
                            >
                                {compare
                                    ? 'Exit compare'
                                    : module.meta.category === 'Graph Search'
                                      ? 'Compare searches'
                                      : 'Compare topic'}
                            </button>
                        )}
                    </div>
                    {activeModule.meta.id === 'astar' &&
                        (Number(activeParams.heuristicWeight) > 1 ||
                            (activeParams.diagonal === true &&
                                activeParams.heuristic === 'manhattan')) && (
                            <p className="algorithm-caveat">
                                This heuristic setting can speed exploration, but the resulting path
                                is not guaranteed to have minimum cost.
                            </p>
                        )}
                    {activeModule.meta.id === 'dijkstra' && (
                        <p className="algorithm-caveat">
                            {activeParams.weightMode === 'terrain'
                                ? 'Weighted terrain: Dijkstra settles the lowest total-cost frontier cell. Its route may use more hops than BFS while costing less.'
                                : 'Uniform terrain: with diagonal movement off, Dijkstra and BFS can find the same minimum-hop route. Choose Weighted detour to see a lower-cost route with more hops.'}
                        </p>
                    )}
                    {notice && (
                        <div className="notice" role="status">
                            {notice}
                            <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
                                <SketchIcon name="close" size={14} />
                            </button>
                        </div>
                    )}
                    {comparison && (
                        <div
                            className="compare-switcher"
                            role="tablist"
                            aria-label="Comparison algorithm"
                        >
                            {members.map((member) => (
                                <button
                                    key={member.meta.id}
                                    role="tab"
                                    aria-selected={compareId === member.meta.id}
                                    className={compareId === member.meta.id ? 'active' : ''}
                                    onClick={() => {
                                        cueSourceRef.current = null
                                        setCompareId(member.meta.id)
                                    }}
                                >
                                    {member.meta.shortName}
                                </button>
                            ))}
                        </div>
                    )}
                    <section className="viewport-card" aria-label="Visualization">
                        <div className="viewport-toolbar">
                            <span className="live-dot" />
                            <span>
                                {compare
                                    ? module.meta.category === 'Optimization'
                                        ? 'TOPIC COMPARISON'
                                        : 'SHARED INPUT'
                                    : 'LIVE SIMULATION'}
                            </span>
                            <span className="toolbar-spacer" />
                            <span>{activeModule.meta.dimensionality}</span>
                        </div>
                        {scene ? (
                            <Suspense
                                fallback={<div className="canvas-fallback">Loading 3D view…</div>}
                            >
                                <div className={sceneStale ? 'canvas-obscured' : undefined}>
                                    <VisualizationCanvas
                                        algorithm={scene.algorithm}
                                        frame={scene.frame}
                                        onSelect={setSelected}
                                        selectedId={selected}
                                        cameraCommand={camera}
                                        reducedMotion={reducedMotion}
                                        theme={theme}
                                    />
                                </div>
                            </Suspense>
                        ) : (
                            <div
                                className="canvas-fallback"
                                role={snapshot.status === 'error' ? 'alert' : undefined}
                            >
                                {snapshot.error ||
                                    (snapshot.status === 'generating'
                                        ? 'Generating or loading a step…'
                                        : 'No simulation frames were produced.')}
                            </div>
                        )}
                        {sceneStale && (
                            <div className="canvas-transition" role="status">
                                Generating or loading the selected run…
                            </div>
                        )}
                        <div className="camera-toolbar" aria-label="Camera controls">
                            <button
                                aria-label="Reset camera"
                                title="Reset camera (C)"
                                onClick={() => cameraPreset('perspective')}
                            >
                                <SketchIcon name="camera" size={16} />
                            </button>
                            <button onClick={() => cameraPreset('top')}>Top</button>
                            <button onClick={() => cameraPreset('side')}>Side</button>
                        </div>
                    </section>
                    {(snapshot.status === 'cancelled' ||
                        snapshot.status === 'error' ||
                        (finished && snapshot.outcome !== 'success')) && (
                        <div
                            className={
                                'terminal-message terminal-' + (snapshot.outcome ?? snapshot.status)
                            }
                            role={snapshot.status === 'error' ? 'alert' : 'status'}
                        >
                            <strong>{outcomeText}</strong>
                            <span>
                                {snapshot.status === 'cancelled'
                                    ? 'Generation was cancelled before the search finished.'
                                    : frame?.explanation ||
                                      snapshot.error ||
                                      'This run could not finish.'}
                            </span>
                        </div>
                    )}
                    {run && snapshot.status === 'generating' && (
                        <div className="notice" role="status">
                            Generating trace… {snapshot.available} steps available.
                            <button
                                type="button"
                                onClick={() => {
                                    run?.cancel()
                                    setPlaying(false)
                                    setTraceVersion((value) => value + 1)
                                }}
                            >
                                Cancel generation
                            </button>
                        </div>
                    )}
                    <section className="transport" aria-label="Simulation playback">
                        <div className="transport-buttons">
                            <button
                                aria-label="First step"
                                title="First step"
                                disabled={!frame}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    setPlaying(false)
                                    setIndex(0)
                                }}
                            >
                                <SketchIcon name="first" />
                            </button>
                            <button
                                aria-label="Previous step"
                                title="Previous step (Left)"
                                disabled={!frame || index === 0}
                                onClick={() => {
                                    setPlaying(false)
                                    cueSourceRef.current = 'manual'
                                    setIndex((old) => clampFrame(old - 1, total))
                                }}
                            >
                                <SketchIcon name="previous" />
                            </button>
                            <button
                                className="play-button"
                                aria-label={playing ? 'Pause' : 'Play'}
                                title={playing ? 'Pause (Space)' : 'Play (Space)'}
                                disabled={!frame || (total < 2 && snapshot.status !== 'generating')}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    if (timelineFinished) setIndex(0)
                                    setPlaying((old) => !old)
                                }}
                            >
                                <SketchIcon name={playing ? 'pause' : 'play'} size={16} />
                                {playing ? 'Pause' : 'Play'}
                            </button>
                            <button
                                aria-label="Next step"
                                title="Next step (Right)"
                                disabled={!frame || index >= total - 1}
                                onClick={() => {
                                    setPlaying(false)
                                    cueSourceRef.current = 'manual'
                                    setIndex((old) => clampFrame(old + 1, total))
                                }}
                            >
                                <SketchIcon name="next" />
                            </button>
                            <button
                                aria-label="Last step"
                                title="Last step"
                                disabled={!frame}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    setPlaying(false)
                                    setIndex(Math.max(0, total - 1))
                                }}
                            >
                                <SketchIcon name="last" />
                            </button>
                            <button
                                aria-label="Restart"
                                title="Restart (R)"
                                disabled={!frame}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    setPlaying(false)
                                    setIndex(0)
                                }}
                            >
                                <SketchIcon name="restart" size={17} />
                            </button>
                        </div>
                        <div className="timeline-group">
                            <div className="timeline-label">
                                <span>EXECUTION TIMELINE</span>
                                <strong>
                                    Step {frame?.index ?? index} /{' '}
                                    {comparisonSession
                                        ? comparisonSession.totalKnown()
                                            ? Math.max(0, total - 1)
                                            : 'pending'
                                        : snapshot.total === null
                                          ? 'pending'
                                          : Math.max(0, snapshot.total - 1)}
                                </strong>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={Math.max(0, total - 1)}
                                value={index}
                                disabled={!frame}
                                aria-label="Execution timeline"
                                onChange={(event) => {
                                    cueSourceRef.current = null
                                    setPlaying(false)
                                    setIndex(Number(event.target.value))
                                }}
                            />
                        </div>
                        <label className="speed-control">
                            <span className="sr-only">Execution speed</span>
                            <select
                                value={speed}
                                aria-label="Execution speed"
                                onChange={(event) => setSpeed(Number(event.target.value))}
                            >
                                {SPEEDS.map((value) => (
                                    <option key={value} value={value}>
                                        {value}×
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            className="sound-toggle"
                            type="button"
                            aria-label={soundEnabled ? 'Mute step sounds' : 'Enable step sounds'}
                            aria-pressed={soundEnabled}
                            onClick={() => {
                                if (soundEnabled) {
                                    setSoundEnabled(false)
                                    setSoundMessage('')
                                    return
                                }
                                void soundRef.current.enable().then((available) => {
                                    setSoundEnabled(available)
                                    setSoundMessage(
                                        available ? '' : 'Sound unavailable in this browser.',
                                    )
                                })
                            }}
                        >
                            <SketchIcon name={soundEnabled ? 'sound' : 'muted'} size={17} />
                            <span>{soundEnabled ? 'Sound on' : 'Sound off'}</span>
                        </button>
                        {soundMessage && (
                            <span className="sr-only" role="status">
                                {soundMessage}
                            </span>
                        )}
                    </section>
                    {comparison && (
                        <section
                            className="comparison-panel"
                            aria-label={
                                module.meta.category === 'Graph Search'
                                    ? 'Search comparison'
                                    : 'Topic comparison'
                            }
                        >
                            <div className="panel-title">
                                <h2>
                                    {module.meta.category === 'Graph Search'
                                        ? 'Same map, different search'
                                        : `${module.meta.category} comparison`}
                                </h2>
                                <span>Replay position {index}</span>
                            </div>
                            <div className="comparison-grid">
                                {members.map((member) => {
                                    const id = member.meta.id
                                    const result = comparison[id]
                                    const resultState = result.snapshot()
                                    const resultIndex = Math.min(
                                        index,
                                        Math.max(0, resultState.available - 1),
                                    )
                                    const cached = loadedFrames.get(result)
                                    const current =
                                        cached?.index === resultIndex ? cached.frame : null
                                    const details = comparisonSummary(id, current)
                                    const effective = effectiveComparisonParams(
                                        member,
                                        compareShared,
                                        compareParams[id] ?? {},
                                    )
                                    const status =
                                        resultState.status === 'complete' && resultState.outcome
                                            ? outcomeLabel[resultState.outcome]
                                            : resultState.status === 'generating'
                                              ? 'Generating'
                                              : resultState.status === 'cancelled'
                                                ? 'Cancelled'
                                                : 'Error'
                                    return (
                                        <button
                                            key={id}
                                            className={
                                                'comparison-card ' +
                                                (compareId === id ? 'active' : '')
                                            }
                                            onClick={() => {
                                                cueSourceRef.current = null
                                                setCompareId(id)
                                            }}
                                        >
                                            <strong>{member.meta.shortName}</strong>
                                            <span>{comparisonInputLabel(id, effective)}</span>
                                            <span>Status {status}</span>
                                            <span>
                                                Steps {current?.index ?? resultIndex} /{' '}
                                                {resultState.total === null
                                                    ? 'pending'
                                                    : resultState.total - 1}
                                            </span>
                                            {details.map((detail) => (
                                                <span key={detail.label}>
                                                    {detail.label} {detail.value}
                                                </span>
                                            ))}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="small-note">
                                {module.meta.category === 'Graph Search'
                                    ? compareShared.weightMode === 'terrain'
                                        ? 'BFS optimizes hop count; Dijkstra minimizes weighted terrain cost. DFS returns its first route. Browser timing is not a benchmark.'
                                        : 'On a uniform grid without diagonals, Dijkstra and BFS can find the same minimum-hop route. DFS returns its first route. Browser timing is not a benchmark.'
                                    : module.meta.category === 'Array Techniques'
                                      ? 'Both methods use the same sorted array. Target value and target sum ask different questions.'
                                      : 'These algorithms solve different optimization problems. Their objective values and schedule sizes are not directly comparable.'}{' '}
                                Replay positions do not represent equivalent operations.
                            </p>
                        </section>
                    )}
                    <div
                        className={
                            'learning-grid ' + (mobileTab === 'learn' ? 'mobile-learning' : '')
                        }
                    >
                        <section className="panel pseudocode-panel">
                            <Sticker name="balloon" className="panel-sticker" />
                            <div className="panel-title">
                                <div>
                                    <span className="eyebrow">FOLLOW THE LOGIC</span>
                                    <h2>Pseudocode</h2>
                                </div>
                                <div className="pseudocode-companion">
                                    <ComputerServer
                                        phase={serverPhase}
                                        moving={
                                            playing && !reducedMotion && serverPhase === 'working'
                                        }
                                        stepping={
                                            !!displayedChanged &&
                                            cueSourceRef.current !== null &&
                                            !reducedMotion
                                        }
                                        step={frame?.index ?? 0}
                                        total={snapshot.total ?? snapshot.available}
                                    />
                                    <span className="panel-badge">
                                        {activeModule.meta.shortName}
                                    </span>
                                </div>
                            </div>
                            <ol className="pseudocode-list">
                                {activeModule.pseudocode.map((line) => (
                                    <li
                                        key={line.id}
                                        className={
                                            'pseudo-line ' +
                                            (frame?.activeLines.includes(line.id) ? 'active' : '')
                                        }
                                    >
                                        <span>{String(line.id).padStart(2, '0')}</span>
                                        <code>{line.text}</code>
                                    </li>
                                ))}
                            </ol>
                        </section>
                        <section className="panel details-panel">
                            <Sticker name="pencil" className="panel-sticker detail-sticker" />
                            <div
                                className="detail-tabs"
                                role="tablist"
                                aria-label="Learning details"
                            >
                                <button
                                    role="tab"
                                    aria-selected={learningTab === 'step'}
                                    className={learningTab === 'step' ? 'active' : ''}
                                    onClick={() => setLearningTab('step')}
                                >
                                    Current step
                                </button>
                                <button
                                    role="tab"
                                    aria-selected={learningTab === 'guide'}
                                    className={learningTab === 'guide' ? 'active' : ''}
                                    onClick={() => setLearningTab('guide')}
                                >
                                    Guide
                                </button>
                            </div>
                            {learningTab === 'step' ? (
                                <div className="detail-content">
                                    <span className="eyebrow">
                                        {frame?.event.toUpperCase() || 'ERROR'}
                                    </span>
                                    <div className="step-heading">
                                        <h2>Step {frame?.index || 0}</h2>
                                        <WalkingShoes
                                            step={frame?.index ?? 0}
                                            progress={
                                                lastDisplayedIndex
                                                    ? (frame?.index ?? 0) / lastDisplayedIndex
                                                    : 0
                                            }
                                            direction={stepDirection}
                                            moving={shoesMoving}
                                        />
                                    </div>
                                    <p className="step-explanation" aria-live="polite">
                                        {frame?.explanation || snapshot.error}
                                    </p>
                                    {(finished ||
                                        snapshot.status === 'cancelled' ||
                                        snapshot.status === 'error') && (
                                        <span
                                            className={
                                                'outcome-badge outcome-' +
                                                (snapshot.outcome ?? snapshot.status)
                                            }
                                        >
                                            {outcomeText}
                                        </span>
                                    )}
                                    <h3>Metrics</h3>
                                    {frame && <Metrics items={frame.metrics} />}
                                    {selected !== null && (
                                        <>
                                            <h3>Selected object</h3>
                                            {inspection ? (
                                                <Metrics items={inspection} />
                                            ) : (
                                                <p className="muted">
                                                    This object is not present at this step.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="detail-content guide-content">
                                    <h3>Overview</h3>
                                    <p>{activeModule.education.overview}</p>
                                    <h3>Intuition</h3>
                                    <p>{activeModule.education.intuition}</p>
                                    {activeModule.education.formula && (
                                        <div
                                            className="formula"
                                            role="math"
                                            aria-label={activeModule.education.formula}
                                        >
                                            {formulaHtml ? (
                                                <span
                                                    dangerouslySetInnerHTML={{
                                                        __html: formulaHtml,
                                                    }}
                                                />
                                            ) : (
                                                activeModule.education.formula
                                            )}
                                        </div>
                                    )}
                                    <h3>Complexity</h3>
                                    <p>{activeModule.education.complexity}</p>
                                    <h3>Parameters</h3>
                                    <ul>
                                        {activeModule.parameters.map((parameter) => (
                                            <li key={parameter.key}>
                                                <strong>{parameter.label}:</strong>{' '}
                                                {parameter.description ||
                                                    'Controls this experiment.'}
                                            </li>
                                        ))}
                                    </ul>
                                    <h3>Visualization legend</h3>
                                    <div className="legend-list">
                                        {activeModule.education.legend.map((item) => (
                                            <div key={item.label}>
                                                <i
                                                    aria-hidden="true"
                                                    style={{
                                                        background: legendTone(item.label)
                                                            ? scenePalette(theme)[
                                                                  legendTone(item.label)!
                                                              ]
                                                            : item.color,
                                                    }}
                                                >
                                                    {item.mark}
                                                </i>
                                                <span>
                                                    <strong>{item.label}</strong>
                                                    <small>{item.meaning}</small>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <h3>Applications</h3>
                                    <p>{activeModule.education.applications}</p>
                                    <h3>References</h3>
                                    <ul>
                                        {activeModule.education.references.map((reference) => (
                                            <li key={reference.label}>
                                                <a
                                                    href={reference.url}
                                                    target={
                                                        reference.url.startsWith('http')
                                                            ? '_blank'
                                                            : undefined
                                                    }
                                                    rel={
                                                        reference.url.startsWith('http')
                                                            ? 'noopener noreferrer'
                                                            : undefined
                                                    }
                                                >
                                                    {reference.label}
                                                </a>{' '}
                                                <small>({reference.kind})</small>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
                <aside
                    className={
                        'sidebar parameter-sidebar ' +
                        (mobileTab === 'parameters' ? 'mobile-active' : '')
                    }
                    aria-label="Experiment parameters"
                >
                    <Sticker name="butterfly" className="parameter-sticker" />
                    <div className="sidebar-heading">
                        <span className="eyebrow">TUNE THE EXPERIMENT</span>
                        <h2>Parameters</h2>
                        <p>Change a setting to regenerate this run.</p>
                    </div>
                    {compare ? (
                        <div className="parameter-body comparison-parameters">
                            {sharedDefinitions.length > 0 && (
                                <section aria-label="Shared comparison input">
                                    <h3>Shared input</h3>
                                    <ParameterFields
                                        definitions={resolveParameterDefinitions(
                                            sharedDefinitions,
                                            compareShared,
                                        )}
                                        params={compareShared}
                                        idPrefix="compare-shared"
                                        onChange={updateComparisonShared}
                                    />
                                    {sharedDefinitions.some(
                                        (definition) => definition.type === 'seed',
                                    ) && (
                                        <button
                                            className="secondary-button"
                                            onClick={() => {
                                                const random = new Uint32Array(1)
                                                crypto.getRandomValues(random)
                                                updateComparisonShared('seed', random[0])
                                            }}
                                        >
                                            <SketchIcon name="shuffle" size={15} /> Randomize shared
                                            seed
                                        </button>
                                    )}
                                </section>
                            )}
                            {members.map((member) => {
                                const definitions = comparisonSpecificDefinitions(
                                    member,
                                    module.meta.category,
                                )
                                const effective = effectiveComparisonParams(
                                    member,
                                    compareShared,
                                    compareParams[member.meta.id] ?? {},
                                )
                                return (
                                    <section
                                        key={member.meta.id}
                                        aria-label={`${member.meta.shortName} settings`}
                                    >
                                        <h3>{member.meta.shortName}</h3>
                                        {definitions.length ? (
                                            <ParameterFields
                                                definitions={resolveParameterDefinitions(
                                                    definitions,
                                                    effective,
                                                )}
                                                params={effective}
                                                idPrefix={`compare-${member.meta.id}`}
                                                onChange={(key, value) =>
                                                    updateComparisonSpecific(
                                                        member.meta.id,
                                                        key,
                                                        value,
                                                    )
                                                }
                                            />
                                        ) : (
                                            <p className="small-note">Uses the shared input.</p>
                                        )}
                                    </section>
                                )
                            })}
                            {configError && (
                                <p className="error-box" role="alert">
                                    {configError}
                                </p>
                            )}
                            <div className="parameter-actions">
                                <button
                                    className="secondary-button"
                                    onClick={() => {
                                        const settings = initialComparisonSettings(
                                            module.meta.category,
                                            algorithmId,
                                            module.defaults,
                                        )
                                        setCompareShared(settings.shared)
                                        setCompareParams(settings.individual)
                                    }}
                                >
                                    <SketchIcon name="restart" size={15} /> Defaults
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ParameterPanel
                            key={algorithmId}
                            definitions={resolveParameterDefinitions(module.parameters, params)}
                            params={params}
                            presets={module.presets}
                            error={configError}
                            onChange={(key, value) => commit({ ...params, [key]: value }, key)}
                            onPreset={(values) =>
                                commit({ ...module.defaults, ...values } as Params)
                            }
                            onReset={() => commit(module.defaults)}
                            onRandomize={randomize}
                        />
                    )}
                </aside>
            </div>
            <footer>
                <Sticker name="fish" className="footer-sticker" />
                <span>Algorithm Motion · Explore the process, not just the result.</span>
                <button onClick={() => setShortcuts(true)}>Keyboard shortcuts</button>
            </footer>
            {shortcuts && (
                <div className="modal-backdrop" onClick={() => setShortcuts(false)}>
                    <div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Keyboard shortcuts"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            aria-label="Close shortcuts"
                            onClick={() => setShortcuts(false)}
                        >
                            <SketchIcon name="close" />
                        </button>
                        <span className="eyebrow">WORK FASTER</span>
                        <h2>Keyboard shortcuts</h2>
                        <Metrics
                            items={[
                                { label: 'Space', value: 'Play / pause' },
                                { label: 'Right / Left', value: 'Next / previous step' },
                                { label: 'R', value: 'Restart' },
                                { label: 'C', value: 'Reset camera' },
                            ]}
                        />
                        <p>Shortcuts are inactive while you edit a field.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
