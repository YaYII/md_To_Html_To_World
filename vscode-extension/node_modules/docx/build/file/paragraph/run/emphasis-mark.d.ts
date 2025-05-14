import { XmlComponent } from '../../xml-components';
export declare const EmphasisMarkType: {
    readonly DOT: "dot";
};
export declare abstract class BaseEmphasisMark extends XmlComponent {
    protected constructor(emphasisMarkType: (typeof EmphasisMarkType)[keyof typeof EmphasisMarkType]);
}
export declare class EmphasisMark extends BaseEmphasisMark {
    constructor(emphasisMarkType?: (typeof EmphasisMarkType)[keyof typeof EmphasisMarkType]);
}
export declare class DotEmphasisMark extends BaseEmphasisMark {
    constructor();
}
