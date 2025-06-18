import { XmlComponent } from '../../../../xml-components';
import { MathComponent } from "../../math-component";
export interface IMathSuperScriptOptions {
    readonly children: readonly MathComponent[];
    readonly superScript: readonly MathComponent[];
}
export declare class MathSuperScript extends XmlComponent {
    constructor(options: IMathSuperScriptOptions);
}
