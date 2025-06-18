import { XmlComponent } from '../../../../xml-components';
export declare const PageTextDirectionType: {
    readonly LEFT_TO_RIGHT_TOP_TO_BOTTOM: "lrTb";
    readonly TOP_TO_BOTTOM_RIGHT_TO_LEFT: "tbRl";
};
export declare class PageTextDirection extends XmlComponent {
    constructor(value: (typeof PageTextDirectionType)[keyof typeof PageTextDirectionType]);
}
