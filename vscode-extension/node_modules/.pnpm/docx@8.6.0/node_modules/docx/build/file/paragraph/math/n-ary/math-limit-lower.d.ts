import { XmlComponent } from '../../../xml-components';
import { MathComponent } from "../math-component";
export interface IMathLimitLowerOptions {
    readonly children: readonly MathComponent[];
    readonly limit: readonly MathComponent[];
}
export declare class MathLimitLower extends XmlComponent {
    constructor(options: IMathLimitLowerOptions);
}
