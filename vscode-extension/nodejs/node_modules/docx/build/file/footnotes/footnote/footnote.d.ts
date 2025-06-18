import { Paragraph } from '../../paragraph';
import { XmlComponent } from '../../xml-components';
export declare const FootnoteType: {
    readonly SEPERATOR: "separator";
    readonly CONTINUATION_SEPERATOR: "continuationSeparator";
};
export interface IFootnoteOptions {
    readonly id: number;
    readonly type?: (typeof FootnoteType)[keyof typeof FootnoteType];
    readonly children: readonly Paragraph[];
}
export declare class Footnote extends XmlComponent {
    constructor(options: IFootnoteOptions);
}
