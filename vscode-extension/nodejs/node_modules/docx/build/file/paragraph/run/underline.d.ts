import { XmlComponent } from '../../xml-components';
export declare const UnderlineType: {
    readonly SINGLE: "single";
    readonly WORDS: "words";
    readonly DOUBLE: "double";
    readonly THICK: "thick";
    readonly DOTTED: "dotted";
    readonly DOTTEDHEAVY: "dottedHeavy";
    readonly DASH: "dash";
    readonly DASHEDHEAVY: "dashedHeavy";
    readonly DASHLONG: "dashLong";
    readonly DASHLONGHEAVY: "dashLongHeavy";
    readonly DOTDASH: "dotDash";
    readonly DASHDOTHEAVY: "dashDotHeavy";
    readonly DOTDOTDASH: "dotDotDash";
    readonly DASHDOTDOTHEAVY: "dashDotDotHeavy";
    readonly WAVE: "wave";
    readonly WAVYHEAVY: "wavyHeavy";
    readonly WAVYDOUBLE: "wavyDouble";
    readonly NONE: "none";
};
export declare class Underline extends XmlComponent {
    constructor(underlineType?: (typeof UnderlineType)[keyof typeof UnderlineType], color?: string);
}
