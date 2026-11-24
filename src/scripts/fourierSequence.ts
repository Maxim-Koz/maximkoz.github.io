import type { Complex } from "./complex";
import { computeVectors, type Vector } from "./dft";

export type SequenceOptions = {
    circles?: number;      // circles per contour
    seconds?: number;      // how long the whole word takes to draw
    sizeFraction?: number; // word size relative to the canvas
    outlines?: number;     // how many of the biggest circles get an outline drawn
    loop?: boolean;        // replay after finishing
    pauseSeconds?: number; // hold time before replaying
    lineWidth?: number;
};

type Part = { anchor: Complex; vectors: Vector[]; samples: number };
type Point = { x: number; y: number };

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
    } = options;

    const usable = contours.filter((c) => c.length >= 3);
    if (usable.length === 0) throw new Error("startFourierSequence needs at least one contour");

    const ctx = canvas.getContext("2d")!;
    const trail = document.createElement("canvas");
    const trailCtx = trail.getContext("2d")!;

    // Each contour gets its own circles, centred on its own average point
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
    let t = 0;                       // progress shared by ALL contours (0 to 1)
    let finished = false;
    let restartAt = 0;
    const prevs: (Point | null)[] = parts.map(() => null); // each pen's last position
    let colour = "#4aa8f5";
    let raf = 0;
    let last = 0;

    if (reduceMotion) {
        t = 1;
        finished = true;
    }

    const px = (x: number) => w / 2 + (x - cx) * scale;
    const py = (y: number) => h / 2 + (y - cy) * scale;

    function tipAt(i: number, time: number, drawArms: boolean): Point {
        const part = parts[i];
        let x = px(part.anchor.real);
        let y = py(part.anchor.imag);

        for (let k = 0; k < part.vectors.length; k++) {
            const v = part.vectors[k];
            const r = v.radius * scale;
            const angle = 2 * Math.PI * v.frequency * time + v.phase;
            const nx = x + r * Math.cos(angle);
            const ny = y + r * Math.sin(angle);

            if (drawArms) {
                if (k < outlines) {
                    ctx.globalAlpha = 0.12;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.globalAlpha = 0.4;
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

    // Redraw everything drawn so far (after a resize or colour change),
    // so progress is kept instead of restarting
    function rebuildTrail() {
        trailCtx.clearRect(0, 0, w, h);
        for (let i = 0; i < parts.length; i++) {
            prevs[i] = null;
            if (t <= 0) continue;
            const n = Math.max(1, Math.ceil(t * parts[i].samples));
            for (let s = 0; s <= n; s++) {
                extendTrail(i, tipAt(i, (t * s) / n, false));
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = colour;
        if (!finished) {
            for (let i = 0; i < parts.length; i++) {
                extendTrail(i, tipAt(i, t, true));
            }
        }
        ctx.globalAlpha = 0.9;
        ctx.drawImage(trail, 0, 0, w, h);
        ctx.globalAlpha = 1;
    }

    function restart() {
        t = 0;
        finished = false;
        for (let i = 0; i < parts.length; i++) prevs[i] = null;
        trailCtx.clearRect(0, 0, w, h);
    }

    function step(now: number) {
        const dt = Math.min((now - last) / 1000, 0.1); // clamp after tab switches
        last = now;

        if (!finished) {
            t += dt / seconds;
            if (t >= 1) {
                t = 1;
                for (let i = 0; i < parts.length; i++) {
                    extendTrail(i, tipAt(i, 1, false)); // close every outline
                }
                finished = true;
                restartAt = now + pauseSeconds * 1000;
            }
        } else if (doLoop && now >= restartAt) {
            restart();
        }

        render();

        if (finished && !doLoop) {
            raf = 0; // done: leave the finished word on screen
            return;
        }
        raf = requestAnimationFrame(step);
    }

    const play = () => {
        if (raf || (finished && !doLoop)) return;
        last = performance.now();
        raf = requestAnimationFrame(step);
    };
    const pause = () => { cancelAnimationFrame(raf); raf = 0; };

    function resize() {
        const rect = canvas.getBoundingClientRect();
        // ignore non-changes (e.g. a phone's address bar)
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

    // Starts when it scrolls into view, pauses when it leaves, and keeps its progress
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