import type { Complex } from "../fourier";

export function heart(n = 100, scale = 10): Complex[] {
    return Array.from({ length: n }, (_, i) => {
        const t = (2 * Math.PI * i) / n;
        return {
            real: scale * 16 * Math.sin(t) ** 3,
            imag: -scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
        };
    });
}