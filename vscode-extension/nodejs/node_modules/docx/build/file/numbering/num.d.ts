import { XmlComponent } from '../xml-components';
interface IOverrideLevel {
    readonly num: number;
    readonly start?: number;
}
export interface IConcreteNumberingOptions {
    readonly numId: number;
    readonly abstractNumId: number;
    readonly reference: string;
    readonly instance: number;
    readonly overrideLevels?: readonly IOverrideLevel[];
}
export declare class ConcreteNumbering extends XmlComponent {
    readonly numId: number;
    readonly reference: string;
    readonly instance: number;
    constructor(options: IConcreteNumberingOptions);
}
export declare class LevelOverride extends XmlComponent {
    constructor(levelNum: number, start?: number);
}
export {};
