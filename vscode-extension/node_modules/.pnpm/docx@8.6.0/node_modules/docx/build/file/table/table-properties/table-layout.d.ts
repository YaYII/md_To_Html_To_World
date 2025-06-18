import { XmlComponent } from '../../xml-components';
export declare const TableLayoutType: {
    readonly AUTOFIT: "autofit";
    readonly FIXED: "fixed";
};
export declare class TableLayout extends XmlComponent {
    constructor(type: (typeof TableLayoutType)[keyof typeof TableLayoutType]);
}
