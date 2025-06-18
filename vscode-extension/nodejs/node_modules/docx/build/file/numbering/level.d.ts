import { XmlComponent } from '../xml-components';
import { AlignmentType } from "../paragraph/formatting";
import { ILevelParagraphStylePropertiesOptions } from "../paragraph/properties";
import { IRunStylePropertiesOptions } from "../paragraph/run/properties";
export declare const LevelFormat: {
    readonly DECIMAL: "decimal";
    readonly UPPER_ROMAN: "upperRoman";
    readonly LOWER_ROMAN: "lowerRoman";
    readonly UPPER_LETTER: "upperLetter";
    readonly LOWER_LETTER: "lowerLetter";
    readonly ORDINAL: "ordinal";
    readonly CARDINAL_TEXT: "cardinalText";
    readonly ORDINAL_TEXT: "ordinalText";
    readonly HEX: "hex";
    readonly CHICAGO: "chicago";
    readonly IDEOGRAPH__DIGITAL: "ideographDigital";
    readonly JAPANESE_COUNTING: "japaneseCounting";
    readonly AIUEO: "aiueo";
    readonly IROHA: "iroha";
    readonly DECIMAL_FULL_WIDTH: "decimalFullWidth";
    readonly DECIMAL_HALF_WIDTH: "decimalHalfWidth";
    readonly JAPANESE_LEGAL: "japaneseLegal";
    readonly JAPANESE_DIGITAL_TEN_THOUSAND: "japaneseDigitalTenThousand";
    readonly DECIMAL_ENCLOSED_CIRCLE: "decimalEnclosedCircle";
    readonly DECIMAL_FULL_WIDTH2: "decimalFullWidth2";
    readonly AIUEO_FULL_WIDTH: "aiueoFullWidth";
    readonly IROHA_FULL_WIDTH: "irohaFullWidth";
    readonly DECIMAL_ZERO: "decimalZero";
    readonly BULLET: "bullet";
    readonly GANADA: "ganada";
    readonly CHOSUNG: "chosung";
    readonly DECIMAL_ENCLOSED_FULLSTOP: "decimalEnclosedFullstop";
    readonly DECIMAL_ENCLOSED_PARENTHESES: "decimalEnclosedParen";
    readonly DECIMAL_ENCLOSED_CIRCLE_CHINESE: "decimalEnclosedCircleChinese";
    readonly IDEOGRAPH_ENCLOSED_CIRCLE: "ideographEnclosedCircle";
    readonly IDEOGRAPH_TRADITIONAL: "ideographTraditional";
    readonly IDEOGRAPH_ZODIAC: "ideographZodiac";
    readonly IDEOGRAPH_ZODIAC_TRADITIONAL: "ideographZodiacTraditional";
    readonly TAIWANESE_COUNTING: "taiwaneseCounting";
    readonly IDEOGRAPH_LEGAL_TRADITIONAL: "ideographLegalTraditional";
    readonly TAIWANESE_COUNTING_THOUSAND: "taiwaneseCountingThousand";
    readonly TAIWANESE_DIGITAL: "taiwaneseDigital";
    readonly CHINESE_COUNTING: "chineseCounting";
    readonly CHINESE_LEGAL_SIMPLIFIED: "chineseLegalSimplified";
    readonly CHINESE_COUNTING_THOUSAND: "chineseCountingThousand";
    readonly KOREAN_DIGITAL: "koreanDigital";
    readonly KOREAN_COUNTING: "koreanCounting";
    readonly KOREAN_LEGAL: "koreanLegal";
    readonly KOREAN_DIGITAL2: "koreanDigital2";
    readonly VIETNAMESE_COUNTING: "vietnameseCounting";
    readonly RUSSIAN_LOWER: "russianLower";
    readonly RUSSIAN_UPPER: "russianUpper";
    readonly NONE: "none";
    readonly NUMBER_IN_DASH: "numberInDash";
    readonly HEBREW1: "hebrew1";
    readonly HEBREW2: "hebrew2";
    readonly ARABIC_ALPHA: "arabicAlpha";
    readonly ARABIC_ABJAD: "arabicAbjad";
    readonly HINDI_VOWELS: "hindiVowels";
    readonly HINDI_CONSONANTS: "hindiConsonants";
    readonly HINDI_NUMBERS: "hindiNumbers";
    readonly HINDI_COUNTING: "hindiCounting";
    readonly THAI_LETTERS: "thaiLetters";
    readonly THAI_NUMBERS: "thaiNumbers";
    readonly THAI_COUNTING: "thaiCounting";
    readonly BAHT_TEXT: "bahtText";
    readonly DOLLAR_TEXT: "dollarText";
    readonly CUSTOM: "custom";
};
export declare const LevelSuffix: {
    readonly NOTHING: "nothing";
    readonly SPACE: "space";
    readonly TAB: "tab";
};
export interface ILevelsOptions {
    readonly level: number;
    readonly format?: (typeof LevelFormat)[keyof typeof LevelFormat];
    readonly text?: string;
    readonly alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    readonly start?: number;
    readonly suffix?: (typeof LevelSuffix)[keyof typeof LevelSuffix];
    readonly isLegalNumberingStyle?: boolean;
    readonly style?: {
        readonly run?: IRunStylePropertiesOptions;
        readonly paragraph?: ILevelParagraphStylePropertiesOptions;
    };
}
export declare class LevelBase extends XmlComponent {
    private readonly paragraphProperties;
    private readonly runProperties;
    constructor({ level, format, text, alignment, start, style, suffix, isLegalNumberingStyle, }: ILevelsOptions);
}
export declare class Level extends LevelBase {
}
export declare class LevelForOverride extends LevelBase {
}
