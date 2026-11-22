export type Complex = {
    real: number;
    imag: number;
};

export function add(a: Complex, b: Complex): Complex {
    return { real: a.real + b.real, imag: a.imag + b.imag };
}

export function fromPolar(radius: number, phase: number): Complex {
    return {
        real: radius * Math.cos(phase),
        imag: radius * Math.sin(phase),
    };
}

export function multiply(a: Complex, b: Complex): Complex {
    return {
        real: a.real * b.real - a.imag * b.imag,
        imag: a.real * b.imag + a.imag * b.real,
    };
}

export function exp(angel: number): Complex {
    return { real: Math.cos(angel), imag: Math.sin(angel) };
}

export function divide(a: Complex, divisor: number): Complex {
    return { real: a.real / divisor, imag: a.imag / divisor };
}