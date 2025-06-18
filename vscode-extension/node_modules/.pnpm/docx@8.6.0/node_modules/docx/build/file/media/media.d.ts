import { IMediaData } from "./data";
export interface IMediaTransformation {
    readonly width: number;
    readonly height: number;
    readonly flip?: {
        readonly vertical?: boolean;
        readonly horizontal?: boolean;
    };
    readonly rotation?: number;
}
export declare class Media {
    private readonly map;
    constructor();
    addImage(key: string, mediaData: IMediaData): void;
    get Array(): readonly IMediaData[];
}
