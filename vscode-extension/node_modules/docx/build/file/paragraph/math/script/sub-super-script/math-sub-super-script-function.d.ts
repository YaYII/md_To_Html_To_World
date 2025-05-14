import { XmlComponent } from '../../../../xml-components';
import { MathComponent } from "../../math-component";
export interface IMathSubSuperScriptOptions {
    readonly children: readonly MathComponent[];
    readonly subScript: readonly MathComponent[];
    readonly superScript: readonly MathComponent[];
}
export declare class MathSubSuperScript extends XmlComponent {
    constructor(options: IMathSubSuperScriptOptions);
}
