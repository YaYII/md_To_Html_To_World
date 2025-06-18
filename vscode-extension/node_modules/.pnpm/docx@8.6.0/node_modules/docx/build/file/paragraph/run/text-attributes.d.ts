import { SpaceType } from '../../shared';
import { XmlAttributeComponent } from '../../xml-components';
export declare class TextAttributes extends XmlAttributeComponent<{
    readonly space: (typeof SpaceType)[keyof typeof SpaceType];
}> {
    protected readonly xmlKeys: {
        space: string;
    };
}
