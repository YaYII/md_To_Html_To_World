import { XmlComponent } from '../../xml-components';
export declare const PositionalTabAlignment: {
    readonly LEFT: "left";
    readonly CENTER: "center";
    readonly RIGHT: "right";
};
export declare const PositionalTabRelativeTo: {
    readonly MARGIN: "margin";
    readonly INDENT: "indent";
};
export declare const PositionalTabLeader: {
    readonly NONE: "none";
    readonly DOT: "dot";
    readonly HYPHEN: "hyphen";
    readonly UNDERSCORE: "underscore";
    readonly MIDDLE_DOT: "middleDot";
};
export interface PositionalTabOptions {
    readonly alignment: (typeof PositionalTabAlignment)[keyof typeof PositionalTabAlignment];
    readonly relativeTo: (typeof PositionalTabRelativeTo)[keyof typeof PositionalTabRelativeTo];
    readonly leader: (typeof PositionalTabLeader)[keyof typeof PositionalTabLeader];
}
export declare class PositionalTab extends XmlComponent {
    constructor(options: PositionalTabOptions);
}
