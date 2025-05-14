import { XmlComponent } from '../../../../../../../xml-components';
type SchemeColorOptions = {
    readonly value: (typeof SchemeColor)[keyof typeof SchemeColor];
};
export declare const SchemeColor: {
    readonly BG1: "bg1";
    readonly TX1: "tx1";
    readonly BG2: "bg2";
    readonly TX2: "tx2";
    readonly ACCENT1: "accent1";
    readonly ACCENT2: "accent2";
    readonly ACCENT3: "accent3";
    readonly ACCENT4: "accent4";
    readonly ACCENT5: "accent5";
    readonly ACCENT6: "accent6";
    readonly HLINK: "hlink";
    readonly FOLHLINK: "folHlink";
    readonly DK1: "dk1";
    readonly LT1: "lt1";
    readonly DK2: "dk2";
    readonly LT2: "lt2";
    readonly PHCLR: "phClr";
};
export declare const createSchemeColor: (options: SchemeColorOptions) => XmlComponent;
export {};
