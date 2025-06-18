import { Element } from "xml-js";
import { IRenderedParagraphNode } from "./run-renderer";
export interface ElementWrapper {
    readonly element: Element;
    readonly index: number;
    readonly parent: ElementWrapper | undefined;
}
export declare const traverse: (node: Element) => readonly IRenderedParagraphNode[];
export declare const findLocationOfText: (node: Element, text: string) => readonly IRenderedParagraphNode[];
