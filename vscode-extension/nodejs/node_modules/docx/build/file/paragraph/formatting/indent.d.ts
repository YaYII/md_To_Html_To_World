import { XmlComponent } from '../../xml-components';
import { PositiveUniversalMeasure, UniversalMeasure } from '../../../util/values';
export interface IIndentAttributesProperties {
    readonly start?: number | UniversalMeasure;
    readonly end?: number | UniversalMeasure;
    readonly left?: number | UniversalMeasure;
    readonly right?: number | UniversalMeasure;
    readonly hanging?: number | PositiveUniversalMeasure;
    readonly firstLine?: number | PositiveUniversalMeasure;
}
export declare class Indent extends XmlComponent {
    constructor({ start, end, left, right, hanging, firstLine }: IIndentAttributesProperties);
}
