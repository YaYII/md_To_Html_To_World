/// <reference types="node" />
export interface IMediaDataTransformation {
    readonly pixels: {
        readonly x: number;
        readonly y: number;
    };
    readonly emus: {
        readonly x: number;
        readonly y: number;
    };
    readonly flip?: {
        readonly vertical?: boolean;
        readonly horizontal?: boolean;
    };
    readonly rotation?: number;
}
type CoreMediaData = {
    readonly fileName: string;
    readonly transformation: IMediaDataTransformation;
    readonly data: Buffer | Uint8Array | ArrayBuffer;
};
type RegularMediaData = {
    readonly type: "jpg" | "png" | "gif" | "bmp";
};
type SvgMediaData = {
    readonly type: "svg";
    readonly fallback: RegularMediaData & CoreMediaData;
};
export type IMediaData = (RegularMediaData | SvgMediaData) & CoreMediaData;
export declare const WORKAROUND2 = "";
export {};
