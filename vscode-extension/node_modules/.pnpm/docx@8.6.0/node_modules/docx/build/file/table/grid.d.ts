import { XmlComponent } from '../xml-components';
import { PositiveUniversalMeasure } from '../../util/values';
export declare class TableGrid extends XmlComponent {
    constructor(widths: readonly number[] | readonly PositiveUniversalMeasure[]);
}
export declare class GridCol extends XmlComponent {
    constructor(width?: number | PositiveUniversalMeasure);
}
