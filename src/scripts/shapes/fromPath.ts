import type { Complex } from "../fourier";

export function pathToPoints(d: string, n: number, size = 250): Complex[] {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    const length = path.getTotalLength();

    const raw = Array.from({ length: n }, (_, i) => {
        const p = path.getPointAtLength((i / n) * length);
        return { real: p.x, imag: p.y };
    });

    // Centre on the bounding box and scale so the longest side equals `size`
    const xs = raw.map((p) => p.real);
    const ys = raw.map((p) => p.imag);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = size / Math.max(maxX - minX, maxY - minY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return raw.map((p) => ({
        real: (p.real - cx) * scale,
        imag: (p.imag - cy) * scale,
    }));
}