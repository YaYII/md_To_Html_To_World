/// <reference types="node" />
/// <reference types="node" />
import { ParagraphChild } from '../file/paragraph';
import { FileChild } from '../file/file-child';
type InputDataType = Buffer | string | number[] | Uint8Array | ArrayBuffer | Blob | NodeJS.ReadableStream;
export declare const PatchType: {
    readonly DOCUMENT: "file";
    readonly PARAGRAPH: "paragraph";
};
type ParagraphPatch = {
    readonly type: typeof PatchType.PARAGRAPH;
    readonly children: readonly ParagraphChild[];
};
type FilePatch = {
    readonly type: typeof PatchType.DOCUMENT;
    readonly children: readonly FileChild[];
};
export type IPatch = ParagraphPatch | FilePatch;
export interface PatchDocumentOptions {
    readonly patches: {
        readonly [key: string]: IPatch;
    };
    readonly keepOriginalStyles?: boolean;
}
export declare const patchDocument: (data: InputDataType, options: PatchDocumentOptions) => Promise<Uint8Array>;
export {};
