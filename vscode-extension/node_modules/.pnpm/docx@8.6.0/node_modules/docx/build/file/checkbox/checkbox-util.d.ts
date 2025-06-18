import { XmlComponent } from '../xml-components';
export interface ICheckboxSymbolProperties {
    readonly value?: string;
    readonly font?: string;
}
export interface ICheckboxSymbolOptions {
    readonly alias?: string;
    readonly checked?: boolean;
    readonly checkedState?: ICheckboxSymbolProperties;
    readonly uncheckedState?: ICheckboxSymbolProperties;
}
export declare class CheckBoxUtil extends XmlComponent {
    private readonly DEFAULT_UNCHECKED_SYMBOL;
    private readonly DEFAULT_CHECKED_SYMBOL;
    private readonly DEFAULT_FONT;
    constructor(options?: ICheckboxSymbolOptions);
}
