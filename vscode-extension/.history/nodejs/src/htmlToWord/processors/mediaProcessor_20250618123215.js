/**
 * @description 媒体处理器模块
 * 处理图片等媒体元素
 */
const fs = require('fs');
const path = require('path');
const { Paragraph, TextRun, ImageRun, AlignmentType } = require('docx');
const { getImageDimensions, calculateWordImageSize, parseImageAttributes } = require('../../utils/imageUtils');

// Sharp库将在需要时动态加载
let sharp = null;
let sharpLoadAttempted = false;

/**
 * @function loadSharp
 * @description 动态加载sharp库
 * @returns {Promise<Object|null>} sharp实例或null
 */
async function loadSharp() {
  if (sharpLoadAttempted) {
    return sharp;
  }
  
  sharpLoadAttempted = true;
  
  try {
    // 动态导入sharp库
    sharp = require('sharp');
    console.log('✅ sharp 库加载成功，将用于SVG转换');
    return sharp;
  } catch (error) {
    console.warn('⚠️ sharp 库未安装:', error.message);
    console.warn('SVG图表将使用文本占位符显示');
    console.warn('如需SVG转换功能，请运行: npm install sharp');
    sharp = null;
    return null;
  }
}

/**
 * @class MediaProcessor
 * @description 处理媒体元素的类
 */
class MediaProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   * @param {Object} converter - 转换器实例
   */
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
  }

  /**
   * @method processSvg
   * @description 处理SVG元素 - 优化版本，直接使用HTML中的SVG内容
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  async processSvg($el, $) {
    try {
      // 获取完整的SVG元素HTML（包括属性）
      let svgContent = $.html($el);
      
      if (!svgContent) {
        console.warn('SVG元素为空');
        return;
      }
      
      // 获取SVG的显示文本（如果有alt属性或title）
      const displayText = $el.attr('alt') || $el.attr('title') || $el.find('title').text() || 'SVG图表';
      
      console.log(`🎨 开始处理SVG: ${displayText}`);
      console.log(`📏 SVG内容长度: ${svgContent.length} 字符`);
      
      // 动态加载sharp库
      const sharpInstance = await loadSharp();
      if (!sharpInstance) {
        console.warn('sharp 库不可用，使用文本占位符');
        
        const fallbackParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `[${displayText} - SVG转换库不可用，请安装 sharp]`,
              bold: true,
              color: "FF6600"
            })
          ]
        });
        
        this.converter.addDocElement(fallbackParagraph);
        return;
      }
      
      try {
        // 确保SVG有正确的命名空间
        if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
          svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        console.log('🔄 开始SVG转PNG转换...');
        
        // 使用sharp转换SVG为PNG
        const pngBuffer = await sharpInstance(Buffer.from(svgContent))
          .png({
            quality: 90,
            compressionLevel: 6
          })
          .resize(800, 600, {
            fit: 'inside',
            withoutEnlargement: true,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toBuffer();
        
        if (!pngBuffer || pngBuffer.length === 0) {
          throw new Error('转换结果为空');
        }
        
        console.log(`✅ SVG转换为PNG成功，大小: ${pngBuffer.length} bytes`);
        
        // 获取图片尺寸
        const originalSize = getImageDimensions(pngBuffer);
        const wordSize = calculateWordImageSize(originalSize, {}, {
          maxWidth: 600,
          maxHeight: 450,
          maintainAspectRatio: true
        });
        
        console.log(`📐 SVG图片尺寸: 原始 ${originalSize.width}x${originalSize.height} -> Word ${wordSize.width}x${wordSize.height}`);
        
        // 创建图片段落
        const imageParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: pngBuffer,
              transformation: {
                width: wordSize.width,
                height: wordSize.height
              }
            })
          ],
          spacing: {
            before: 240,
            after: 240
          }
        });
        
        this.converter.addDocElement(imageParagraph);
        
        // 如果有描述文字，添加描述段落
        if (displayText && displayText !== 'SVG图表') {
          const descParagraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: displayText,
                italics: true,
                size: 20,
                color: "666666"
              })
            ],
            spacing: {
              before: 80,
              after: 240
            }
          });
          this.converter.addDocElement(descParagraph);
        }
        
        console.log('✅ SVG转换为PNG并插入Word文档成功');
        
      } catch (conversionError) {
        console.error('❌ SVG转换失败:', conversionError.message);
        console.error('📄 SVG内容预览:', svgContent.substring(0, 200) + '...');
        
        // 降级为文本占位符
        const fallbackParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `[${displayText} - SVG转换失败: ${conversionError.message}]`,
              bold: true,
              color: "FF6600"
            })
          ]
        });
        
        this.converter.addDocElement(fallbackParagraph);
      }
      
    } catch (error) {
      console.error('处理SVG失败:', error);
      // 添加错误占位符
      const errorParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '[SVG图表 - 处理失败]',
            color: "FF0000"
          })
        ]
      });
      this.converter.addDocElement(errorParagraph);
    }
  }

  /**
   * @method processImage
   * @description 处理图片元素
   * @param {Cheerio} $el - Cheerio元素
   */
  processImage($el) {
    try {
      // 获取图片源路径
      const src = $el.attr('src') || '';
      if (!src) return;
      
      // 获取图片描述
      const alt = $el.attr('alt') || '';
      
      // 处理网络图片或base64图片
      if (src.startsWith('http://') || src.startsWith('https://')) {
        console.log(`暂不支持网络图片: ${src}`);
        const paragraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `[网络图片: ${alt || src}]`
            })
          ]
        });
        
        this.converter.addDocElement(paragraph);
        return;
      }
      
      // 处理base64图片
      if (src.startsWith('data:image/')) {
        try {
          // 从base64字符串提取图像数据
          const base64Data = src.split(',')[1];
          if (base64Data) {
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // 解析图片属性
            const attributes = parseImageAttributes($el);
            
            // 获取图片尺寸
            const originalSize = getImageDimensions(imageBuffer);
            const wordSize = calculateWordImageSize(originalSize, attributes, {
              maxWidth: 600,
              maxHeight: 450,
              maintainAspectRatio: true
            });
            
            console.log(`📐 Base64图片尺寸: 原始 ${originalSize.width}x${originalSize.height} -> Word ${wordSize.width}x${wordSize.height}`);
            
            // 创建图片段落
            const paragraph = new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: wordSize.width,
                    height: wordSize.height
                  },
                  altText: attributes.alt
                })
              ]
            });
            
            this.converter.addDocElement(paragraph);
            return;
          }
        } catch (error) {
          console.error('处理base64图片失败:', error);
        }
      }
      
      // 处理本地图片
      try {
        // 构建图片的完整路径
        let imagePath = src;
        if (!path.isAbsolute(src)) {
          imagePath = path.join(this.converter.basePath, src);
        }
        
        // 检查文件是否存在
        if (fs.existsSync(imagePath)) {
          // 读取图片文件
          const imageData = fs.readFileSync(imagePath);
          
          // 解析图片属性
          const attributes = parseImageAttributes($el);
          
          // 获取图片尺寸
          const originalSize = getImageDimensions(imageData);
          const wordSize = calculateWordImageSize(originalSize, attributes, {
            maxWidth: 600,
            maxHeight: 450,
            maintainAspectRatio: true
          });
          
          console.log(`📐 本地图片尺寸: ${imagePath}`);
          console.log(`   原始: ${originalSize.width}x${originalSize.height} -> Word: ${wordSize.width}x${wordSize.height}`);
          
          // 创建图片段落
          const paragraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageData,
                transformation: {
                  width: wordSize.width,
                  height: wordSize.height
                },
                altText: attributes.alt
              })
            ]
          });
          
          this.converter.addDocElement(paragraph);
          
          // 如果有图片说明文字，添加一个额外的段落
          if (alt) {
            const captionParagraph = new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: alt,
                  italics: true,
                  size: ((this.config.sizes?.default || 12) - 2) * 2 // 比正文小一号
                })
              ],
              spacing: {
                before: 80,
                after: 240
              }
            });
            
            this.converter.addDocElement(captionParagraph);
          }
          
          return;
        } else {
          console.error(`图片文件不存在: ${imagePath}`);
        }
      } catch (error) {
        console.error('处理本地图片失败:', error);
      }
      
      // 如果上面的处理都失败了，添加一个占位文本
      const paragraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `[图片: ${alt || src}]`
          })
        ]
      });
      
      // 添加到文档元素数组
      this.converter.addDocElement(paragraph);
    } catch (error) {
      console.error('处理图片时出错:', error);
      // 添加错误信息段落
      const errorParagraph = new Paragraph({
        children: [
          new TextRun({
            text: `[图片处理错误: ${error.message}]`,
            color: "FF0000"
          })
        ]
      });
      this.converter.addDocElement(errorParagraph);
    }
  }
}

module.exports = MediaProcessor;