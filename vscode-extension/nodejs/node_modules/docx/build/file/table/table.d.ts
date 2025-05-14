import { FileChild } from '../file-child';
import { AlignmentType } from "../paragraph";
import { ITableBordersOptions, ITableFloatOptions } from "./table-properties";
import { ITableCellMarginOptions } from "./table-properties/table-cell-margin";
import { TableLayoutType } from "./table-properties/table-layout";
import { TableRow } from "./table-row";
import { ITableWidthProperties } from "./table-width";
export interface ITableOptions {
    readonly rows: readonly TableRow[];
    readonly width?: ITableWidthProperties;
    readonly columnWidths?: readonly number[];
    readonly margins?: ITableCellMarginOptions;
    readonly indent?: ITableWidthProperties;
    readonly float?: ITableFloatOptions;
    readonly layout?: (typeof TableLayoutType)[keyof typeof TableLayoutType];
    readonly style?: string;
    readonly borders?: ITableBordersOptions;
    readonly alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    readonly visuallyRightToLeft?: boolean;
}
export declare class Table extends FileChild {
    constructor({ rows, width, columnWidths, margins, indent, float, layout, style, borders, alignment, visuallyRightToLeft, }: ITableOptions);
}
