import { XmlComponent } from '../../xml-components';
import { PositiveUniversalMeasure, UniversalMeasure } from '../../../util/values';
export declare const TableAnchorType: {
    readonly MARGIN: "margin";
    readonly PAGE: "page";
    readonly TEXT: "text";
};
export declare const RelativeHorizontalPosition: {
    readonly CENTER: "center";
    readonly INSIDE: "inside";
    readonly LEFT: "left";
    readonly OUTSIDE: "outside";
    readonly RIGHT: "right";
};
export declare const RelativeVerticalPosition: {
    readonly CENTER: "center";
    readonly INSIDE: "inside";
    readonly BOTTOM: "bottom";
    readonly OUTSIDE: "outside";
    readonly INLINE: "inline";
    readonly TOP: "top";
};
export declare const OverlapType: {
    readonly NEVER: "never";
    readonly OVERLAP: "overlap";
};
export type ITableFloatOptions = {
    readonly horizontalAnchor?: (typeof TableAnchorType)[keyof typeof TableAnchorType];
    readonly absoluteHorizontalPosition?: number | UniversalMeasure;
    readonly relativeHorizontalPosition?: (typeof RelativeHorizontalPosition)[keyof typeof RelativeHorizontalPosition];
    readonly verticalAnchor?: (typeof TableAnchorType)[keyof typeof TableAnchorType];
    readonly absoluteVerticalPosition?: number | UniversalMeasure;
    readonly relativeVerticalPosition?: (typeof RelativeVerticalPosition)[keyof typeof RelativeVerticalPosition];
    readonly bottomFromText?: number | PositiveUniversalMeasure;
    readonly topFromText?: number | PositiveUniversalMeasure;
    readonly leftFromText?: number | PositiveUniversalMeasure;
    readonly rightFromText?: number | PositiveUniversalMeasure;
    readonly overlap?: (typeof OverlapType)[keyof typeof OverlapType];
};
export declare class TableFloatProperties extends XmlComponent {
    constructor({ horizontalAnchor, verticalAnchor, absoluteHorizontalPosition, relativeHorizontalPosition, absoluteVerticalPosition, relativeVerticalPosition, bottomFromText, topFromText, leftFromText, rightFromText, overlap, }: ITableFloatOptions);
}
