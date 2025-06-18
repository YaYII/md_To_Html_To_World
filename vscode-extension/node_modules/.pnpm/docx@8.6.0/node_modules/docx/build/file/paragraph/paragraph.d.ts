import { FootnoteReferenceRun } from '../footnotes';
import { IContext, IXmlableObject } from '../xml-components';
import { FileChild } from '../file-child';
import { DeletedTextRun, InsertedTextRun } from "../track-revision";
import { CheckBox } from "../checkbox";
import { ColumnBreak, PageBreak } from "./formatting/break";
import { Bookmark, ExternalHyperlink, InternalHyperlink } from "./links";
import { Math } from "./math";
import { IParagraphPropertiesOptions } from "./properties";
import { ImageRun, Run, SequentialIdentifier, SimpleField, SimpleMailMergeField, SymbolRun, TextRun } from "./run";
import { Comment, CommentRangeEnd, CommentRangeStart, CommentReference, Comments } from "./run/comment-run";
export type ParagraphChild = TextRun | ImageRun | SymbolRun | Bookmark | PageBreak | ColumnBreak | SequentialIdentifier | FootnoteReferenceRun | InternalHyperlink | ExternalHyperlink | InsertedTextRun | DeletedTextRun | Math | SimpleField | SimpleMailMergeField | Comments | Comment | CommentRangeStart | CommentRangeEnd | CommentReference | CheckBox;
export interface IParagraphOptions extends IParagraphPropertiesOptions {
    readonly text?: string;
    readonly children?: readonly ParagraphChild[];
}
export declare class Paragraph extends FileChild {
    private readonly properties;
    constructor(options: string | IParagraphOptions);
    prepForXml(context: IContext): IXmlableObject | undefined;
    addRunToFront(run: Run): Paragraph;
}
