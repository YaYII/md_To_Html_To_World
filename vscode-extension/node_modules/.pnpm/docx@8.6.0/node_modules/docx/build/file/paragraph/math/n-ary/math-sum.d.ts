import { XmlComponent } from '../../../xml-components';
import { MathComponent } from "../math-component";
export interface IMathSumOptions {
    readonly children: readonly MathComponent[];
    readonly subScript?: readonly MathComponent[];
    readonly superScript?: readonly MathComponent[];
}
export declare class MathSum extends XmlComponent {
    constructor(options: IMathSumOptions);
}
