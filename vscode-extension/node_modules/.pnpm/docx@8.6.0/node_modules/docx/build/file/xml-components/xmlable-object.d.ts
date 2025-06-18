export interface IXmlAttribute {
    readonly [key: string]: string | number | boolean;
}
export interface IXmlableObject extends Record<string, unknown> {
    readonly [key: string]: any;
}
export declare const WORKAROUND3 = "";
