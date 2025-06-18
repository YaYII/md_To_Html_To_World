import { IContext, IXmlableObject, XmlComponent } from '../xml-components';
import { ILevelsOptions } from "./level";
import { ConcreteNumbering } from "./num";
export interface INumberingOptions {
    readonly config: readonly {
        readonly levels: readonly ILevelsOptions[];
        readonly reference: string;
    }[];
}
export declare class Numbering extends XmlComponent {
    private readonly abstractNumberingMap;
    private readonly concreteNumberingMap;
    private readonly referenceConfigMap;
    private readonly abstractNumUniqueNumericId;
    private readonly concreteNumUniqueNumericId;
    constructor(options: INumberingOptions);
    prepForXml(context: IContext): IXmlableObject | undefined;
    createConcreteNumberingInstance(reference: string, instance: number): void;
    get ConcreteNumbering(): readonly ConcreteNumbering[];
    get ReferenceConfig(): readonly Record<string, any>[];
}
