import { FooterWrapper } from '../../../footer-wrapper';
import { HeaderWrapper } from '../../../header-wrapper';
import { VerticalAlign } from '../../../vertical-align';
import { XmlComponent } from '../../../xml-components';
import { IColumnsAttributes } from "./properties/columns";
import { IDocGridAttributesProperties } from "./properties/doc-grid";
import { ILineNumberAttributes } from "./properties/line-number";
import { IPageBordersOptions } from "./properties/page-borders";
import { IPageMarginAttributes } from "./properties/page-margin";
import { IPageNumberTypeAttributes } from "./properties/page-number";
import { IPageSizeAttributes } from "./properties/page-size";
import { PageTextDirectionType } from "./properties/page-text-direction";
import { SectionType } from "./properties/section-type";
export interface IHeaderFooterGroup<T> {
    readonly default?: T;
    readonly first?: T;
    readonly even?: T;
}
export interface ISectionPropertiesOptions {
    readonly page?: {
        readonly size?: IPageSizeAttributes;
        readonly margin?: IPageMarginAttributes;
        readonly pageNumbers?: IPageNumberTypeAttributes;
        readonly borders?: IPageBordersOptions;
        readonly textDirection?: (typeof PageTextDirectionType)[keyof typeof PageTextDirectionType];
    };
    readonly grid?: IDocGridAttributesProperties;
    readonly headerWrapperGroup?: IHeaderFooterGroup<HeaderWrapper>;
    readonly footerWrapperGroup?: IHeaderFooterGroup<FooterWrapper>;
    readonly lineNumbers?: ILineNumberAttributes;
    readonly titlePage?: boolean;
    readonly verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    readonly column?: IColumnsAttributes;
    readonly type?: (typeof SectionType)[keyof typeof SectionType];
}
export declare const sectionMarginDefaults: {
    TOP: number;
    RIGHT: number;
    BOTTOM: number;
    LEFT: number;
    HEADER: number;
    FOOTER: number;
    GUTTER: number;
};
export declare const sectionPageSizeDefaults: {
    WIDTH: number;
    HEIGHT: number;
    ORIENTATION: "portrait";
};
export declare class SectionProperties extends XmlComponent {
    constructor({ page: { size: { width, height, orientation, }, margin: { top, right, bottom, left, header, footer, gutter, }, pageNumbers, borders, textDirection, }, grid: { linePitch, charSpace, type: gridType }, headerWrapperGroup, footerWrapperGroup, lineNumbers, titlePage, verticalAlign, column, type, }?: ISectionPropertiesOptions);
    private addHeaderFooterGroup;
}
