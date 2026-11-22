import type { Complex } from "../complex";
import { square } from "./square";
import { heart } from "./heart";
import { text } from "./text";

export { square, heart, text };

type Preset = (n: number) => Complex[] | Promise<Complex[]>;

export const presets: Record<string, Preset> = {
    square: (n) => square(n),
    heart: (n) => heart(n),
    pi: (n) => text("π", n),
    mk: (n) => text("MK", n),
};