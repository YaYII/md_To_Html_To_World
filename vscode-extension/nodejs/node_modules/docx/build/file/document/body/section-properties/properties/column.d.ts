import { XmlComponent } from '../../../../xml-components';
import { PositiveUniversalMeasure } from '../../../../../util/values';
type IColumnAttributes = {
    readonly width: number | PositiveUniversalMeasure;
    readonly space?: number | PositiveUniversalMeasure;
};
export declare class Column extends XmlComponent {
    constructor({ width, space }: IColumnAttributes);
}
export {};
