import { XmlComponent } from '../xml-components';
import { ICheckboxSymbolOptions } from "./checkbox-util";
export declare class CheckBox extends XmlComponent {
    private readonly DEFAULT_UNCHECKED_SYMBOL;
    private readonly DEFAULT_CHECKED_SYMBOL;
    private readonly DEFAULT_FONT;
    constructor(options?: ICheckboxSymbolOptions);
}
