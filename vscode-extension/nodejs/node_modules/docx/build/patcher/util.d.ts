import { Element } from "xml-js";
export declare const toJson: (xmlData: string) => Element;
export declare const createTextElementContents: (text: string) => Element[];
export declare const patchSpaceAttribute: (element: Element) => Element;
export declare const getFirstLevelElements: (relationships: Element, id: string) => Element[];
