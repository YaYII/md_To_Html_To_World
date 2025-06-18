import { IMediaData, IMediaDataTransformation } from '../../../media';
import { XmlComponent } from '../../../xml-components';
import { OutlineOptions } from "./graphic-data/pic/shape-properties/outline/outline";
export declare class Graphic extends XmlComponent {
    private readonly data;
    constructor({ mediaData, transform, outline, }: {
        readonly mediaData: IMediaData;
        readonly transform: IMediaDataTransformation;
        readonly outline?: OutlineOptions;
    });
}
