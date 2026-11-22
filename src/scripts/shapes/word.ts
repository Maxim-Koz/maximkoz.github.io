import type { Complex } from "../complex";
import { samplePath } from "./fromPath";
import { DEFAULT_FONT, loadFont } from "./text";


export async function wordContours(
    str: string,
    density = 0.5,
    fontUrl = DEFAULT_FONT,
): Promise<Complex[][]> {
    const font = await loadFont(fontUrl);
    const d = font.getPath(str, 0, 0, 200).toPathData(3);
    if (!d) throw new Error(`Font has no outlines for "${str}"`);
    if (d.includes("NaN")) {
        throw new Error("Font outline contains NaN: use opentype.js@1.3.4");
    }

    return d
        .split(/(?=M)/)
        .filter((sub) => sub.trim())
        .map((sub) => samplePath(sub, density))
        .filter((points) => points.length >= 3);
}