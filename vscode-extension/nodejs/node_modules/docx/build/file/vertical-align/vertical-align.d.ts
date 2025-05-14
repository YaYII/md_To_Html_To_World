import { XmlAttributeComponent, XmlComponent } from '../xml-components';
export declare const VerticalAlign: {
    readonly BOTTOM: "bottom";
    readonly CENTER: "center";
    readonly TOP: "top";
};
export declare class VerticalAlignAttributes extends XmlAttributeComponent<{
    readonly verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
}> {
    protected readonly xmlKeys: {
        verticalAlign: string;
    };
}
export declare class VerticalAlignElement extends XmlComponent {
    constructor(value: (typeof VerticalAlign)[keyof typeof VerticalAlign]);
}
