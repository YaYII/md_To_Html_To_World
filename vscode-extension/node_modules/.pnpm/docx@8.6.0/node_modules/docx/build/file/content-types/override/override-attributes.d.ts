import { XmlAttributeComponent } from '../../xml-components';
export declare class OverrideAttributes extends XmlAttributeComponent<{
    readonly contentType: string;
    readonly partName?: string;
}> {
    protected readonly xmlKeys: {
        contentType: string;
        partName: string;
    };
}
