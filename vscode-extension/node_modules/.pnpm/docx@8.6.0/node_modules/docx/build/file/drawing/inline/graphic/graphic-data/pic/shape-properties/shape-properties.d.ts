import { IMediaDataTransformation } from '../../../../../../media';
import { XmlComponent } from '../../../../../../xml-components';
import { OutlineOptions } from "./outline/outline";
export declare class ShapeProperties extends XmlComponent {
    private readonly form;
    constructor({ outline, transform }: {
        readonly outline?: OutlineOptions;
        readonly transform: IMediaDataTransformation;
    });
}
