/**
 * @description 转换结果接口
 */
export interface IConversionResult {
    /** 是否转换成功 */
    success: boolean;
    /** 输出文件路径 */
    outputFile: string;
    /** 转换结果消息 */
    message: string;
    /** 错误信息（如果有） */
    error?: string;
}

/**
 * @description 转换选项接口
 */
export interface IConversionOptions {
    /** 输出文件路径 */
    outputFile?: string;
    /** 是否显示进度 */
    showProgress?: boolean;
    /** 转换完成后的操作 */
    onComplete?: (result: IConversionResult) => Promise<void>;
}

/**
 * @description 转换进度接口
 */
export interface IConversionProgress {
    /** 当前步骤 */
    step: string;
    /** 进度百分比 */
    percentage: number;
    /** 详细信息 */
    detail?: string;
} 