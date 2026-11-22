import { type Complex, add, multiply, exp, divide } from "./complex";

export type FourierOptions = {
    circles?: number;
    speed?: number;
    sizeFraction?: number;
    outlines?: number;
};

type Vector = { radius: number; frequency: number; phase: number };

const BASE = 1000;

function normalise(points: Complex[]): Complex[] {
    const xs = points.map((p) => p.real);
    const ys = points.map((p) => p.imag);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const extent = Math.max(maxX - minX, maxY - minY) || 1;
    const s = BASE / extent;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return points.map((p) => ({ real: (p.real - cx) * s, imag: (p.imag - cy) * s }));
}

function computeVectors(points: Complex[]): Vector[] {
    const n = points.length;
    const vectors: Vector[] = [];

    for (let k = 0; k < n; k++) {
        let sum: Complex = { real: 0, imag: 0 };
        for (let s = 0; s < n; s++) {
            sum = add(sum, multiply(points[s], exp((-2 * Math.PI * k * s) / n)));
        }
        const c = divide(sum, n);
        vectors.push({
            radius: Math.hypot(c.real, c.imag),
            frequency: k <= Math.floor(n / 2) ? k : k - n,
            phase: Math.atan2(c.imag, c.real),
        });
    }
    return vectors.sort((a, b) => b.radius - a.radius);
}

export function startFourier(
    canvas: HTMLCanvasElement,
    points: Complex[],
    options: FourierOptions = {},
): () => void {
    const {
        circles = 200,
        speed = 0.9,
        sizeFraction = 0.8,
        outlines = 30,
    } = options;

    if (points.length < 2) throw new Error("startFourier needs at least 2 points");

    const ctx = canvas.getContext("2d")!;
    const trail = document.createElement("canvas");
    const trailCtx = trail.getContext("2d")!;

    const vectors = computeVectors(normalise(points));
    const count = Math.min(circles, vectors.length);
    const steps = points.length;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, scale = 1;
    let time = 0;
    let prev: { x: number; y: number } | null = null;
    let colour = "#4aa8f5";
    let raf = 0;

    function resetTrail() {
        trailCtx.clearRect(0, 0, w, h);
        prev = null;
        time = 0;
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();

        // Ignore non-changes (e.g. a phone's address bar showing/hiding), so the drawing doesn't restart
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
        scale = (Math.min(w, h) * sizeFraction) / BASE;
        resetTrail();
        if (reduceMotion) drawStatic();
    }

    function readColour() {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue("--fourier")
            .trim();
        if (value) colour = value;
        resetTrail();
        if (reduceMotion) drawStatic();
    }

    function tipAt(t: number, drawArms: boolean) {
        let x = w / 2;
        let y = h / 2;

        for (let i = 0; i < count; i++) {
            const v = vectors[i];
            const r = v.radius * scale;
            const angle = 2 * Math.PI * v.frequency * t + v.phase;
            const nx = x + r * Math.cos(angle);
            const ny = y + r * Math.sin(angle);

            if (drawArms) {
                if (i < outlines) {
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

    function extendTrail(tip: { x: number; y: number }) {
        if (prev) {
            trailCtx.strokeStyle = colour;
            trailCtx.lineWidth = 2;
            trailCtx.beginPath();
            trailCtx.moveTo(prev.x, prev.y);
            trailCtx.lineTo(tip.x, tip.y);
            trailCtx.stroke();
        }
        prev = tip;
    }

    function showTrail() {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(trail, 0, 0, w, h);
        ctx.globalAlpha = 1;
    }

    function frame() {
        time += speed / steps;
        if (time >= 1) time = 0;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = colour;
        extendTrail(tipAt(time, true));
        showTrail();
    }

    function drawStatic() {
        resetTrail();
        for (let i = 0; i <= steps * 2; i++) extendTrail(tipAt(i / (steps * 2), false));
        ctx.clearRect(0, 0, w, h);
        showTrail();
    }

    function loop() {
        frame();
        raf = requestAnimationFrame(loop);
    }
    const play = () => { if (!raf && !reduceMotion) loop(); };
    const pause = () => { cancelAnimationFrame(raf); raf = 0; };

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

    // Pause when scrolled out of view; resumes where it left off
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