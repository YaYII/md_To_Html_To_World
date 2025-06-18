import { ElementWrapper } from "./traverser";
export interface IRenderedParagraphNode {
    readonly text: string;
    readonly runs: readonly IRenderedRunNode[];
    readonly index: number;
    readonly path: readonly number[];
}
interface StartAndEnd {
    readonly start: number;
    readonly end: number;
}
type IParts = {
    readonly text: string;
    readonly index: number;
} & StartAndEnd;
export type IRenderedRunNode = {
    readonly text: string;
    readonly parts: readonly IParts[];
    readonly index: number;
} & StartAndEnd;
export declare const renderParagraphNode: (node: ElementWrapper) => IRenderedParagraphNode;
export {};
