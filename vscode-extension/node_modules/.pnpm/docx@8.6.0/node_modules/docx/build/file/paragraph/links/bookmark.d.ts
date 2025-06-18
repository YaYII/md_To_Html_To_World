import { XmlComponent } from '../../xml-components';
import { ParagraphChild } from "../paragraph";
export declare class Bookmark {
    private readonly bookmarkUniqueNumericId;
    readonly start: BookmarkStart;
    readonly children: readonly ParagraphChild[];
    readonly end: BookmarkEnd;
    constructor(options: {
        readonly id: string;
        readonly children: readonly ParagraphChild[];
    });
}
export declare class BookmarkStart extends XmlComponent {
    constructor(id: string, linkId: number);
}
export declare class BookmarkEnd extends XmlComponent {
    constructor(linkId: number);
}
