import { VerticalAlign } from '../../vertical-align';
import { IgnoreIfEmptyXmlComponent } from '../../xml-components';
import { IShadingAttributesProperties } from "../../shading";
import { ITableCellMarginOptions } from "../table-properties/table-cell-margin";
import { ITableWidthProperties } from "../table-width";
import { ITableCellBorders, TextDirection, VerticalMergeType } from "./table-cell-components";
export interface ITableCellPropertiesOptions {
    readonly shading?: IShadingAttributesProperties;
    readonly margins?: ITableCellMarginOptions;
    readonly verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    readonly textDirection?: (typeof TextDirection)[keyof typeof TextDirection];
    readonly verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    readonly width?: ITableWidthProperties;
    readonly columnSpan?: number;
    readonly rowSpan?: number;
    readonly borders?: ITableCellBorders;
}
export declare class TableCellProperties extends IgnoreIfEmptyXmlComponent {
    constructor(options: ITableCellPropertiesOptions);
}
