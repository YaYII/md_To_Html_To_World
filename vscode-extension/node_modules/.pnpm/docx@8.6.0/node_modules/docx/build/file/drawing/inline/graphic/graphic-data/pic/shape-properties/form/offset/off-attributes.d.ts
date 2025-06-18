import { XmlAttributeComponent } from '../../../../../../../../xml-components';
export declare class OffsetAttributes extends XmlAttributeComponent<{
    readonly x?: number;
    readonly y?: number;
}> {
    protected readonly xmlKeys: {
        x: string;
        y: string;
    };
}
