import { XmlComponent } from '../../xml-components';
import { IRunOptions } from "../../paragraph/run/run";
import { IChangedAttributesProperties } from "../track-revision";
interface IDeletedRunOptions extends IRunOptions, IChangedAttributesProperties {
}
export declare class DeletedTextRun extends XmlComponent {
    protected readonly deletedTextRunWrapper: DeletedTextRunWrapper;
    constructor(options: IDeletedRunOptions);
}
declare class DeletedTextRunWrapper extends XmlComponent {
    constructor(options: IRunOptions);
}
export {};
