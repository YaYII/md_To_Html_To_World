import { XmlComponent } from '../../../../../../../xml-components';
import { SchemeColor } from "./scheme-color";
export declare const LineCap: {
    readonly ROUND: "rnd";
    readonly SQUARE: "sq";
    readonly FLAT: "flat";
};
export declare const CompoundLine: {
    readonly SINGLE: "sng";
    readonly DOUBLE: "dbl";
    readonly THICK_THIN: "thickThin";
    readonly THIN_THICK: "thinThick";
    readonly TRI: "tri";
};
export declare const PenAlignment: {
    readonly CENTER: "ctr";
    readonly INSET: "in";
};
export type OutlineAttributes = {
    readonly width?: number;
    readonly cap?: keyof typeof LineCap;
    readonly compoundLine?: keyof typeof CompoundLine;
    readonly align?: keyof typeof PenAlignment;
};
type OutlineNoFill = {
    readonly type: "noFill";
};
type OutlineRgbSolidFill = {
    readonly type: "solidFill";
    readonly solidFillType: "rgb";
    readonly value: string;
};
type OutlineSchemeSolidFill = {
    readonly type: "solidFill";
    readonly solidFillType: "scheme";
    readonly value: (typeof SchemeColor)[keyof typeof SchemeColor];
};
type OutlineSolidFill = OutlineRgbSolidFill | OutlineSchemeSolidFill;
type OutlineFillProperties = OutlineNoFill | OutlineSolidFill;
export type OutlineOptions = OutlineAttributes & OutlineFillProperties;
export declare const createOutline: (options: OutlineOptions) => XmlComponent;
export {};
