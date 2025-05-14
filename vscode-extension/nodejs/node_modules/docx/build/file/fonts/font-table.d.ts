/// <reference types="node" />
import { XmlComponent } from '../xml-components';
import { FontOptionsWithKey } from "./font-wrapper";
import { CharacterSet } from "./font";
export type FontOptions = {
    readonly name: string;
    readonly data: Buffer;
    readonly characterSet?: (typeof CharacterSet)[keyof typeof CharacterSet];
};
export declare const createFontTable: (fonts: readonly FontOptionsWithKey[]) => XmlComponent;
