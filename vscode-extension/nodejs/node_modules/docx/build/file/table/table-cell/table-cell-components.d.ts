import { IBorderOptions } from '../../border';
import { IgnoreIfEmptyXmlComponent, XmlComponent } from '../../xml-components';
export interface ITableCellBorders {
    readonly top?: IBorderOptions;
    readonly start?: IBorderOptions;
    readonly left?: IBorderOptions;
    readonly bottom?: IBorderOptions;
    readonly end?: IBorderOptions;
    readonly right?: IBorderOptions;
}
export declare class TableCellBorders extends IgnoreIfEmptyXmlComponent {
    constructor(options: ITableCellBorders);
}
export declare class GridSpan extends XmlComponent {
    constructor(value: number);
}
export declare const VerticalMergeType: {
    readonly CONTINUE: "continue";
    readonly RESTART: "restart";
};
export declare class VerticalMerge extends XmlComponent {
    constructor(value: (typeof VerticalMergeType)[keyof typeof VerticalMergeType]);
}
export declare const TextDirection: {
    readonly BOTTOM_TO_TOP_LEFT_TO_RIGHT: "btLr";
    readonly LEFT_TO_RIGHT_TOP_TO_BOTTOM: "lrTb";
    readonly TOP_TO_BOTTOM_RIGHT_TO_LEFT: "tbRl";
};
export declare class TDirection extends XmlComponent {
    constructor(value: (typeof TextDirection)[keyof typeof TextDirection]);
}
