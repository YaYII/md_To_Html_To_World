import { XmlComponent } from '../../../../xml-components';
import { PositiveUniversalMeasure } from '../../../../../util/values';
export declare const PageOrientation: {
    readonly PORTRAIT: "portrait";
    readonly LANDSCAPE: "landscape";
};
export type IPageSizeAttributes = {
    readonly width?: number | PositiveUniversalMeasure;
    readonly height?: number | PositiveUniversalMeasure;
    readonly orientation?: (typeof PageOrientation)[keyof typeof PageOrientation];
};
export declare class PageSize extends XmlComponent {
    constructor(width: number | PositiveUniversalMeasure, height: number | PositiveUniversalMeasure, orientation: (typeof PageOrientation)[keyof typeof PageOrientation]);
}
