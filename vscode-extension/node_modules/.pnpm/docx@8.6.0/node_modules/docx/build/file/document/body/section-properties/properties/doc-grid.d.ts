import { XmlAttributeComponent, XmlComponent } from '../../../../xml-components';
export declare const DocumentGridType: {
    readonly DEFAULT: "default";
    readonly LINES: "lines";
    readonly LINES_AND_CHARS: "linesAndChars";
    readonly SNAP_TO_CHARS: "snapToChars";
};
export interface IDocGridAttributesProperties {
    readonly type?: (typeof DocumentGridType)[keyof typeof DocumentGridType];
    readonly linePitch?: number;
    readonly charSpace?: number;
}
export declare class DocGridAttributes extends XmlAttributeComponent<IDocGridAttributesProperties> {
    protected readonly xmlKeys: {
        type: string;
        linePitch: string;
        charSpace: string;
    };
}
export declare class DocumentGrid extends XmlComponent {
    constructor(linePitch: number, charSpace?: number, type?: (typeof DocumentGridType)[keyof typeof DocumentGridType]);
}
