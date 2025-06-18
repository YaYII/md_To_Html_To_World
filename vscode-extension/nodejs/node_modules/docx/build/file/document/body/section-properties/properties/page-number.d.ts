import { NumberFormat } from '../../../../shared/number-format';
import { XmlAttributeComponent, XmlComponent } from '../../../../xml-components';
export declare const PageNumberSeparator: {
    readonly HYPHEN: "hyphen";
    readonly PERIOD: "period";
    readonly COLON: "colon";
    readonly EM_DASH: "emDash";
    readonly EN_DASH: "endash";
};
export interface IPageNumberTypeAttributes {
    readonly start?: number;
    readonly formatType?: (typeof NumberFormat)[keyof typeof NumberFormat];
    readonly separator?: (typeof PageNumberSeparator)[keyof typeof PageNumberSeparator];
}
export declare class PageNumberTypeAttributes extends XmlAttributeComponent<IPageNumberTypeAttributes> {
    protected readonly xmlKeys: {
        start: string;
        formatType: string;
        separator: string;
    };
}
export declare class PageNumberType extends XmlComponent {
    constructor({ start, formatType, separator }: IPageNumberTypeAttributes);
}
