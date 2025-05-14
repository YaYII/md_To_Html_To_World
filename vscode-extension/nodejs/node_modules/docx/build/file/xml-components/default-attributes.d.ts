import { BaseXmlComponent, IContext } from "./base";
import { IXmlableObject } from "./xmlable-object";
export type AttributeMap<T> = {
    readonly [P in keyof T]: string;
};
export type AttributeData = {
    readonly [key: string]: boolean | number | string;
};
export type AttributePayload<T> = {
    readonly [P in keyof T]: {
        readonly key: string;
        readonly value: T[P];
    };
};
export declare abstract class XmlAttributeComponent<T extends object> extends BaseXmlComponent {
    private readonly root;
    protected readonly xmlKeys?: AttributeMap<T>;
    constructor(root: T);
    prepForXml(_: IContext): IXmlableObject;
}
export declare class NextAttributeComponent<T extends AttributeData> extends BaseXmlComponent {
    private readonly root;
    constructor(root: AttributePayload<T>);
    prepForXml(_: IContext): IXmlableObject;
}
