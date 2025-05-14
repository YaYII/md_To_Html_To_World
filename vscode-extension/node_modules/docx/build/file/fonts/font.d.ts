import { XmlComponent } from '../xml-components';
export interface IFontRelationshipOptions {
    readonly id: string;
    readonly fontKey?: string;
    readonly subsetted?: boolean;
}
export declare const CharacterSet: {
    readonly ANSI: "00";
    readonly DEFAULT: "01";
    readonly SYMBOL: "02";
    readonly MAC: "4D";
    readonly JIS: "80";
    readonly HANGUL: "81";
    readonly JOHAB: "82";
    readonly GB_2312: "86";
    readonly CHINESEBIG5: "88";
    readonly GREEK: "A1";
    readonly TURKISH: "A2";
    readonly VIETNAMESE: "A3";
    readonly HEBREW: "B1";
    readonly ARABIC: "B2";
    readonly BALTIC: "BA";
    readonly RUSSIAN: "CC";
    readonly THAI: "DE";
    readonly EASTEUROPE: "EE";
    readonly OEM: "FF";
};
export type FontOptions = {
    readonly name: string;
    readonly altName?: string;
    readonly panose1?: string;
    readonly charset?: (typeof CharacterSet)[keyof typeof CharacterSet];
    readonly family?: string;
    readonly notTrueType?: boolean;
    readonly pitch?: string;
    readonly sig?: {
        readonly usb0: string;
        readonly usb1: string;
        readonly usb2: string;
        readonly usb3: string;
        readonly csb0: string;
        readonly csb1: string;
    };
    readonly embedRegular?: IFontRelationshipOptions;
    readonly embedBold?: IFontRelationshipOptions;
    readonly embedItalic?: IFontRelationshipOptions;
    readonly embedBoldItalic?: IFontRelationshipOptions;
};
export declare const createFont: ({ name, altName, panose1, charset, family, notTrueType, pitch, sig, embedRegular, embedBold, embedItalic, embedBoldItalic, }: FontOptions) => XmlComponent;
