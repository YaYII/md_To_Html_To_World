import { XmlComponent } from '../xml-components';
import { Paragraph } from "../paragraph";
export declare class FootNotes extends XmlComponent {
    constructor();
    createFootNote(id: number, paragraph: readonly Paragraph[]): void;
}
