import { XmlComponent } from '../../../../xml-components';
import { MathComponent } from "../../math-component";
export interface IMathPreSubSuperScriptOptions {
    readonly children: readonly MathComponent[];
    readonly subScript: readonly MathComponent[];
    readonly superScript: readonly MathComponent[];
}
export declare class MathPreSubSuperScript extends XmlComponent {
    constructor(options: IMathPreSubSuperScriptOptions);
}
