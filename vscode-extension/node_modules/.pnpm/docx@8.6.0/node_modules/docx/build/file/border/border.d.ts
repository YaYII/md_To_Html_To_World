import { XmlComponent } from '../xml-components';
export interface IBorderOptions {
    readonly style: (typeof BorderStyle)[keyof typeof BorderStyle];
    readonly color?: string;
    readonly size?: number;
    readonly space?: number;
}
export declare class BorderElement extends XmlComponent {
    constructor(elementName: string, { color, size, space, style }: IBorderOptions);
}
export declare const BorderStyle: {
    readonly SINGLE: "single";
    readonly DASH_DOT_STROKED: "dashDotStroked";
    readonly DASHED: "dashed";
    readonly DASH_SMALL_GAP: "dashSmallGap";
    readonly DOT_DASH: "dotDash";
    readonly DOT_DOT_DASH: "dotDotDash";
    readonly DOTTED: "dotted";
    readonly DOUBLE: "double";
    readonly DOUBLE_WAVE: "doubleWave";
    readonly INSET: "inset";
    readonly NIL: "nil";
    readonly NONE: "none";
    readonly OUTSET: "outset";
    readonly THICK: "thick";
    readonly THICK_THIN_LARGE_GAP: "thickThinLargeGap";
    readonly THICK_THIN_MEDIUM_GAP: "thickThinMediumGap";
    readonly THICK_THIN_SMALL_GAP: "thickThinSmallGap";
    readonly THIN_THICK_LARGE_GAP: "thinThickLargeGap";
    readonly THIN_THICK_MEDIUM_GAP: "thinThickMediumGap";
    readonly THIN_THICK_SMALL_GAP: "thinThickSmallGap";
    readonly THIN_THICK_THIN_LARGE_GAP: "thinThickThinLargeGap";
    readonly THIN_THICK_THIN_MEDIUM_GAP: "thinThickThinMediumGap";
    readonly THIN_THICK_THIN_SMALL_GAP: "thinThickThinSmallGap";
    readonly THREE_D_EMBOSS: "threeDEmboss";
    readonly THREE_D_ENGRAVE: "threeDEngrave";
    readonly TRIPLE: "triple";
    readonly WAVE: "wave";
};
