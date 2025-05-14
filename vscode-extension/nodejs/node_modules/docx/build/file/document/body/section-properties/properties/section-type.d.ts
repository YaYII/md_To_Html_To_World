import { XmlAttributeComponent, XmlComponent } from '../../../../xml-components';
export declare const SectionType: {
    readonly NEXT_PAGE: "nextPage";
    readonly NEXT_COLUMN: "nextColumn";
    readonly CONTINUOUS: "continuous";
    readonly EVEN_PAGE: "evenPage";
    readonly ODD_PAGE: "oddPage";
};
export declare class SectionTypeAttributes extends XmlAttributeComponent<{
    readonly val: (typeof SectionType)[keyof typeof SectionType];
}> {
    protected readonly xmlKeys: {
        val: string;
    };
}
export declare class Type extends XmlComponent {
    constructor(value: (typeof SectionType)[keyof typeof SectionType]);
}
