import { XmlComponent } from '../../../../xml-components';
import { MathComponent } from "../../math-component";
export interface IMathSubScriptOptions {
    readonly children: readonly MathComponent[];
    readonly subScript: readonly MathComponent[];
}
export declare class MathSubScript extends XmlComponent {
    constructor(options: IMathSubScriptOptions);
}
