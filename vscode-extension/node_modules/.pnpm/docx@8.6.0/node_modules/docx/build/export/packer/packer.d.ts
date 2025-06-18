/// <reference types="node" />
/// <reference types="node" />
import { Stream } from "stream";
import { File } from '../../file/file';
export declare const PrettifyType: {
    readonly NONE: "";
    readonly WITH_2_BLANKS: "  ";
    readonly WITH_4_BLANKS: "    ";
    readonly WITH_TAB: "\t";
};
export declare class Packer {
    static toString(file: File, prettify?: boolean | (typeof PrettifyType)[keyof typeof PrettifyType]): Promise<string>;
    static toBuffer(file: File, prettify?: boolean | (typeof PrettifyType)[keyof typeof PrettifyType]): Promise<Buffer>;
    static toBase64String(file: File, prettify?: boolean | (typeof PrettifyType)[keyof typeof PrettifyType]): Promise<string>;
    static toBlob(file: File, prettify?: boolean | (typeof PrettifyType)[keyof typeof PrettifyType]): Promise<Blob>;
    static toStream(file: File, prettify?: boolean | (typeof PrettifyType)[keyof typeof PrettifyType]): Stream;
    private static readonly compiler;
}
