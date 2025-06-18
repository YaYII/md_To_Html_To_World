import { XmlComponent } from '../xml-components';
export interface IShadingAttributesProperties {
    readonly fill?: string;
    readonly color?: string;
    readonly type?: (typeof ShadingType)[keyof typeof ShadingType];
}
export declare class Shading extends XmlComponent {
    constructor({ fill, color, type }: IShadingAttributesProperties);
}
export declare const ShadingType: {
    readonly CLEAR: "clear";
    readonly DIAGONAL_CROSS: "diagCross";
    readonly DIAGONAL_STRIPE: "diagStripe";
    readonly HORIZONTAL_CROSS: "horzCross";
    readonly HORIZONTAL_STRIPE: "horzStripe";
    readonly NIL: "nil";
    readonly PERCENT_5: "pct5";
    readonly PERCENT_10: "pct10";
    readonly PERCENT_12: "pct12";
    readonly PERCENT_15: "pct15";
    readonly PERCENT_20: "pct20";
    readonly PERCENT_25: "pct25";
    readonly PERCENT_30: "pct30";
    readonly PERCENT_35: "pct35";
    readonly PERCENT_37: "pct37";
    readonly PERCENT_40: "pct40";
    readonly PERCENT_45: "pct45";
    readonly PERCENT_50: "pct50";
    readonly PERCENT_55: "pct55";
    readonly PERCENT_60: "pct60";
    readonly PERCENT_62: "pct62";
    readonly PERCENT_65: "pct65";
    readonly PERCENT_70: "pct70";
    readonly PERCENT_75: "pct75";
    readonly PERCENT_80: "pct80";
    readonly PERCENT_85: "pct85";
    readonly PERCENT_87: "pct87";
    readonly PERCENT_90: "pct90";
    readonly PERCENT_95: "pct95";
    readonly REVERSE_DIAGONAL_STRIPE: "reverseDiagStripe";
    readonly SOLID: "solid";
    readonly THIN_DIAGONAL_CROSS: "thinDiagCross";
    readonly THIN_DIAGONAL_STRIPE: "thinDiagStripe";
    readonly THIN_HORIZONTAL_CROSS: "thinHorzCross";
    readonly THIN_REVERSE_DIAGONAL_STRIPE: "thinReverseDiagStripe";
    readonly THIN_VERTICAL_STRIPE: "thinVertStripe";
    readonly VERTICAL_STRIPE: "vertStripe";
};
