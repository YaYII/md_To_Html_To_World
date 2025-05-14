import { Element } from "xml-js";
import { IContext } from '../file/xml-components';
import { IPatch } from "./from-docx";
import { IRenderedParagraphNode } from "./run-renderer";
export declare const replacer: (json: Element, patch: IPatch, patchText: string, renderedParagraphs: readonly IRenderedParagraphNode[], context: IContext, keepOriginalStyles?: boolean) => Element;
