import { XmlComponent } from '../xml-components';
import { Percentage, UniversalMeasure } from '../../util/values';
export declare const WidthType: {
    readonly AUTO: "auto";
    readonly DXA: "dxa";
    readonly NIL: "nil";
    readonly PERCENTAGE: "pct";
};
export type ITableWidthProperties = {
    readonly size: number | Percentage | UniversalMeasure;
    readonly type?: (typeof WidthType)[keyof typeof WidthType];
};
export declare class TableWidthElement extends XmlComponent {
    constructor(name: string, { type, size }: ITableWidthProperties);
}
