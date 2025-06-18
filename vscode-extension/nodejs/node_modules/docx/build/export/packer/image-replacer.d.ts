import { IMediaData, Media } from '../../file/media';
export declare class ImageReplacer {
    replace(xmlData: string, mediaData: readonly IMediaData[], offset: number): string;
    getMediaData(xmlData: string, media: Media): readonly IMediaData[];
}
