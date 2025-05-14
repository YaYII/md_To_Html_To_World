import { HorizontalPositionAlign, VerticalPositionAlign } from '../../shared/alignment';
import { XmlComponent } from '../../xml-components';
export declare class Align extends XmlComponent {
    constructor(value: (typeof HorizontalPositionAlign)[keyof typeof HorizontalPositionAlign] | (typeof VerticalPositionAlign)[keyof typeof VerticalPositionAlign]);
}
