import { SpaceType } from '../../../shared';
import { XmlComponent } from '../../../xml-components';
interface ITextOptions {
    readonly space?: (typeof SpaceType)[keyof typeof SpaceType];
    readonly text?: string;
}
export declare class Text extends XmlComponent {
    constructor(options: string | ITextOptions);
}
export {};
