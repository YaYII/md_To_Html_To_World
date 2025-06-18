import { Run } from '../../../paragraph/run';
import { XmlAttributeComponent, XmlComponent } from '../../../xml-components';
export declare class FootNoteReferenceRunAttributes extends XmlAttributeComponent<{
    readonly id: number;
}> {
    protected readonly xmlKeys: {
        id: string;
    };
}
export declare class FootnoteReference extends XmlComponent {
    constructor(id: number);
}
export declare class FootnoteReferenceRun extends Run {
    constructor(id: number);
}
