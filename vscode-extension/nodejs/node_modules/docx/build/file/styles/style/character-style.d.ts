import { IRunStylePropertiesOptions } from '../../paragraph/run/properties';
import { IStyleOptions, Style } from "./style";
export interface IBaseCharacterStyleOptions extends IStyleOptions {
    readonly run?: IRunStylePropertiesOptions;
}
export interface ICharacterStyleOptions extends IBaseCharacterStyleOptions {
    readonly id: string;
}
export declare class StyleForCharacter extends Style {
    private readonly runProperties;
    constructor(options: ICharacterStyleOptions);
}
