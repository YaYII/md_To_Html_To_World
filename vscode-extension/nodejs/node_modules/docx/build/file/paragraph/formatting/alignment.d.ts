import { XmlAttributeComponent, XmlComponent } from '../../xml-components';
export declare const AlignmentType: {
    readonly START: "start";
    readonly CENTER: "center";
    readonly END: "end";
    readonly BOTH: "both";
    readonly MEDIUM_KASHIDA: "mediumKashida";
    readonly DISTRIBUTE: "distribute";
    readonly NUM_TAB: "numTab";
    readonly HIGH_KASHIDA: "highKashida";
    readonly LOW_KASHIDA: "lowKashida";
    readonly THAI_DISTRIBUTE: "thaiDistribute";
    readonly LEFT: "left";
    readonly RIGHT: "right";
    readonly JUSTIFIED: "both";
};
export declare class AlignmentAttributes extends XmlAttributeComponent<{
    readonly val: (typeof AlignmentType)[keyof typeof AlignmentType];
}> {
    protected readonly xmlKeys: {
        val: string;
    };
}
export declare class Alignment extends XmlComponent {
    constructor(type: (typeof AlignmentType)[keyof typeof AlignmentType]);
}
