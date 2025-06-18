import { XmlComponent } from '../../../../../../../xml-components';
import { SchemeColor } from "./scheme-color";
export type RgbColorOptions = {
    readonly type: "rgb";
    readonly value: string;
};
export type SchemeColorOptions = {
    readonly type: "scheme";
    readonly value: (typeof SchemeColor)[keyof typeof SchemeColor];
};
export type SolidFillOptions = RgbColorOptions | SchemeColorOptions;
export declare const createSolidFill: (options: SolidFillOptions) => XmlComponent;
