import { IMediaData, IMediaDataTransformation } from '../../../../media';
import { XmlComponent } from '../../../../xml-components';
import { OutlineOptions } from "./pic/shape-properties/outline/outline";
export declare class GraphicData extends XmlComponent {
    private readonly pic;
    constructor({ mediaData, transform, outline, }: {
        readonly mediaData: IMediaData;
        readonly transform: IMediaDataTransformation;
        readonly outline?: OutlineOptions;
    });
}
