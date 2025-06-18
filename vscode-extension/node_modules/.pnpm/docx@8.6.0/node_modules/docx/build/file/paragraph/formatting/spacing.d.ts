import { XmlComponent } from '../../xml-components';
export declare const LineRuleType: {
    readonly AT_LEAST: "atLeast";
    readonly EXACTLY: "exactly";
    readonly EXACT: "exact";
    readonly AUTO: "auto";
};
export interface ISpacingProperties {
    readonly after?: number;
    readonly before?: number;
    readonly line?: number;
    readonly lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType];
    readonly beforeAutoSpacing?: boolean;
    readonly afterAutoSpacing?: boolean;
}
export declare class Spacing extends XmlComponent {
    constructor(options: ISpacingProperties);
}
