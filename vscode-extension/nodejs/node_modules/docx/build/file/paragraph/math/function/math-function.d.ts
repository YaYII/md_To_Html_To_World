import { XmlComponent } from '../../../xml-components';
import { MathComponent } from "../math-component";
export interface IMathFunctionOptions {
    readonly children: readonly MathComponent[];
    readonly name: readonly MathComponent[];
}
export declare class MathFunction extends XmlComponent {
    constructor(options: IMathFunctionOptions);
}
