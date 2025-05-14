/**
 * @description 媒体处理器模块
 * 处理图片等媒体元素
 */
const fs = require('fs-extra');
const path = require('path');
const { Paragraph, TextRun, ImageRun, AlignmentType } = require('docx');

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
            
            // 创建图片段落
            const paragraph = new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 400,
                    height: 300
                  }
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
          
          // 获取图片尺寸（如果可能）
          let width = 400;
          let height = 300;
          
          // 创建图片段落
          const paragraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageData,
                transformation: {
                  width,
                  height
                },
                altText: alt
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