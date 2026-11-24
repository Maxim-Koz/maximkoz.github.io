import opentype from "opentype.js";
import type { Complex } from "../complex";
import { pathToPoints } from "./fromPath";
import { fonts } from "../fonts";

export const DEFAULT_FONT = fonts.grotesk;

const cache = new Map<string, Promise<opentype.Font>>();

export function loadFont(url: string) {
    if (!cache.has(url)) {
        cache.set(
            url,
            fetch(url).then((r) => r.arrayBuffer()).then((buf) => opentype.parse(buf)),
        );
    }
    return cache.get(url)!;
}

export async function text(
    str: string,
    n = 400,
    size = 250,
    fontUrl = DEFAULT_FONT,
): Promise<Complex[]> {
    const font = await loadFont(fontUrl);
    const d = font.getPath(str, 0, 0, 200).toPathData(3);
    const g = font.charToGlyph("π");
    console.log("glyph index:", g.index, "name:", g.name);
    console.log("path:", font.getPath("π", 0, 0, 200).toPathData(3).slice(0, 80));
    return pathToPoints(d, n, size);
}