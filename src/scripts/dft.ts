import { type Complex, add, multiply, exp, divide } from "./complex";

export type Vector = { radius: number; frequency: number; phase: number };

export function computeVectors(points: Complex[]): Vector[] {
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