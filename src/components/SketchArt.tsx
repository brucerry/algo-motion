import type { ReactNode } from 'react'

export type SketchIconName =
    | 'first'
    | 'previous'
    | 'play'
    | 'pause'
    | 'next'
    | 'last'
    | 'restart'
    | 'camera'
    | 'sun'
    | 'moon'
    | 'help'
    | 'book'
    | 'shuffle'
    | 'close'
    | 'sound'
    | 'muted'

const iconPaths: Record<SketchIconName, ReactNode> = {
    first: (
        <>
            <path d="M5 4.5 4.7 19.5" />
            <path d="m18.8 4.8-9.7 7.1 9.5 7.2z" />
        </>
    ),
    previous: (
        <>
            <path d="m17.8 5-10.6 7 10.4 7.1" />
            <path d="M8.1 12.1h11" />
        </>
    ),
    play: <path d="M7.3 4.5 19.3 12 7.1 19.5 7.3 4.5z" />,
    pause: (
        <>
            <path d="m8 5-.2 14" />
            <path d="m16.3 4.8-.3 14.4" />
        </>
    ),
    next: (
        <>
            <path d="m6.2 5 10.6 7-10.4 7.1" />
            <path d="M15.9 12.1h-11" />
        </>
    ),
    last: (
        <>
            <path d="m5.2 4.8 9.7 7.1-9.5 7.2z" />
            <path d="m19 4.5.3 15" />
        </>
    ),
    restart: (
        <>
            <path d="M6.2 7.3c2.4-3.6 8.1-4.5 11.5-1.2 3.3 3.2 3.1 8.6-.5 11.5-3.9 3.1-9.3 1.7-11.5-2" />
            <path d="m6.8 3.6-.6 4.2 4 .6" />
        </>
    ),
    camera: (
        <>
            <path d="m3.7 7.2 4-.2 1.6-2.5 5.8-.1 1.6 2.6 3.7.3-.2 12-16.5-.2z" />
            <path d="M12 9.2c2.3 0 4 1.8 4.1 4.1 0 2.3-1.8 4-4 4.1-2.3 0-4.1-1.8-4.1-4.1 0-2.3 1.8-4 4-4.1Z" />
        </>
    ),
    sun: (
        <>
            <path d="M12 6.8c2.8 0 5.2 2.4 5.2 5.1 0 2.9-2.4 5.3-5.2 5.3-2.9 0-5.2-2.4-5.2-5.3S9.1 6.8 12 6.8Z" />
            <path d="M12 2.1v2M12 19.9v2M2 12h2M20 12h2M4.8 4.7l1.4 1.4m11.6 11.7 1.5 1.5M19.2 4.7l-1.5 1.4M6.2 17.8l-1.4 1.5" />
        </>
    ),
    moon: (
        <path d="M18.8 16.8C12.5 19 6.4 13 8.5 5.1c-.2 5.1 4.2 8.4 9 8.1 3.1-.2 5.5-2.2 7-5.3Z" />
    ),
    help: (
        <>
            <path d="M9.2 8.5c.3-2 1.9-3.2 4-3 2 .3 3.5 1.8 3.3 3.7-.2 2.9-3.8 2.7-3.8 5.3" />
            <path d="M12.6 18.8h.1" />
            <path d="M12 2.7c5.1-.2 9.2 4 9.2 9.1 0 5.2-4 9.3-9.2 9.4-5.1.1-9.3-4.1-9.2-9.3.1-5 4.1-9 9.2-9.2Z" />
        </>
    ),
    book: (
        <>
            <path d="M3 5.5c3.6-1.4 6.6-.7 9 1.1 2.4-1.8 5.3-2.5 9-1.1v13.4c-3.7-1.2-6.7-.7-9 1.1-2.3-1.8-5.3-2.3-9-1.1z" />
            <path d="M12 6.6v13.2" />
        </>
    ),
    shuffle: (
        <>
            <path d="M3 6h3.3c3.9 0 6.1 12 11.4 12H21" />
            <path d="m17.4 14.8 3.7 3.2-3.7 2.9M3 18h3.3c1.8 0 3.2-2.8 4.5-5.6M13.3 9.1C14.6 7.3 16 6 17.7 6H21m-3.6-3 3.7 3-3.7 3" />
        </>
    ),
    close: (
        <>
            <path d="M5.2 5.3c4.5 4.6 9.1 9.2 13.6 13.7" />
            <path d="M18.8 5.1 5.1 18.9" />
        </>
    ),
    sound: (
        <>
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            <path d="M16 8q4 4 0 8m2-11q7 7 0 14" />
        </>
    ),
    muted: (
        <>
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            <path d="m16 9 5 6m0-6-5 6" />
        </>
    ),
}

export function SketchIcon({ name, size = 18 }: { name: SketchIconName; size?: number }) {
    return (
        <svg
            className="sketch-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.05"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {iconPaths[name]}
        </svg>
    )
}

export type StickerName =
    | 'sun'
    | 'cloud'
    | 'flower'
    | 'star'
    | 'squiggle'
    | 'kite'
    | 'pencil'
    | 'butterfly'
    | 'rocket'
    | 'fish'
    | 'balloon'
    | 'rainbow'
    | 'planet'

export function Sticker({ name, className = '' }: { name: StickerName; className?: string }) {
    return (
        <svg
            className={`sticker sticker-${name} ${className}`}
            data-sticker={name}
            viewBox="0 0 120 120"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {name === 'sun' && (
                <>
                    <path
                        fill="var(--sticker-gold)"
                        d="M59 26c19-2 35 13 36 32 2 18-12 35-32 37-20 2-38-13-38-33-1-19 14-34 34-36Z"
                    />
                    <path d="M60 8v11M61 101v10M9 61h11m81-2h11M23 23l9 9m56 57 8 8m1-75-9 9M33 88l-9 9" />
                    <path d="M45 57h1m26-1h1M49 72c7 7 17 7 24-1" />
                    <path
                        stroke="var(--sticker-gold-shade)"
                        strokeWidth="2.8"
                        d="M42 41c9-8 23-11 36-5M39 80c11 10 25 13 40 5"
                    />
                </>
            )}
            {name === 'cloud' && (
                <>
                    <path
                        fill="var(--sticker-cloud)"
                        d="M23 81C11 76 9 62 18 54c6-6 12-7 18-5 2-17 16-29 32-25 13 2 19 11 22 22 14-1 24 7 25 20 1 12-8 21-20 21l-70 1Z"
                    />
                    <path d="M38 99c-3 4-3 6-4 8m18-7-3 9m22-9-3 8" />
                    <path
                        stroke="var(--sticker-cloud-shade)"
                        strokeWidth="3"
                        d="M24 73c13 8 52 10 77 2M48 45c7-13 21-17 32-9"
                    />
                </>
            )}
            {name === 'flower' && (
                <>
                    <path d="M60 69c-1 13 1 29-4 43m4-21c-11-12-21-7-25-6 7 10 14 14 25 12m-1-4c9-10 18-9 24-9-4 12-13 17-24 14" />
                    <path
                        fill="#ef9ead"
                        d="M60 25c-12-19-31-7-24 9-21-6-25 16-8 23-13 16 2 29 18 19 8 20 29 15 30-4 17 10 30-7 17-20 15-12 5-29-14-24-3-16-15-19-19-3Z"
                    />
                    <path
                        fill="var(--sticker-gold)"
                        d="M60 40c10 0 17 7 17 17 0 9-8 16-17 16s-17-7-17-16c0-10 7-17 17-17Z"
                    />
                </>
            )}
            {name === 'star' && (
                <>
                    <path
                        fill="var(--sticker-gold)"
                        d="m60 7 13 35 36 1-28 23 10 38-31-20-32 20 10-38L10 43l36-1z"
                    />
                    <path d="m48 62 3 2m18-2 3-1M53 73c6 5 13 5 18 0" />
                    <path
                        stroke="var(--sticker-gold-shade)"
                        strokeWidth="2.5"
                        d="m51 37 8-18 8 19M26 48l17 1m34 0 18-1M41 86l-3 10m43-10 3 10"
                    />
                </>
            )}
            {name === 'squiggle' && (
                <>
                    <path
                        stroke="#ed867c"
                        strokeWidth="11"
                        d="M10 62c17-43 31-42 37-13 5 29 15 34 27 3 12-31 25-25 36 8"
                    />
                    <path
                        stroke="#f7cf67"
                        strokeWidth="5"
                        d="M13 80c15-25 28-27 34-6 6 21 18 24 30 0 10-21 20-21 30-5"
                    />
                </>
            )}
            {name === 'kite' && (
                <>
                    <path fill="#88ccc1" d="m63 9 34 42-36 35-36-35z" />
                    <path d="M63 10 61 86M25 51h72M61 86c-9 13 11 17 2 29m-3-13-8-4 4 10m11-1 9-5-2 11" />
                </>
            )}
            {name === 'pencil' && (
                <>
                    <path fill="var(--sticker-gold)" d="m25 88 57-64 16 15-58 63-21 6z" />
                    <path d="m72 36 16 15M25 88l15 14m-21 6 11-4M84 22l7-6 16 15-7 8" />
                    <path
                        stroke="var(--sticker-gold-shade)"
                        strokeWidth="3"
                        d="m35 87 49-55m-40 65 48-55"
                    />
                </>
            )}
            {name === 'butterfly' && (
                <>
                    <path fill="#efa7c1" d="M59 54C32 11 9 19 20 49c-15 14-5 36 25 24l14-19Z" />
                    <path fill="#9bcec0" d="M62 54c26-42 48-34 39-4 15 13 3 35-25 23L62 54Z" />
                    <path
                        fill="var(--sticker-gold)"
                        d="M59 45c-10 1-12 21-3 29 10 7 19-17 8-27l-5-2Z"
                    />
                    <path d="M55 46c-7-13-12-18-17-20m26 21c5-13 10-18 16-21M36 49l6 5m39-5-6 5" />
                </>
            )}
            {name === 'rocket' && (
                <>
                    <path fill="#a8d6d0" d="M39 76C37 46 56 21 88 12c5 35-9 58-35 71L39 76Z" />
                    <path fill="#f3a48d" d="m39 61-15 3-9 23 25-10m24 3-4 22-23 8 3-32" />
                    <path
                        fill="var(--sticker-gold)"
                        d="M37 84c-10 3-17 13-16 25 13-2 22-11 23-20"
                    />
                    <circle cx="66" cy="46" r="10" fill="var(--sticker-cream)" />
                    <path d="m42 76 11 8m34-68 6 7" />
                </>
            )}
            {name === 'fish' && (
                <>
                    <path fill="#89c9c8" d="M20 63c19-35 57-39 75-2-18 36-56 34-75 2Z" />
                    <path fill="#f5b681" d="M24 63 8 42l1 43 15-22Zm35-25 9-17 12 18" />
                    <circle cx="77" cy="56" r="3" fill="currentColor" stroke="none" />
                    <path d="M81 72c5 2 8 1 12-3m-54-9 8 5m-8 8 8-5m52-36 4-5m8 22 4-4" />
                </>
            )}
            {name === 'balloon' && (
                <>
                    <path
                        fill="#eea9b9"
                        d="M60 11c21 0 33 16 31 35-2 21-18 34-31 41C46 80 29 67 29 45c0-19 12-34 31-34Z"
                    />
                    <path fill="var(--sticker-gold)" d="m54 85 6 10 7-10M60 95c-13 8 8 9-4 18" />
                    <path d="M42 38c1-7 5-11 11-13" />
                </>
            )}
            {name === 'rainbow' && (
                <>
                    <path
                        stroke="#ee9a95"
                        strokeWidth="11"
                        d="M16 88c4-49 29-70 48-69 20 1 38 24 40 69"
                    />
                    <path
                        stroke="var(--sticker-gold)"
                        strokeWidth="10"
                        d="M26 88c3-36 19-57 38-57 17 1 29 22 30 57"
                    />
                    <path
                        stroke="#91c7bf"
                        strokeWidth="10"
                        d="M38 88c2-26 13-44 26-44 12 0 20 18 20 44"
                    />
                    <path d="M5 91c5-5 11-5 16 0m78 0c6-5 12-5 17 1" />
                </>
            )}
            {name === 'planet' && (
                <>
                    <circle cx="60" cy="60" r="28" fill="#c9b6df" />
                    <path d="M36 41c-22 4-29 14-22 23 9 11 40 16 66 9 25-7 33-18 25-27-4-5-10-8-20-9M30 76c15 13 54 18 76 1" />
                    <path d="m53 51 4 3m16 10 3-2M13 27l3 6 6 2-6 2-3 6-3-6-6-2 6-2z" />
                </>
            )}
        </svg>
    )
}
