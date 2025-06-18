import { XmlComponent } from '../../xml-components';
import { FootnoteReferenceRun } from '../../footnotes/footnote/run/reference-run';
import { FieldInstruction } from '../../table-of-contents/field-instruction';
import { Break } from "./break";
import { Begin, End, Separate } from "./field";
import { IRunPropertiesOptions, RunProperties } from "./properties";
import { AnnotationReference, CarriageReturn, ContinuationSeparator, DayLong, DayShort, EndnoteReference, FootnoteReferenceElement, LastRenderedPageBreak, MonthLong, MonthShort, NoBreakHyphen, PageNumberElement, Separator, SoftHyphen, Tab, YearLong, YearShort } from "./empty-children";
import { PositionalTab } from "./positional-tab";
export interface IRunOptions extends IRunPropertiesOptions {
    readonly children?: readonly (Begin | FieldInstruction | Separate | End | (typeof PageNumber)[keyof typeof PageNumber] | FootnoteReferenceRun | Break | AnnotationReference | CarriageReturn | ContinuationSeparator | DayLong | DayShort | EndnoteReference | FootnoteReferenceElement | LastRenderedPageBreak | MonthLong | MonthShort | NoBreakHyphen | PageNumberElement | Separator | SoftHyphen | Tab | YearLong | YearShort | PositionalTab | string)[];
    readonly break?: number;
    readonly text?: string;
}
export declare const PageNumber: {
    readonly CURRENT: "CURRENT";
    readonly TOTAL_PAGES: "TOTAL_PAGES";
    readonly TOTAL_PAGES_IN_SECTION: "TOTAL_PAGES_IN_SECTION";
    readonly CURRENT_SECTION: "SECTION";
};
export declare class Run extends XmlComponent {
    protected readonly properties: RunProperties;
    constructor(options: IRunOptions);
}
