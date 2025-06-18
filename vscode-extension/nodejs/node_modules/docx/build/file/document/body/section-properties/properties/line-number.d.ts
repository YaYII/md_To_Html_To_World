import { XmlComponent } from '../../../../xml-components';
import { PositiveUniversalMeasure } from '../../../../../util/values';
export declare const LineNumberRestartFormat: {
    readonly NEW_PAGE: "newPage";
    readonly NEW_SECTION: "newSection";
    readonly CONTINUOUS: "continuous";
};
export type ILineNumberAttributes = {
    readonly countBy?: number;
    readonly start?: number;
    readonly restart?: (typeof LineNumberRestartFormat)[keyof typeof LineNumberRestartFormat];
    readonly distance?: number | PositiveUniversalMeasure;
};
export declare const createLineNumberType: ({ countBy, start, restart, distance }: ILineNumberAttributes) => XmlComponent;
