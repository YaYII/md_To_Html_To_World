import { Element } from "xml-js";
import { IRenderedParagraphNode } from "./run-renderer";
export declare const replaceTokenInParagraphElement: ({ paragraphElement, renderedParagraph, originalText, replacementText, }: {
    readonly paragraphElement: Element;
    readonly renderedParagraph: IRenderedParagraphNode;
    readonly originalText: string;
    readonly replacementText: string;
}) => Element;
