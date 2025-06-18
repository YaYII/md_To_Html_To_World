import { XmlComponent } from '../xml-components';
import { CharacterSet } from "./font";
export declare const createRegularFont: ({ name, index, fontKey, characterSet, }: {
    readonly name: string;
    readonly index: number;
    readonly fontKey: string;
    readonly characterSet?: "00" | "01" | "02" | "4D" | "80" | "81" | "82" | "86" | "88" | "A1" | "A2" | "A3" | "B1" | "B2" | "BA" | "CC" | "DE" | "EE" | "FF" | undefined;
}) => XmlComponent;
