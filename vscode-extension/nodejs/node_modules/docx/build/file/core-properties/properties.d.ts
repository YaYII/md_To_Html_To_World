import { ICommentsOptions } from '../paragraph/run/comment-run';
import { ICompatibilityOptions } from '../settings/compatibility';
import { FontOptions } from '../fonts/font-table';
import { XmlComponent } from '../xml-components';
import { ICustomPropertyOptions } from "../custom-properties";
import { IDocumentBackgroundOptions } from "../document";
import { ISectionOptions } from "../file";
import { INumberingOptions } from "../numbering";
import { Paragraph } from "../paragraph";
import { IStylesOptions } from "../styles";
export interface IPropertiesOptions {
    readonly sections: readonly ISectionOptions[];
    readonly title?: string;
    readonly subject?: string;
    readonly creator?: string;
    readonly keywords?: string;
    readonly description?: string;
    readonly lastModifiedBy?: string;
    readonly revision?: number;
    readonly externalStyles?: string;
    readonly styles?: IStylesOptions;
    readonly numbering?: INumberingOptions;
    readonly comments?: ICommentsOptions;
    readonly footnotes?: {
        readonly [key: string]: {
            readonly children: readonly Paragraph[];
        };
    };
    readonly background?: IDocumentBackgroundOptions;
    readonly features?: {
        readonly trackRevisions?: boolean;
        readonly updateFields?: boolean;
    };
    readonly compatabilityModeVersion?: number;
    readonly compatibility?: ICompatibilityOptions;
    readonly customProperties?: readonly ICustomPropertyOptions[];
    readonly evenAndOddHeaderAndFooters?: boolean;
    readonly defaultTabStop?: number;
    readonly fonts?: readonly FontOptions[];
}
export declare class CoreProperties extends XmlComponent {
    constructor(options: Omit<IPropertiesOptions, "sections">);
}
