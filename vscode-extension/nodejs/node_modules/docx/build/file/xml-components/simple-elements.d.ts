import { AttributeData, AttributePayload, XmlComponent } from '.';
import { PositiveUniversalMeasure } from '../../util/values';
export declare class OnOffElement extends XmlComponent {
    constructor(name: string, val?: boolean | undefined);
}
export declare class HpsMeasureElement extends XmlComponent {
    constructor(name: string, val: number | PositiveUniversalMeasure);
}
export declare class EmptyElement extends XmlComponent {
}
export declare class StringValueElement extends XmlComponent {
    constructor(name: string, val: string);
}
export declare const createStringElement: (name: string, value: string) => XmlComponent;
export declare class NumberValueElement extends XmlComponent {
    constructor(name: string, val: number);
}
export declare class StringEnumValueElement<T extends string> extends XmlComponent {
    constructor(name: string, val: T);
}
export declare class StringContainer extends XmlComponent {
    constructor(name: string, val: string);
}
export declare class BuilderElement<T extends AttributeData> extends XmlComponent {
    constructor({ name, attributes, children, }: {
        readonly name: string;
        readonly attributes?: AttributePayload<T>;
        readonly children?: readonly XmlComponent[];
    });
}
