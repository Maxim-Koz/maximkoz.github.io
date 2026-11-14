const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) throw new Error("Canvas not found");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D canvas context not available");

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const length = 80;
let angle = 0;
let previousX = centerX + length;
let previousY = centerY;

function animate() {
    angle += 0.02;

    const x = centerX + length * Math.cos(angle);
    const y = centerY + length * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(previousX, previousY);
    ctx.lineTo(x, y);
    ctx.stroke();

    previousX = x;
    previousY = y;

    requestAnimationFrame(animate);
}

animate();

export { };