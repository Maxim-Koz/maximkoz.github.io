import * as Shapes from "./shapes";


const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) throw new Error("Canvas not found");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D canvas context not available");

const drawingContext: CanvasRenderingContext2D = ctx;
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

const trailCanvas = document.createElement("canvas");
trailCanvas.width = canvasWidth;
trailCanvas.height = canvasHeight;
const trailContext = trailCanvas.getContext("2d");
if (!trailContext) throw new Error("2D trail context not available");
const trailDrawingContext: CanvasRenderingContext2D = trailContext;

let centerX = canvasWidth / 2;
let centerY = canvasHeight / 2;
let previousTipX: number | undefined;
let previousTipY: number | undefined;

const canvasElement = canvas;

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasElement.width = canvasWidth;
    canvasElement.height = canvasHeight;

    trailCanvas.width = canvasWidth;
    trailCanvas.height = canvasHeight;

    centerX = canvasWidth / 2;
    centerY = canvasHeight / 2;

    previousTipX = undefined;
    previousTipY = undefined;
}

window.addEventListener("resize", resizeCanvas);

export type Complex = {
    real: number;
    imag: number;
};

//! The shape
const points = Shapes.heart(80);


function add(a: Complex, b: Complex): Complex {
    return { real: a.real + b.real, imag: a.imag + b.imag };
}

function fromPolar(radius: number, phase: number): Complex {
    return {
        real: radius * Math.cos(phase),
        imag: radius * Math.sin(phase),
    };
}

function multiply(a: Complex, b: Complex): Complex {
    return {
        real: a.real * b.real - a.imag * b.imag,
        imag: a.real * b.imag + a.imag * b.real,
    };
}

type RotatingVector = {
    radius: number;
    frequency: number;
    phase: number;
};

function exp(angel: number): Complex {
    return { real: Math.cos(angel), imag: Math.sin(angel) };
}

function divide(a: Complex, divisor: number): Complex {
    return { real: a.real / divisor, imag: a.imag / divisor };
}


const coefficients: Complex[] = [];

for (let frequency = 0; frequency < points.length; frequency++) {
    let coefficient: Complex = { real: 0, imag: 0 };

    for (let sample = 0; sample < points.length; sample++) {
        const phase = (-2 * Math.PI * frequency * sample) / points.length;
        coefficient = add(coefficient, multiply(points[sample], exp(phase)));
    }

    coefficients.push(divide(coefficient, points.length));
}

const signedVectors: RotatingVector[] = coefficients.map((coefficient, index) => {
    const frequency = index <= Math.floor(points.length / 2)
        ? index
        : index - points.length;

    return {
        radius: Math.sqrt(coefficient.real * coefficient.real + coefficient.imag * coefficient.imag),
        frequency,
        phase: Math.atan2(coefficient.imag, coefficient.real),
    };
});

const rotatingVectors: RotatingVector[] = signedVectors.sort(
    (a, b) => b.radius - a.radius,
);

let time = 0;


function animate(noCircles: number) {
    time += 1 / points.length;
    if (time >= 1) time = 0;

    let tip: Complex = { real: centerX, imag: centerY };

    drawingContext.clearRect(0, 0, canvasWidth, canvasHeight);

    const circleCount = Math.min(noCircles, rotatingVectors.length);

    for (let i = 0; i < circleCount; i++) {
        const vector = rotatingVectors[i];
        const phase = 2 * Math.PI * vector.frequency * time + vector.phase;
        const nextTip = add(tip, fromPolar(vector.radius, phase));


        drawingContext.beginPath();
        drawingContext.moveTo(tip.real, tip.imag);
        drawingContext.lineTo(nextTip.real, nextTip.imag);
        drawingContext.stroke();

        tip = nextTip;
    }

    if (previousTipX !== undefined && previousTipY !== undefined) {
        trailDrawingContext.beginPath();
        trailDrawingContext.moveTo(previousTipX, previousTipY);
        trailDrawingContext.lineTo(tip.real, tip.imag);
        trailDrawingContext.stroke();
    }

    previousTipX = tip.real;
    previousTipY = tip.imag;

    drawingContext.drawImage(trailCanvas, 0, 0);

    requestAnimationFrame(() => animate(noCircles));
}

requestAnimationFrame(() => animate(50));

export { };