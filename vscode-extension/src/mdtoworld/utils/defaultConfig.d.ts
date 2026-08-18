/**
 * defaultConfig.js 类型声明（单一权威配置源）
 * 所有默认配置参数统一来自 COMPLETE_DEFAULTS，禁止在业务代码中散落硬编码默认值。
 */
export interface DefaultConfig {
    [key: string]: any;
    fonts: {
        default: string;
        code: string;
        headings: string;
        english: string;
        icon: string;
    };
    sizes: {
        default: number;
        code: number;
        heading1: number;
        heading2: number;
        heading3: number;
        heading4: number;
        heading5: number;
        heading6: number;
        icon: number;
    };
    colors: {
        default: string;
        headings: string;
        code: string;
        link: string;
        icon: string;
    };
    paragraph: {
        line_spacing: number;
        space_before: number;
        space_after: number;
        first_line_indent: number;
        heading_before: number;
        heading_after: number;
        char_width_ratio: number;
    };
    chinese: {
        convert_to_traditional: boolean;
        punctuation_spacing: boolean;
        auto_spacing: boolean;
    };
    table_styles: {
        even_row_color: string;
        odd_row_color: string;
        header_bg_color: string;
        border_color: string;
        cell_height: string;
        table_width: string;
    };
    enhanced_table_styles: {
        [key: string]: any;
    };
    document: {
        page_size: string;
        orientation: string;
        margin_top: number;
        margin_bottom: number;
        margin_left: number;
        margin_right: number;
        generate_toc: boolean;
        toc_depth: number;
        generate_cover: boolean;
        generate_cover_without_toc: boolean;
        show_horizontal_rules: boolean;
        show_page_number: boolean;
        header: string;
        footer: string;
        language: string;
    };
    charts: {
        [key: string]: any;
    };
    markdown: {
        [key: string]: any;
    };
    output: {
        keepHtml: boolean;
    };
    images: {
        preserve: boolean;
        max_width: number;
    };
    debug: {
        [key: string]: any;
    };
    creator: string;
    title: string;
    description: string;
}

export const COMPLETE_DEFAULTS: DefaultConfig;
export function deepMerge(target: any, source: any): any;
