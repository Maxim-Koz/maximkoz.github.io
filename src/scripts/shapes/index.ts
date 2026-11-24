import type { Complex } from "../complex";
import { square } from "./square";
import { heart } from "./heart";
import { text } from "./text";
import { fonts } from "../fonts";


export { square, heart, text };

type Preset = (n: number) => Complex[] | Promise<Complex[]>;

export const presets: Record<string, Preset> = {
    square: (n) => square(n),
    heart: (n) => heart(n),
    pi: (n) => text("π", n, 250, fonts.math),
    mk: (n) => text("MK", n),
};