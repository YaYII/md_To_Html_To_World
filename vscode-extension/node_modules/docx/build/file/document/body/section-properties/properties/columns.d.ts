import { XmlComponent } from '../../../../xml-components';
import { PositiveUniversalMeasure } from '../../../../../util/values';
import { Column } from "./column";
export type IColumnsAttributes = {
    readonly space?: number | PositiveUniversalMeasure;
    readonly count?: number;
    readonly separate?: boolean;
    readonly equalWidth?: boolean;
    readonly children?: readonly Column[];
};
export declare class Columns extends XmlComponent {
    constructor({ space, count, separate, equalWidth, children }: IColumnsAttributes);
}
