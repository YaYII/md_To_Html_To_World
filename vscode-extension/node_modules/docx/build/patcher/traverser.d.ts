import { Element } from "xml-js";
import { IRenderedParagraphNode } from "./run-renderer";
export interface ElementWrapper {
    readonly element: Element;
    readonly index: number;
    readonly parent: ElementWrapper | undefined;
}
export declare const findLocationOfText: (node: Element, text: string) => readonly IRenderedParagraphNode[];
