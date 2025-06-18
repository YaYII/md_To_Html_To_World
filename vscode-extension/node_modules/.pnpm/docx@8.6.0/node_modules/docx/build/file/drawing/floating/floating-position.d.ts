import { HorizontalPositionAlign, VerticalPositionAlign } from '../../shared/alignment';
import { ITextWrapping } from "../text-wrap";
export declare const HorizontalPositionRelativeFrom: {
    readonly CHARACTER: "character";
    readonly COLUMN: "column";
    readonly INSIDE_MARGIN: "insideMargin";
    readonly LEFT_MARGIN: "leftMargin";
    readonly MARGIN: "margin";
    readonly OUTSIDE_MARGIN: "outsideMargin";
    readonly PAGE: "page";
    readonly RIGHT_MARGIN: "rightMargin";
};
export declare const VerticalPositionRelativeFrom: {
    readonly BOTTOM_MARGIN: "bottomMargin";
    readonly INSIDE_MARGIN: "insideMargin";
    readonly LINE: "line";
    readonly MARGIN: "margin";
    readonly OUTSIDE_MARGIN: "outsideMargin";
    readonly PAGE: "page";
    readonly PARAGRAPH: "paragraph";
    readonly TOP_MARGIN: "topMargin";
};
export interface IHorizontalPositionOptions {
    readonly relative?: (typeof HorizontalPositionRelativeFrom)[keyof typeof HorizontalPositionRelativeFrom];
    readonly align?: (typeof HorizontalPositionAlign)[keyof typeof HorizontalPositionAlign];
    readonly offset?: number;
}
export interface IVerticalPositionOptions {
    readonly relative?: (typeof VerticalPositionRelativeFrom)[keyof typeof VerticalPositionRelativeFrom];
    readonly align?: (typeof VerticalPositionAlign)[keyof typeof VerticalPositionAlign];
    readonly offset?: number;
}
export interface IMargins {
    readonly left?: number;
    readonly bottom?: number;
    readonly top?: number;
    readonly right?: number;
}
export interface IFloating {
    readonly horizontalPosition: IHorizontalPositionOptions;
    readonly verticalPosition: IVerticalPositionOptions;
    readonly allowOverlap?: boolean;
    readonly lockAnchor?: boolean;
    readonly behindDocument?: boolean;
    readonly layoutInCell?: boolean;
    readonly margins?: IMargins;
    readonly wrap?: ITextWrapping;
    readonly zIndex?: number;
}
