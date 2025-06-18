import { IBorderOptions } from '../../../../border';
import { IgnoreIfEmptyXmlComponent } from '../../../../xml-components';
export declare const PageBorderDisplay: {
    readonly ALL_PAGES: "allPages";
    readonly FIRST_PAGE: "firstPage";
    readonly NOT_FIRST_PAGE: "notFirstPage";
};
export declare const PageBorderOffsetFrom: {
    readonly PAGE: "page";
    readonly TEXT: "text";
};
export declare const PageBorderZOrder: {
    readonly BACK: "back";
    readonly FRONT: "front";
};
export interface IPageBorderAttributes {
    readonly display?: (typeof PageBorderDisplay)[keyof typeof PageBorderDisplay];
    readonly offsetFrom?: (typeof PageBorderOffsetFrom)[keyof typeof PageBorderOffsetFrom];
    readonly zOrder?: (typeof PageBorderZOrder)[keyof typeof PageBorderZOrder];
}
export interface IPageBordersOptions {
    readonly pageBorders?: IPageBorderAttributes;
    readonly pageBorderTop?: IBorderOptions;
    readonly pageBorderRight?: IBorderOptions;
    readonly pageBorderBottom?: IBorderOptions;
    readonly pageBorderLeft?: IBorderOptions;
}
export declare class PageBorders extends IgnoreIfEmptyXmlComponent {
    constructor(options?: IPageBordersOptions);
}
