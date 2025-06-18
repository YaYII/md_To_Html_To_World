import { IDefaultStylesOptions } from './factory';
import { BaseXmlComponent, ImportedXmlComponent, XmlComponent } from '../xml-components';
import { StyleForCharacter, StyleForParagraph } from "./style";
import { ICharacterStyleOptions } from "./style/character-style";
import { IParagraphStyleOptions } from "./style/paragraph-style";
export interface IStylesOptions {
    readonly default?: IDefaultStylesOptions;
    readonly initialStyles?: BaseXmlComponent;
    readonly paragraphStyles?: readonly IParagraphStyleOptions[];
    readonly characterStyles?: readonly ICharacterStyleOptions[];
    readonly importedStyles?: readonly (XmlComponent | StyleForParagraph | StyleForCharacter | ImportedXmlComponent)[];
}
export declare class Styles extends XmlComponent {
    constructor(options: IStylesOptions);
}
