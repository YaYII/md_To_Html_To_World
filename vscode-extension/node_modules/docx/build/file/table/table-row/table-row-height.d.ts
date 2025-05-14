import { XmlAttributeComponent, XmlComponent } from '../../xml-components';
import { PositiveUniversalMeasure } from '../../../util/values';
export declare const HeightRule: {
    readonly AUTO: "auto";
    readonly ATLEAST: "atLeast";
    readonly EXACT: "exact";
};
export declare class TableRowHeightAttributes extends XmlAttributeComponent<{
    readonly value: number | string;
    readonly rule: (typeof HeightRule)[keyof typeof HeightRule];
}> {
    protected readonly xmlKeys: {
        value: string;
        rule: string;
    };
}
export declare class TableRowHeight extends XmlComponent {
    constructor(value: number | PositiveUniversalMeasure, rule: (typeof HeightRule)[keyof typeof HeightRule]);
}
