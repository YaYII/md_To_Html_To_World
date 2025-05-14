import { XmlAttributeComponent, XmlComponent } from '../../xml-components';
export interface TabStopDefinition {
    readonly type: (typeof TabStopType)[keyof typeof TabStopType];
    readonly position: number | (typeof TabStopPosition)[keyof typeof TabStopPosition];
    readonly leader?: (typeof LeaderType)[keyof typeof LeaderType];
}
export declare class TabStop extends XmlComponent {
    constructor(tabDefinitions: readonly TabStopDefinition[]);
}
export declare const TabStopType: {
    readonly LEFT: "left";
    readonly RIGHT: "right";
    readonly CENTER: "center";
    readonly BAR: "bar";
    readonly CLEAR: "clear";
    readonly DECIMAL: "decimal";
    readonly END: "end";
    readonly NUM: "num";
    readonly START: "start";
};
export declare const LeaderType: {
    readonly DOT: "dot";
    readonly HYPHEN: "hyphen";
    readonly MIDDLE_DOT: "middleDot";
    readonly NONE: "none";
    readonly UNDERSCORE: "underscore";
};
export declare const TabStopPosition: {
    readonly MAX: 9026;
};
export declare class TabAttributes extends XmlAttributeComponent<{
    readonly val: (typeof TabStopType)[keyof typeof TabStopType];
    readonly pos: string | number;
    readonly leader?: (typeof LeaderType)[keyof typeof LeaderType];
}> {
    protected readonly xmlKeys: {
        val: string;
        pos: string;
        leader: string;
    };
}
export declare class TabStopItem extends XmlComponent {
    constructor({ type, position, leader }: TabStopDefinition);
}
