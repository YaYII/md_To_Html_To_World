import { XmlComponent } from '../../../../xml-components';
export declare const HeaderFooterReferenceType: {
    readonly DEFAULT: "default";
    readonly FIRST: "first";
    readonly EVEN: "even";
};
export interface IHeaderFooterOptions {
    readonly type?: (typeof HeaderFooterReferenceType)[keyof typeof HeaderFooterReferenceType];
    readonly id?: number;
}
export declare const HeaderFooterType: {
    readonly HEADER: "w:headerReference";
    readonly FOOTER: "w:footerReference";
};
export declare class HeaderFooterReference extends XmlComponent {
    constructor(type: (typeof HeaderFooterType)[keyof typeof HeaderFooterType], options: IHeaderFooterOptions);
}
