import { IParagraphStylePropertiesOptions } from '../../paragraph/properties';
import { IRunStylePropertiesOptions } from '../../paragraph/run/properties';
import { XmlComponent } from '../../xml-components';
export interface IDocumentDefaultsOptions {
    readonly paragraph?: IParagraphStylePropertiesOptions;
    readonly run?: IRunStylePropertiesOptions;
}
export declare class DocumentDefaults extends XmlComponent {
    private readonly runPropertiesDefaults;
    private readonly paragraphPropertiesDefaults;
    constructor(options: IDocumentDefaultsOptions);
}
