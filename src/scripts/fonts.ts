import grotesk from "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url";
import lmMath from "../assets/fonts/latinmodern-math-1959/latinmodern-math.otf?url";

export const fonts = {
    grotesk,
    math: lmMath,
} as const;

export type FontName = keyof typeof fonts;