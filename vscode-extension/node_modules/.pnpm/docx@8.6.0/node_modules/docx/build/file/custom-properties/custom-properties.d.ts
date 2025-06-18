import { IContext, IXmlableObject, XmlComponent } from '../xml-components';
import { ICustomPropertyOptions } from "./custom-property";
export declare class CustomProperties extends XmlComponent {
    private nextId;
    private readonly properties;
    constructor(properties: readonly ICustomPropertyOptions[]);
    prepForXml(context: IContext): IXmlableObject | undefined;
    addCustomProperty(property: ICustomPropertyOptions): void;
}
