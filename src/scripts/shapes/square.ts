import type { Complex } from "../complex";

export function square(n = 100, scale = 10): Complex[] {
    const shapeScale = 2.5;
    const squareSize = 100 * shapeScale;
    const halfSize = squareSize / 2;
    const pointsPerSide = n / 4; // Divide n by 4 to get points per side

    const points: Complex[] = [];

    for (let i = 0; i < pointsPerSide; i++) {
        const progress = i / pointsPerSide;
        points.push({ real: -halfSize + squareSize * progress, imag: -halfSize });
    }

    for (let i = 0; i < pointsPerSide; i++) {
        const progress = i / pointsPerSide;
        points.push({ real: halfSize, imag: -halfSize + squareSize * progress });
    }

    for (let i = 0; i < pointsPerSide; i++) {
        const progress = i / pointsPerSide;
        points.push({ real: halfSize - squareSize * progress, imag: halfSize });
    }

    for (let i = 0; i < pointsPerSide; i++) {
        const progress = i / pointsPerSide;
        points.push({ real: -halfSize, imag: halfSize - squareSize * progress });
    }

    return points;
}