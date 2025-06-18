/// <reference types="node" />
/// <reference types="node" />
import { ParagraphChild } from '../file/paragraph';
import { FileChild } from '../file/file-child';
export type InputDataType = Buffer | string | number[] | Uint8Array | ArrayBuffer | Blob | NodeJS.ReadableStream;
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
type OutputByType = {
    readonly base64: string;
    readonly string: string;
    readonly text: string;
    readonly binarystring: string;
    readonly array: readonly number[];
    readonly uint8array: Uint8Array;
    readonly arraybuffer: ArrayBuffer;
    readonly blob: Blob;
    readonly nodebuffer: Buffer;
};
export type PatchDocumentOutputType = keyof OutputByType;
export type PatchDocumentOptions<T extends PatchDocumentOutputType = PatchDocumentOutputType> = {
    readonly outputType: T;
    readonly data: InputDataType;
    readonly patches: {
        readonly [key: string]: IPatch;
    };
    readonly keepOriginalStyles?: boolean;
};
export declare const patchDocument: <T extends keyof OutputByType = keyof OutputByType>({ outputType, data, patches, keepOriginalStyles, }: PatchDocumentOptions<T>) => Promise<OutputByType[T]>;
export {};
