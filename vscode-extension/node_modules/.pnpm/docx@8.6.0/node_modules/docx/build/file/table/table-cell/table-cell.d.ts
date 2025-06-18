import { Paragraph } from '../../paragraph';
import { IContext, IXmlableObject, XmlComponent } from '../../xml-components';
import { Table } from "../table";
import { ITableCellPropertiesOptions } from "./table-cell-properties";
export interface ITableCellOptions extends ITableCellPropertiesOptions {
    readonly children: readonly (Paragraph | Table)[];
}
export declare class TableCell extends XmlComponent {
    readonly options: ITableCellOptions;
    constructor(options: ITableCellOptions);
    prepForXml(context: IContext): IXmlableObject | undefined;
}
