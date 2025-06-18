import { XmlComponent } from '../../../xml-components';
import { MathComponent } from "../math-component";
export interface IMathIntegralOptions {
    readonly children: readonly MathComponent[];
    readonly subScript?: readonly MathComponent[];
    readonly superScript?: readonly MathComponent[];
}
export declare class MathIntegral extends XmlComponent {
    constructor(options: IMathIntegralOptions);
}
