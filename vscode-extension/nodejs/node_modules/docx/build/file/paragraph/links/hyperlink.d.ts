import { XmlComponent } from '../../xml-components';
import { ParagraphChild } from "../paragraph";
export declare const HyperlinkType: {
    readonly INTERNAL: "INTERNAL";
    readonly EXTERNAL: "EXTERNAL";
};
export declare class ConcreteHyperlink extends XmlComponent {
    readonly linkId: string;
    constructor(children: readonly ParagraphChild[], relationshipId: string, anchor?: string);
}
export declare class InternalHyperlink extends ConcreteHyperlink {
    constructor(options: {
        readonly children: readonly ParagraphChild[];
        readonly anchor: string;
    });
}
export declare class ExternalHyperlink extends XmlComponent {
    readonly options: {
        readonly children: readonly ParagraphChild[];
        readonly link: string;
    };
    constructor(options: {
        readonly children: readonly ParagraphChild[];
        readonly link: string;
    });
}
