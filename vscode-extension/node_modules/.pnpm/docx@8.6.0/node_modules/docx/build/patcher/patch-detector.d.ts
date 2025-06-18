import { InputDataType } from "./from-docx";
type PatchDetectorOptions = {
    readonly data: InputDataType;
};
export declare const patchDetector: ({ data }: PatchDetectorOptions) => Promise<readonly string[]>;
export {};
