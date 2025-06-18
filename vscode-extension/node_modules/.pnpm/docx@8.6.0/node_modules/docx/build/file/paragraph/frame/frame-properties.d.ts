import { HorizontalPositionAlign, VerticalPositionAlign } from '../../shared/alignment';
import { HeightRule } from '../../table';
import { XmlComponent } from '../../xml-components';
export declare const DropCapType: {
    readonly NONE: "none";
    readonly DROP: "drop";
    readonly MARGIN: "margin";
};
export declare const FrameAnchorType: {
    readonly MARGIN: "margin";
    readonly PAGE: "page";
    readonly TEXT: "text";
};
export declare const FrameWrap: {
    readonly AROUND: "around";
    readonly AUTO: "auto";
    readonly NONE: "none";
    readonly NOT_BESIDE: "notBeside";
    readonly THROUGH: "through";
    readonly TIGHT: "tight";
};
interface IBaseFrameOptions {
    readonly anchorLock?: boolean;
    readonly dropCap?: (typeof DropCapType)[keyof typeof DropCapType];
    readonly width: number;
    readonly height: number;
    readonly wrap?: (typeof FrameWrap)[keyof typeof FrameWrap];
    readonly lines?: number;
    readonly anchor: {
        readonly horizontal: (typeof FrameAnchorType)[keyof typeof FrameAnchorType];
        readonly vertical: (typeof FrameAnchorType)[keyof typeof FrameAnchorType];
    };
    readonly space?: {
        readonly horizontal: number;
        readonly vertical: number;
    };
    readonly rule?: (typeof HeightRule)[keyof typeof HeightRule];
}
export interface IXYFrameOptions extends IBaseFrameOptions {
    readonly type: "absolute";
    readonly position: {
        readonly x: number;
        readonly y: number;
    };
}
export interface IAlignmentFrameOptions extends IBaseFrameOptions {
    readonly type: "alignment";
    readonly alignment: {
        readonly x: (typeof HorizontalPositionAlign)[keyof typeof HorizontalPositionAlign];
        readonly y: (typeof VerticalPositionAlign)[keyof typeof VerticalPositionAlign];
    };
}
export type IFrameOptions = IXYFrameOptions | IAlignmentFrameOptions;
export declare const createFrameProperties: (options: IFrameOptions) => XmlComponent;
export {};
