import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ParameterPanel from './components/ParameterPanel'
import { ComputerServer, WalkingShoes, type ServerPhase } from './components/LearningCompanions'
import { SketchIcon, Sticker } from './components/SketchArt'
import type { CameraCommand } from './components/VisualizationCanvas'
import { algorithmById, algorithms, categories } from './engine/registry'
import { clampFrame, SPEEDS } from './engine/timeline'
import { encodeHash, parseHash } from './engine/url'
import { validateParameters } from './engine/parameters'
import { shouldPlayStepCue, StepSound, type StepCueSource } from './engine/stepSound'
import { legendTone, scenePalette } from './visual/scenePalette'
import type { Params, SimulationRun } from './engine/types'
import {
    createGrid,
    gridDefaults,
    runGrid,
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
const gridIds = ['bfs', 'dijkstra', 'astar']
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
    const [compareId, setCompareId] = useState<GridAlgorithm>('astar')
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
    const displayedRef = useRef<{ run: SimulationRun<any>; index: number | null } | null>(null)
    const module = algorithmById(algorithmId) || algorithms[2]

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
    }, [algorithmId, params])
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

    const normalRun = useMemo<SimulationRun<any>>(() => {
        try {
            return module.run(params)
        } catch (error) {
            return {
                frames: [],
                outcome: 'error',
                error: error instanceof Error ? error.message : 'Unable to generate experiment.',
            }
        }
    }, [module, params])
    const comparison = useMemo(() => {
        if (!compare || !gridIds.includes(algorithmId)) return null
        try {
            const settings = { ...gridDefaults, ...params } as GridParams
            const environment = createGrid(settings)
            return {
                bfs: runGrid('bfs', settings, environment),
                dijkstra: runGrid('dijkstra', settings, environment),
                astar: runGrid('astar', settings, environment),
            }
        } catch {
            return null
        }
    }, [compare, algorithmId, params])
    const activeModule = comparison ? algorithmById(compareId)! : module
    const run = comparison ? comparison[compareId] : normalRun
    const total = comparison
        ? Math.max(...Object.values(comparison).map((item) => item.frames.length))
        : run.frames.length
    const frame = run.frames[Math.min(index, Math.max(0, run.frames.length - 1))]
    const lastDisplayedIndex = Math.max(0, run.frames.length - 1)
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
        !frame || frame.index === 0
            ? 'ready'
            : frame.index >= lastDisplayedIndex
              ? 'burnout'
              : 'working'
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
    }, [index, frame, run, soundEnabled])
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
        if (index >= total - 1) setPlaying(false)
    }, [index, total])
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
        setParams(checked.params)
        setCompare(false)
        setNotice('')
        setMobileTab('view')
        location.hash = encodeHash(id, checked.params)
    }, [])
    const commit = (next: Params) => {
        const checked = validateParameters(module.parameters, next)
        if (Object.values(checked.errors).length) {
            setConfigError(Object.values(checked.errors).join(' '))
            return
        }
        if (
            algorithmId === 'rrt' &&
            Number(checked.params.obstacleMin) > Number(checked.params.obstacleMax)
        ) {
            setConfigError('Minimum obstacle radius must not exceed maximum radius.')
            return
        }
        setConfigError('')
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
    const formatCost = (
        id: GridAlgorithm,
        path: number[],
        environment: ReturnType<typeof createGrid>,
    ) => {
        if (!path.length) return '—'
        if (id === 'bfs') return String(path.length - 1)
        return String(
            +path
                .slice(1)
                .reduce((sum, cell, i) => {
                    const prior = path[i],
                        diagonal =
                            cell % environment.width !== prior % environment.width &&
                            Math.floor(cell / environment.width) !==
                                Math.floor(prior / environment.width)
                    return sum + environment.weights[cell] * (diagonal ? Math.SQRT2 : 1)
                }, 0)
                .toFixed(2),
        )
    }

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
                            <h3>{category}</h3>
                            {algorithms
                                .filter((item) => item.meta.category === category)
                                .map((item) => (
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
                        {gridIds.includes(algorithmId) && (
                            <button
                                className={'secondary-button ' + (compare ? 'selected' : '')}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    setCompare((old) => !old)
                                    setCompareId(algorithmId as GridAlgorithm)
                                }}
                            >
                                {compare ? 'Exit compare' : 'Compare searches'}
                            </button>
                        )}
                    </div>
                    {activeModule.meta.id === 'astar' &&
                        (Number(params.heuristicWeight) > 1 ||
                            (params.diagonal === true && params.heuristic === 'manhattan')) && (
                            <p className="algorithm-caveat">
                                This heuristic setting can speed exploration, but the resulting path
                                is not guaranteed to have minimum cost.
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
                            {(['bfs', 'dijkstra', 'astar'] as const).map((id) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={compareId === id}
                                    className={compareId === id ? 'active' : ''}
                                    onClick={() => {
                                        cueSourceRef.current = null
                                        setCompareId(id)
                                    }}
                                >
                                    {algorithmById(id)!.meta.shortName}
                                </button>
                            ))}
                        </div>
                    )}
                    <section className="viewport-card" aria-label="Visualization">
                        <div className="viewport-toolbar">
                            <span className="live-dot" />
                            <span>{compare ? 'SHARED ENVIRONMENT' : 'LIVE SIMULATION'}</span>
                            <span className="toolbar-spacer" />
                            <span>{activeModule.meta.dimensionality}</span>
                        </div>
                        {frame ? (
                            <Suspense
                                fallback={<div className="canvas-fallback">Loading 3D view…</div>}
                            >
                                <VisualizationCanvas
                                    algorithm={activeModule}
                                    frame={frame}
                                    onSelect={setSelected}
                                    selectedId={selected}
                                    cameraCommand={camera}
                                    reducedMotion={reducedMotion}
                                    theme={theme}
                                />
                            </Suspense>
                        ) : (
                            <div className="canvas-fallback" role="alert">
                                {run.error || 'No simulation frames were produced.'}
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
                                disabled={!frame || total < 2}
                                onClick={() => {
                                    cueSourceRef.current = null
                                    if (index >= total - 1) setIndex(0)
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
                                    Step {frame?.index || 0} / {Math.max(0, total - 1)}
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
                        <section className="comparison-panel" aria-label="Search comparison">
                            <div className="panel-title">
                                <h2>Same map, different search</h2>
                                <span>Shared step {index}</span>
                            </div>
                            <div className="comparison-grid">
                                {(['bfs', 'dijkstra', 'astar'] as const).map((id) => {
                                    const result = comparison[id],
                                        current =
                                            result.frames[
                                                Math.min(index, result.frames.length - 1)
                                            ],
                                        path = current.state.path
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
                                            <strong>{algorithmById(id)!.meta.shortName}</strong>
                                            <span>Visited {current.state.visited.length}</span>
                                            <span>
                                                Steps {current.index} / {result.frames.length - 1}
                                            </span>
                                            <span>Hops {path.length ? path.length - 1 : '—'}</span>
                                            <span>
                                                {id === 'bfs' ? 'Hop distance' : 'Path cost'}{' '}
                                                {formatCost(id, path, current.state.environment)}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="small-note">
                                BFS optimizes hop count. Weighted cost and hop count answer
                                different questions; browser timing is not a benchmark.
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
                                        total={run.frames.length}
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
                                        {frame?.explanation || run.error}
                                    </p>
                                    {index >= run.frames.length - 1 && (
                                        <span className={'outcome-badge outcome-' + run.outcome}>
                                            {run.outcome === 'success'
                                                ? 'Completed'
                                                : run.outcome === 'no-path'
                                                  ? 'No path'
                                                  : run.outcome === 'limit'
                                                    ? 'Iteration limit'
                                                    : 'Error'}
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
                    <ParameterPanel
                        key={algorithmId}
                        definitions={module.parameters}
                        params={params}
                        presets={module.presets}
                        error={configError}
                        onChange={(key, value) => commit({ ...params, [key]: value })}
                        onPreset={(values) => commit({ ...module.defaults, ...values } as Params)}
                        onReset={() => commit(module.defaults)}
                        onRandomize={randomize}
                    />
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
