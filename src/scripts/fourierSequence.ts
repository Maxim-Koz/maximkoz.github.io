import type { Complex } from "./complex";
import { computeVectors, type Vector } from "./dft";

export type SequenceOptions = {
    circles?: number;
    seconds?: number;
    sizeFraction?: number;
    outlines?: number;
    loop?: boolean;
    pauseSeconds?: number;
    lineWidth?: number;
    fade?: boolean;
    fadeSeconds?: number;
};

type Part = { anchor: Complex; vectors: Vector[]; samples: number };
type Point = { x: number; y: number };

const FILL_ALPHA = 0.25;
const smooth = (x: number) => x * x * (3 - 2 * x);

export function getBounds(contours: Complex[][]) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of contours) {
        for (const p of c) {
            if (p.real < minX) minX = p.real;
            if (p.real > maxX) maxX = p.real;
            if (p.imag < minY) minY = p.imag;
            if (p.imag > maxY) maxY = p.imag;
        }
    }
    return { minX, maxX, minY, maxY, width: maxX - minX || 1, height: maxY - minY || 1 };
}

export function startFourierSequence(
    canvas: HTMLCanvasElement,
    contours: Complex[][],
    options: SequenceOptions = {},
): () => void {
    const {
        circles = 150,
        seconds = 8,
        sizeFraction = 0.9,
        outlines = 20,
        loop = false,
        pauseSeconds = 3,
        lineWidth = 2,
        fade = false,
        fadeSeconds = 3,
    } = options;

    const usable = contours.filter((c) => c.length >= 3);
    if (usable.length === 0) throw new Error("startFourierSequence needs at least one contour");

    const ctx = canvas.getContext("2d")!;
    const trail = document.createElement("canvas");
    const trailCtx = trail.getContext("2d")!;

    const parts: Part[] = usable.map((points) => {
        let ax = 0, ay = 0;
        for (const p of points) { ax += p.real; ay += p.imag; }
        return {
            anchor: { real: ax / points.length, imag: ay / points.length },
            vectors: computeVectors(points)
                .filter((v) => v.frequency !== 0)
                .slice(0, circles),
            samples: Math.max(200, points.length * 2),
        };
    });

    const bounds = getBounds(usable);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doLoop = loop && !reduceMotion;

    let w = 0, h = 0, scale = 1;
    let t = 0;
    let finished = false;
    let fadeT = 0;
    let restartAt = 0;
    const prevs: (Point | null)[] = parts.map(() => null);
    let fillPath: Path2D | null = null;
    let colour = "#4aa8f5";
    let raf = 0;
    let last = 0;
    let spinT = 0;

    if (reduceMotion) {
        t = 1;
        finished = true;
        fadeT = fade ? 1 : 0;
    }

    const settled = () => finished && (!fade || fadeT >= 1);

    const px = (x: number) => w / 2 + (x - cx) * scale;
    const py = (y: number) => h / 2 + (y - cy) * scale;

    function tipAt(i: number, time: number, armAlpha: number): Point {
        const part = parts[i];
        let x = px(part.anchor.real);
        let y = py(part.anchor.imag);

        for (let k = 0; k < part.vectors.length; k++) {
            const v = part.vectors[k];
            const r = v.radius * scale;
            const angle = 2 * Math.PI * v.frequency * time + v.phase;
            const nx = x + r * Math.cos(angle);
            const ny = y + r * Math.sin(angle);

            if (armAlpha > 0) {
                if (k < outlines) {
                    ctx.globalAlpha = 0.12 * armAlpha;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.globalAlpha = 0.4 * armAlpha;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(nx, ny);
                ctx.stroke();
            }
            x = nx;
            y = ny;
        }
        return { x, y };
    }

    function extendTrail(i: number, tip: Point) {
        const prev = prevs[i];
        if (prev) {
            trailCtx.strokeStyle = colour;
            trailCtx.lineWidth = lineWidth;
            trailCtx.beginPath();
            trailCtx.moveTo(prev.x, prev.y);
            trailCtx.lineTo(tip.x, tip.y);
            trailCtx.stroke();
        }
        prevs[i] = tip;
    }

    function getFillPath(): Path2D {
        if (fillPath) return fillPath;
        const path = new Path2D();
        for (let i = 0; i < parts.length; i++) {
            const n = parts[i].samples;
            for (let s = 0; s < n; s++) {
                const p = tipAt(i, s / n, 0);
                if (s === 0) path.moveTo(p.x, p.y);
                else path.lineTo(p.x, p.y);
            }
            path.closePath();
        }
        fillPath = path;
        return path;
    }

    function rebuildTrail() {
        trailCtx.clearRect(0, 0, w, h);
        for (let i = 0; i < parts.length; i++) {
            prevs[i] = null;
            if (t <= 0) continue;
            const n = Math.max(1, Math.ceil(t * parts[i].samples));
            for (let s = 0; s <= n; s++) {
                extendTrail(i, tipAt(i, (t * s) / n, 0));
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = colour;

        if (fade && finished && fadeT > 0) {
            ctx.globalAlpha = FILL_ALPHA * smooth(fadeT);
            ctx.fillStyle = colour;
            ctx.fill(getFillPath());
        }

        if (!finished) {
            for (let i = 0; i < parts.length; i++) {
                extendTrail(i, tipAt(i, t, 1));
            }
        } else if (fade && fadeT < 1) {
            const alpha = 1 - smooth(fadeT);
            for (let i = 0; i < parts.length; i++) tipAt(i, spinT, alpha);
        }

        ctx.globalAlpha = 0.9;
        ctx.drawImage(trail, 0, 0, w, h);
        ctx.globalAlpha = 1;
    }

    function restart() {
        t = 0;
        fadeT = 0;
        finished = false;
        for (let i = 0; i < parts.length; i++) prevs[i] = null;
        trailCtx.clearRect(0, 0, w, h);
    }

    function step(now: number) {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        if (!finished) {
            t += dt / seconds;
            if (t >= 1) {
                t = 1;
                for (let i = 0; i < parts.length; i++) {
                    extendTrail(i, tipAt(i, 1, 0));
                }
                finished = true;
                fadeT = 0;
                spinT = 0;
                if (!fade) restartAt = now + pauseSeconds * 1000;
            }
        } else if (fade && fadeT < 1) {
            spinT = (spinT + dt / fadeSeconds) % 1;
            fadeT = Math.min(1, fadeT + dt / Math.max(fadeSeconds, 0.01));
            if (fadeT >= 1) restartAt = now + pauseSeconds * 1000;
        } else if (doLoop && now >= restartAt) {
            restart();
        }

        render();

        if (settled() && !doLoop) {
            raf = 0;
            return;
        }
        raf = requestAnimationFrame(step);
    }

    const play = () => {
        if (raf || (settled() && !doLoop)) return;
        last = performance.now();
        raf = requestAnimationFrame(step);
    };
    const pause = () => { cancelAnimationFrame(raf); raf = 0; };

    function resize() {
        const rect = canvas.getBoundingClientRect();
        if (Math.abs(rect.width - w) < 1 && Math.abs(rect.height - h) < 1) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = rect.width;
        h = rect.height;
        for (const c of [canvas, trail]) {
            c.width = Math.round(w * dpr);
            c.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        scale = Math.min(
            (w * sizeFraction) / bounds.width,
            (h * sizeFraction) / bounds.height,
        );
        fillPath = null;
        rebuildTrail();
        render();
    }

    function readColour() {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue("--fourier")
            .trim();
        if (value) colour = value;
        rebuildTrail();
        render();
    }

    resize();
    readColour();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    themeQuery.addEventListener("change", readColour);
    const themeObserver = new MutationObserver(readColour);
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });

    const visibility = new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? play() : pause();
    });
    visibility.observe(canvas);

    return () => {
        pause();
        resizeObserver.disconnect();
        themeObserver.disconnect();
        visibility.disconnect();
        themeQuery.removeEventListener("change", readColour);
    };
}