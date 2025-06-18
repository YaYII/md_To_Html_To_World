import { XmlAttributeComponent } from '../../xml-components';
export declare class DefaultAttributes extends XmlAttributeComponent<{
    readonly contentType: string;
    readonly extension?: string;
}> {
    protected readonly xmlKeys: {
        contentType: string;
        extension: string;
    };
}
