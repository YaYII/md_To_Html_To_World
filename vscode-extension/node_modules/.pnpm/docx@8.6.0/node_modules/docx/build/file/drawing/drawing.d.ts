import { IMediaData } from '../media';
import { XmlComponent } from '../xml-components';
import { DocPropertiesOptions } from "./doc-properties/doc-properties";
import { IFloating } from "./floating";
import { OutlineOptions } from "./inline/graphic/graphic-data/pic/shape-properties/outline/outline";
export type IDistance = {
    readonly distT?: number;
    readonly distB?: number;
    readonly distL?: number;
    readonly distR?: number;
};
export interface IDrawingOptions {
    readonly floating?: IFloating;
    readonly docProperties?: DocPropertiesOptions;
    readonly outline?: OutlineOptions;
}
export declare class Drawing extends XmlComponent {
    constructor(imageData: IMediaData, drawingOptions?: IDrawingOptions);
}
