import { FileChild } from '../../file-child';
import { XmlComponent } from '../../xml-components';
export interface ICommentOptions {
    readonly id: number;
    readonly children: readonly FileChild[];
    readonly initials?: string;
    readonly author?: string;
    readonly date?: Date;
}
export interface ICommentsOptions {
    readonly children: readonly ICommentOptions[];
}
export declare class CommentRangeStart extends XmlComponent {
    constructor(id: number);
}
export declare class CommentRangeEnd extends XmlComponent {
    constructor(id: number);
}
export declare class CommentReference extends XmlComponent {
    constructor(id: number);
}
export declare class Comment extends XmlComponent {
    constructor({ id, initials, author, date, children }: ICommentOptions);
}
export declare class Comments extends XmlComponent {
    constructor({ children }: ICommentsOptions);
}
