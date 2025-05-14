import { IDistance } from "../drawing";
export declare const TextWrappingType: {
    readonly NONE: 0;
    readonly SQUARE: 1;
    readonly TIGHT: 2;
    readonly TOP_AND_BOTTOM: 3;
};
export declare const TextWrappingSide: {
    readonly BOTH_SIDES: "bothSides";
    readonly LEFT: "left";
    readonly RIGHT: "right";
    readonly LARGEST: "largest";
};
export interface ITextWrapping {
    readonly type: (typeof TextWrappingType)[keyof typeof TextWrappingType];
    readonly side?: (typeof TextWrappingSide)[keyof typeof TextWrappingSide];
    readonly margins?: IDistance;
}
