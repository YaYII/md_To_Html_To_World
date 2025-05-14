import { XmlComponent } from '../../../../xml-components';
import { PositiveUniversalMeasure, UniversalMeasure } from '../../../../../util/values';
export type IPageMarginAttributes = {
    readonly top?: number | UniversalMeasure;
    readonly right?: number | PositiveUniversalMeasure;
    readonly bottom?: number | UniversalMeasure;
    readonly left?: number | PositiveUniversalMeasure;
    readonly header?: number | PositiveUniversalMeasure;
    readonly footer?: number | PositiveUniversalMeasure;
    readonly gutter?: number | PositiveUniversalMeasure;
};
export declare class PageMargin extends XmlComponent {
    constructor(top: number | UniversalMeasure, right: number | PositiveUniversalMeasure, bottom: number | UniversalMeasure, left: number | PositiveUniversalMeasure, header: number | PositiveUniversalMeasure, footer: number | PositiveUniversalMeasure, gutter: number | PositiveUniversalMeasure);
}
