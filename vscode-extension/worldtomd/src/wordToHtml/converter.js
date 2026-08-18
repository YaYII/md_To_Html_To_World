const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');
// const { ImprovedImageHandler } = require('./improvedImageHandler'); // 暂时注释掉，文件不存在

/**
 * Word 转 HTML 转换器
 * 使用 mammoth 库将 Word 文档转换为 HTML，并增强内容结构识别
 */
class WordToHtmlConverter {
  constructor(options = {}) {
    this.options = {
      // 转换选项 - 将在 convertToHtml 方法中动态设置
      convertImage: null, // 将在运行时设置
      
      // 图片处理选项
      imageProcessing: {
        useImprovedHandler: false,     // 默认使用简单的传统处理器
        useHashNaming: false,          // 不使用哈希命名
        enableCache: false,            // 不启用缓存
        fallbackToBase64: false,       // 禁用回退机制
        maxImageSize: 50 * 1024 * 1024, // 50MB限制（足够大）
        showStats: false               // 不显示统计信息
      },
       
      // 简化的样式映射 - 避免复杂的类名和 :fresh 修饰符
      styleMap: [
        // 标题映射 - 使用简单的映射，避免复杂的类名
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2", 
        "p[style-name='Heading 3'] => h3",
        "p[style-name='Heading 4'] => h4",
        "p[style-name='Heading 5'] => h5",
        "p[style-name='Heading 6'] => h6",
        "p[style-name='标题 1'] => h1",
        "p[style-name='标题 2'] => h2",
        "p[style-name='标题 3'] => h3",
        "p[style-name='标题 4'] => h4",
        "p[style-name='标题 5'] => h5",
        "p[style-name='标题 6'] => h6",
        
        // 列表样式映射 - 简化映射
        "p[style-name='List Paragraph'] => p",
        "p[style-name='列表段落'] => p",
        
        // 强调样式 - 保持简单
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Code'] => code",
        
        // 引用和特殊段落 - 简化映射
        "p[style-name='Quote'] => blockquote",
        "p[style-name='引用'] => blockquote",
        "p[style-name='Code Block'] => pre",
        "p[style-name='代码块'] => pre"
      ],
      // 添加更安全的转换选项
      ignoreEmptyParagraphs: false,
      ...options
    };
    
    // 图片处理器实例（用于获取统计信息）
    this.imageHandler = null;
  }

  /**
   * 生成安全的英文文件名（仅包含字母和数字）
   * @param {string} originalName - 原始文件名
   * @returns {string} 安全的英文文件名
   */
  generateSafeFileName(originalName) {
    // 移除文件扩展名
    const nameWithoutExt = path.basename(originalName, path.extname(originalName));
    
    // 将中文和特殊字符转换为安全的英文字符
    let safeName = nameWithoutExt
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .replace(/[^a-zA-Z0-9]/g, '_') // 将非字母数字字符替换为下划线
      .replace(/_+/g, '_') // 合并多个下划线
      .replace(/^_|_$/g, '') // 移除开头和结尾的下划线
      .toLowerCase();
    
    // 如果处理后为空或太短，使用默认名称
    if (!safeName || safeName.length < 2) {
      safeName = 'document';
    }
    
    // 添加时间戳确保唯一性
    const timestamp = Date.now().toString().slice(-6);
    return `${safeName}_${timestamp}`;
  }

  /**
   * 手动替换HTML中的base64图片为相对路径文件
   * 这是绕过mammoth库内部错误的解决方案
   * @param {string} html - 包含base64图片的HTML内容
   * @param {string} inputPath - Word文档路径
   * @returns {Promise<string>} 替换后的HTML内容
   */
  async replaceBase64WithFiles(html, inputPath) {
    console.log('🔄 手动处理base64图片...');
    
    const originalDocName = path.basename(inputPath, path.extname(inputPath));
    const safeDocName = this.generateSafeFileName(originalDocName);
    const imageDir = path.join(path.dirname(inputPath), 'images', safeDocName);
    
    console.log(`📁 原始文档名: ${originalDocName}`);
    console.log(`📁 安全文档名: ${safeDocName}`);
    
    // 确保图片目录存在
    await fs.ensureDir(imageDir);
    
    let imageCounter = 0;
    
    // 匹配base64图片的正则表达式
    const base64Regex = /<img[^>]*src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
    
    let match;
    let processedHtml = html;
    
    while ((match = base64Regex.exec(html)) !== null) {
      try {
        imageCounter++;
        const [fullMatch, imageType, base64Data] = match;
        
        // 解码base64数据
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // 生成文件名
        const extension = imageType === 'jpeg' ? 'jpg' : imageType;
        const filename = `image_${imageCounter.toString().padStart(3, '0')}.${extension}`;
        const imagePath = path.join(imageDir, filename);
        
        // 保存图片文件
        await fs.writeFile(imagePath, imageBuffer);
        
        // 生成相对路径
        const relativePath = path.join('images', safeDocName, filename).replace(/\\/g, '/');
        
        // 替换HTML中的src属性
        const newImgTag = fullMatch.replace(/src="[^"]*"/, `src="${relativePath}"`);
        processedHtml = processedHtml.replace(fullMatch, newImgTag);
        
        console.log(`图片已保存并替换: ${relativePath}`);
        
      } catch (error) {
        console.warn(`处理图片 ${imageCounter} 时出错: ${error.message}`);
      }
    }
    
    if (imageCounter > 0) {
      console.log(`✅ 成功处理 ${imageCounter} 个base64图片`);
    } else {
      console.log('ℹ️ 没有发现base64图片');
    }
    
    return processedHtml;
  }

  /**
   * 创建改进的图片处理函数（新方法）
   * @param {string} inputPath - Word 文档路径
   * @returns {Promise<Function>} 改进的图片处理函数
   */
  async createImprovedImageHandler(inputPath) {
    // 暂时禁用改进的处理器，因为ImprovedImageHandler类不可用
    console.log('🔄 使用传统图片处理器（改进的处理器暂不可用）');
    return this.createImageHandler(inputPath); // 使用原有方法
  }

  /**
   * 获取图片处理统计信息
   * @returns {Object|null} 统计信息对象
   */
  getImageProcessingStats() {
    if (this.imageHandler && typeof this.imageHandler.getStats === 'function') {
      return this.imageHandler.getStats();
    }
    return null;
  }

  /**
   * 创建图片处理函数，为每个文档创建独立的图片文件夹
   * @param {string} inputPath - Word 文档路径
   * @returns {Function} 图片处理函数
   */
  createImageHandler(inputPath) {
    const originalDocName = path.basename(inputPath, path.extname(inputPath));
    const safeDocName = this.generateSafeFileName(originalDocName);
    const imageDir = path.join(path.dirname(inputPath), 'images', safeDocName);
    
    console.log(`📁 createImageHandler - 原始文档名: ${originalDocName}`);
    console.log(`📁 createImageHandler - 安全文档名: ${safeDocName}`);
    let imageCounter = 0;

    return async (image) => {
      try {
        // 确保图片目录存在
        await fs.ensureDir(imageDir);
        
        // 生成图片文件名
        imageCounter++;
        const extension = this.getImageExtension(image.contentType) || 'png';
        const filename = `image_${imageCounter.toString().padStart(3, '0')}.${extension}`;
        const imagePath = path.join(imageDir, filename);
        
        // 读取图片数据
        const imageData = await image.read();
        
        // 保存图片文件
        await fs.writeFile(imagePath, imageData);
        
        // 返回相对路径（相对于 Word 文档位置）
        const relativePath = path.join('images', safeDocName, filename);
        
        console.log(`图片已保存: ${relativePath}`);
        
        return {
          src: relativePath.replace(/\\/g, '/') // 确保使用正斜杠
        };
      } catch (error) {
        console.error(`保存图片失败: ${error.message}`);
        throw error; // 直接抛出错误，不做复杂的回退处理
      }
    };
  }

  /**
   * 根据 MIME 类型获取图片文件扩展名
   * @param {string} contentType - MIME 类型
   * @returns {string} 文件扩展名
   */
  getImageExtension(contentType) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/tiff': 'tiff'
    };
    
    return mimeToExt[contentType] || 'png';
  }

  /**
   * 将 Word 文档转换为 HTML
   * @param {string} inputPath - Word 文档路径
   * @param {boolean} preserveImages - 是否保留图片（默认为 true）
   * @returns {Promise<string>} HTML 内容
   */
  async convertToHtml(inputPath, preserveImages = true) {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(inputPath)) {
        throw new Error(`文件不存在: ${inputPath}`);
      }

      // 检查文件扩展名
      const ext = path.extname(inputPath).toLowerCase();
      if (ext !== '.docx') {
        throw new Error(`不支持的文件格式: ${ext}，仅支持 .docx 文件`);
      }

      console.log(`正在转换 Word 文档: ${inputPath}`);

      // 读取 Word 文档
      const buffer = await fs.readFile(inputPath);
      
      let result;
      let conversionStrategy = '';
      
      // 策略1：优先使用默认处理 + 手动替换Base64图片（最稳定的方案）
      if (preserveImages) {
        try {
          console.log('🔄 使用默认处理 + 手动替换Base64图片（推荐方案）');
          const defaultOptions = {
            ignoreEmptyParagraphs: false
            // 不设置convertImage，让mammoth使用默认处理
          };
          result = await mammoth.convertToHtml(buffer, defaultOptions);
          conversionStrategy = '默认处理 + 手动替换';
          
          // 手动替换Base64图片为相对路径文件
          result.value = await this.replaceBase64WithFiles(result.value, inputPath);
          
          console.log('✅ 使用默认处理 + 手动替换转换成功');
        } catch (defaultError) {
          console.warn(`默认处理转换失败: ${defaultError.message}`);
          
          // 策略2：尝试使用自定义图片处理器（备用方案）
          try {
            console.log('🔄 尝试自定义图片处理器作为备用方案');
            const conversionOptions = await this.createSafeConversionOptions(inputPath, preserveImages);
            result = await mammoth.convertToHtml(buffer, conversionOptions);
            conversionStrategy = '自定义图片处理器（备用）';
            console.log('✅ 使用自定义图片处理器转换成功');
          } catch (mammothError) {
            console.warn(`自定义图片处理器转换失败: ${mammothError.message}`);
            
            // 策略3：最基本的配置（无图片处理）
            try {
              const basicOptions = {
                ignoreEmptyParagraphs: true,
                convertImage: mammoth.images.ignoreAll
              };
              result = await mammoth.convertToHtml(buffer, basicOptions);
              conversionStrategy = '基本配置（忽略图片）';
              console.log('✅ 使用基本配置转换成功（忽略图片）');
            } catch (basicError) {
              console.error(`所有转换尝试都失败了: ${basicError.message}`);
              throw new Error(`Word 文档转换失败，请检查文档格式是否正确: ${basicError.message}`);
            }
          }
        }
      } else {
        // 不保留图片时，直接使用基本配置
        const basicOptions = {
          ignoreEmptyParagraphs: false,
          convertImage: mammoth.images.ignoreAll
        };
        result = await mammoth.convertToHtml(buffer, basicOptions);
        conversionStrategy = '基本配置（不保留图片）';
        console.log('✅ 使用基本配置转换成功（不保留图片）');
      }
      
      // 检查是否有警告
      if (result.messages && result.messages.length > 0) {
        console.warn('转换警告:');
        result.messages.forEach(message => {
          console.warn(`- ${message.message}`);
        });
      }

      // 安全地增强HTML结构分析和标记
      let enhancedHtml;
      try {
        enhancedHtml = this.enhanceHtmlStructure(result.value);
      } catch (enhanceError) {
        console.warn(`HTML 增强处理出现错误，使用原始HTML: ${enhanceError.message}`);
        enhancedHtml = result.value;
      }

      // 格式化 HTML
      const formattedHtml = this.formatHtml(enhancedHtml);

      // 输出图片处理统计信息
      if (this.options.imageProcessing.showStats && preserveImages) {
        const stats = this.getImageProcessingStats();
        if (stats) {
          console.log('\n📊 图片处理统计信息:');
          console.log(`   总图片数: ${stats.totalImages}`);
          console.log(`   唯一图片数: ${stats.uniqueImages}`);
          console.log(`   缓存命中: ${stats.cacheHits}`);
          console.log(`   处理错误: ${stats.errors}`);
          console.log(`   总大小: ${stats.totalSizeFormatted}`);
          console.log(`   节省大小: ${stats.savedSizeFormatted}`);
          console.log(`   缓存命中率: ${stats.cacheHitRate}%`);
          console.log(`   重复率: ${stats.duplicateRate}%`);
          console.log(`   空间节省率: ${stats.spaceSavingRate}%`);
          console.log('');
        }
      }

      return formattedHtml;
    } catch (error) {
      console.error(`Word 转 HTML 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建安全的转换选项
   * @param {string} inputPath - 输入文件路径
   * @param {boolean} preserveImages - 是否保留图片
   * @returns {Promise<Object>} 转换选项
   */
  async createSafeConversionOptions(inputPath, preserveImages) {
    const conversionOptions = {
      // 基本选项
      ignoreEmptyParagraphs: false,
    };

    // 图片处理
    if (preserveImages) {
      try {
        // 使用改进的图片处理器
        conversionOptions.convertImage = await this.createImprovedImageHandler(inputPath);
        
        if (this.options.imageProcessing.useImprovedHandler) {
          console.log(`🚀 使用改进的图片处理器，支持智能去重和缓存`);
        } else {
          console.log(`图片将保存到: images/${path.basename(inputPath, path.extname(inputPath))}/`);
        }
      } catch (imageError) {
        console.warn(`图片处理器创建失败，忽略图片: ${imageError.message}`);
        conversionOptions.convertImage = mammoth.images.ignoreAll;
      }
    } else {
      conversionOptions.convertImage = mammoth.images.ignoreAll;
    }

    // 不添加样式映射，避免 h[e.type] 错误
    // 样式映射可能导致 mammoth 内部处理出错
    console.log('使用基本转换配置，避免样式映射冲突');

    return conversionOptions;
  }

  /**
   * 创建最小化的转换选项（用于错误恢复）
   * @param {string} inputPath - 输入文件路径
   * @param {boolean} preserveImages - 是否保留图片
   * @returns {Object} 最小化转换选项
   */
  createMinimalConversionOptions(inputPath, preserveImages) {
    const options = {
      // 最基本的选项
      ignoreEmptyParagraphs: true,
    };

    // 图片处理 - 使用简单的本地文件保存方式，绝不使用Base64
    if (preserveImages) {
      try {
        // 即使在错误恢复模式下，也使用本地文件保存
        options.convertImage = this.createImageHandler(inputPath);
        console.log('错误恢复模式：使用简单的本地文件保存');
      } catch (imageError) {
        console.warn(`错误恢复模式下图片处理器创建失败，忽略图片: ${imageError.message}`);
        options.convertImage = mammoth.images.ignoreAll;
      }
    } else {
      options.convertImage = mammoth.images.ignoreAll;
    }

    console.log('使用最小化转换配置进行错误恢复');
    return options;
  }

  /**
   * 增强HTML结构分析和标记
   * 识别不同类型的内容并添加语义化标记
   * 注意：只对正文内容进行标记，不对标题等结构性元素进行标记
   * @param {string} html - 原始HTML内容
   * @returns {string} 增强后的HTML内容
   */
  enhanceHtmlStructure(html) {
    try {
      // 使用正则表达式和启发式规则分析内容结构
      let enhancedHtml = html;

      // 1. 识别和标记列表项（仅限段落内容）- 添加错误处理
      try {
        enhancedHtml = this.markListItems(enhancedHtml);
      } catch (listError) {
        console.warn(`列表项标记失败: ${listError.message}`);
      }
      
      // 2. 识别和标记代码内容（仅限正文区域）- 添加错误处理
      try {
        enhancedHtml = this.markCodeContent(enhancedHtml);
      } catch (codeError) {
        console.warn(`代码内容标记失败: ${codeError.message}`);
      }
      
      // 3. 识别和标记段落类型（仅限段落内容）- 添加错误处理
      try {
        enhancedHtml = this.markParagraphTypes(enhancedHtml);
      } catch (paragraphError) {
        console.warn(`段落类型标记失败: ${paragraphError.message}`);
      }
      
      // 4. 为标题添加简单的语义类名（不影响内容标记）- 添加错误处理
      try {
        enhancedHtml = this.addHeadingClasses(enhancedHtml);
      } catch (headingError) {
        console.warn(`标题类名添加失败: ${headingError.message}`);
      }

      return enhancedHtml;
    } catch (error) {
      console.warn(`HTML 结构增强处理失败，返回原始HTML: ${error.message}`);
      return html;
    }
  }

  /**
   * 识别和标记列表项
   * 使用DOM解析来处理每个段落，充分利用DOM的层次结构特性
   * @param {string} html - HTML内容
   * @returns {string} 标记后的HTML
   */
  markListItems(html) {
    try {
      const { JSDOM } = require('jsdom');
      
      // 安全地创建 DOM
      let dom;
      try {
        dom = new JSDOM(html);
      } catch (domError) {
        console.warn(`JSDOM 创建失败: ${domError.message}`);
        return html; // 返回原始 HTML
      }
      
      const document = dom.window.document;
      
      // 安全地获取所有段落元素
      let paragraphs;
      try {
        paragraphs = Array.from(document.querySelectorAll('p'));
      } catch (queryError) {
        console.warn(`段落查询失败: ${queryError.message}`);
        return html; // 返回原始 HTML
      }
      
      // 分析段落的上下文关系来确定列表结构
      for (let i = 0; i < paragraphs.length; i++) {
        try {
          const p = paragraphs[i];
          
          // 跳过已经分类的段落
          if (p.classList && p.classList.contains('list-item')) {
            continue;
          }
          
          const textContent = p.textContent ? p.textContent.trim() : '';
          const htmlContent = p.innerHTML ? p.innerHTML.trim() : '';
          
          if (!textContent) continue;
          
          // 分析当前段落的特征
          const analysis = this.analyzeParagraphStructure(textContent, htmlContent, i, paragraphs);
          
          if (analysis.isListItem) {
            // 安全地设置列表项类名
            try {
              p.className = `list-item list-${analysis.listType} indent-${analysis.indentLevel}`;
              
              // 如果需要清理内容（移除项目符号等）
              if (analysis.cleanedContent) {
                p.innerHTML = analysis.cleanedContent;
              }
            } catch (classError) {
              console.warn(`设置段落类名失败: ${classError.message}`);
            }
          }
        } catch (paragraphError) {
          console.warn(`处理段落 ${i} 时出错: ${paragraphError.message}`);
          continue; // 继续处理下一个段落
        }
      }
      
      // 安全地序列化 DOM
      try {
        return dom.serialize();
      } catch (serializeError) {
        console.warn(`DOM 序列化失败: ${serializeError.message}`);
        return html; // 返回原始 HTML
      }
    } catch (error) {
      console.warn(`markListItems 处理失败: ${error.message}`);
      return html; // 返回原始 HTML
    }
  }

  /**
   * 分析段落结构，确定是否为列表项及其类型
   * @param {string} textContent - 纯文本内容
   * @param {string} htmlContent - HTML内容
   * @param {number} index - 段落索引
   * @param {Array} allParagraphs - 所有段落
   * @returns {Object} 分析结果
   */
  analyzeParagraphStructure(textContent, htmlContent, index, allParagraphs) {
    const result = {
      isListItem: false,
      listType: 'unordered',
      indentLevel: 0,
      cleanedContent: null
    };
    
    // 1. 检查是否以粗体开头（通常是主列表项）
    const boldStartMatch = htmlContent.match(/^<strong[^>]*>([^<]+)<\/strong>/i);
    if (boldStartMatch) {
      result.isListItem = true;
      result.indentLevel = 0; // 粗体开头通常是主列表项
      return result;
    }
    
    // 2. 检查项目符号模式
    const bulletPatterns = [
      { regex: /^([•·▪▫◦‣⁃○●◉◎⦿])\s*<strong[^>]*>([^<]+)<\/strong>(.*)/i, type: 'bullet-bold' },
      { regex: /^([•·▪▫◦‣⁃○●◉◎⦿])\s+(.+)/i, type: 'bullet' },
      { regex: /^([①②③④⑤⑥⑦⑧⑨⑩])\s+(.+)/i, type: 'numbered-circle' },
      { regex: /^([1-9]\d*)[.)]?\s+(.+)/i, type: 'numbered' },
      { regex: /^([a-zA-Z])[.)]?\s+(.+)/i, type: 'lettered' }
    ];
    
    for (const pattern of bulletPatterns) {
      const match = textContent.match(pattern.regex);
      if (match) {
        result.isListItem = true;
        
        if (pattern.type === 'bullet-bold') {
          // 项目符号+粗体 = 主列表项
          result.indentLevel = 0;
          result.listType = 'unordered';
          // 移除项目符号，保留粗体内容
          const htmlMatch = htmlContent.match(/^([•·▪▫◦‣⁃○●◉◎⦿])\s*(<strong[^>]*>.*)/i);
          if (htmlMatch) {
            result.cleanedContent = htmlMatch[2];
          }
        } else {
          // 普通项目符号 = 子列表项
          result.indentLevel = this.determineIndentLevel(textContent, index, allParagraphs);
          result.listType = this.mapPatternToListType(pattern.type);
        }
        break;
      }
    }
    
    // 3. 检查是否为连续列表项（基于上下文）
    if (!result.isListItem) {
      const contextAnalysis = this.analyzeListContext(textContent, index, allParagraphs);
      if (contextAnalysis.isListItem) {
        result.isListItem = true;
        result.indentLevel = contextAnalysis.indentLevel;
        result.listType = contextAnalysis.listType;
      }
    }
    
    return result;
  }

  /**
   * 确定缩进级别
   * @param {string} textContent - 文本内容
   * @param {number} index - 当前段落索引
   * @param {Array} allParagraphs - 所有段落
   * @returns {number} 缩进级别
   */
  determineIndentLevel(textContent, index, allParagraphs) {
    // 基于内容特征判断
    if (textContent.includes('：') || textContent.includes(':')) {
      return 0; // 包含冒号的通常是主项
    }
    
    // 基于长度判断
    if (textContent.length > 50) {
      return 0; // 较长的内容通常是主项
    }
    
    // 基于上下文判断
    const prevParagraph = index > 0 ? allParagraphs[index - 1] : null;
    if (prevParagraph && prevParagraph.classList.contains('list-item')) {
      const prevIndent = prevParagraph.className.match(/indent-(\d+)/);
      if (prevIndent) {
        return Math.min(parseInt(prevIndent[1]) + 1, 2); // 最大缩进2级
      }
    }
    
    return 1; // 默认为子项
  }

  /**
   * 分析列表上下文
   * @param {string} textContent - 文本内容
   * @param {number} index - 当前段落索引
   * @param {Array} allParagraphs - 所有段落
   * @returns {Object} 上下文分析结果
   */
  analyzeListContext(textContent, index, allParagraphs) {
    const result = { isListItem: false, indentLevel: 1, listType: 'unordered' };
    
    // 检查前后段落是否为列表项
    const prevParagraph = index > 0 ? allParagraphs[index - 1] : null;
    const nextParagraph = index < allParagraphs.length - 1 ? allParagraphs[index + 1] : null;
    
    const prevIsListItem = prevParagraph && prevParagraph.classList.contains('list-item');
    const nextIsListItem = nextParagraph && this.looksLikeListItem(nextParagraph.textContent);
    
    // 如果前后都是列表项，且当前段落较短，可能也是列表项
    if ((prevIsListItem || nextIsListItem) && textContent.length < 100) {
      result.isListItem = true;
    }
    
    return result;
  }

  /**
   * 检查文本是否看起来像列表项
   * @param {string} text - 文本内容
   * @returns {boolean} 是否像列表项
   */
  looksLikeListItem(text) {
    const listPatterns = [
      /^[•·▪▫◦‣⁃○●◉◎⦿]/,
      /^[①②③④⑤⑥⑦⑧⑨⑩]/,
      /^[1-9]\d*[.)]?\s/,
      /^[a-zA-Z][.)]?\s/
    ];
    
    return listPatterns.some(pattern => pattern.test(text.trim()));
  }

  /**
   * 将模式类型映射到列表类型
   * @param {string} patternType - 模式类型
   * @returns {string} 列表类型
   */
  mapPatternToListType(patternType) {
    const mapping = {
      'bullet': 'unordered',
      'bullet-bold': 'unordered',
      'numbered': 'numbered',
      'numbered-circle': 'numbered-circle',
      'lettered': 'lettered'
    };
    
    return mapping[patternType] || 'unordered';
  }

  /**
   * 识别和标记代码内容
   * 只在段落（<p>）和列表项内容中进行技术术语标记，不在标题中标记
   * @param {string} html - HTML内容
   * @returns {string} 标记后的HTML
   */
  markCodeContent(html) {
    // 技术词汇列表 - 按照标准文件的格式
    const techTerms = [
      // 编程语言和技术 - 使用标准文件中的格式
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP',
      'html', 'CSS', 'JSON', 'XML', 'YAML', 'SQL', 'NoSQL', 'GraphQL',  // html 小写
      
      // 框架和库
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Koa', 'Nest.js',
      'mammoth', 'turndown', 'fs-extra', 'commander', 'chalk', 'lodash',
      
      // 工具和平台 - 使用标准文件中的格式
      'npm', 'yarn', 'webpack', 'vite', 'babel', 'eslint', 'prettier',
      'Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'AWS', 'Azure',
      'markdown', 'node', 'js',  // 添加标准文件中的格式
      
      // 文件扩展名
      '\\.js', '\\.ts', '\\.jsx', '\\.tsx', '\\.vue', '\\.py', '\\.java',
      '\\.docx', '\\.md', '\\.html', '\\.css', '\\.json', '\\.xml',
      
      // 类名和方法名（驼峰命名）
      'WordToHtmlConverter', 'HtmlToMarkdownConverter', 'WordToMarkdownConverter',
      'FileUtils', 'Logger', 'ProgressBar', 'convertToHtml', 'convertToMarkdown',
      
      // 配置选项
      'preserveImages', 'preserveTables', 'headingStyle', 'codeBlockStyle',
      'bulletListMarker', 'verbose', 'atx', 'setext', 'fenced', 'indented',
      
      // 命令行工具
      'worldtomd convert', 'worldtomd batch', 'worldtomd preview', 'worldtomd info',
      'code'  // 添加 code 标签
    ];

    // 只在段落标签内进行技术词汇标记
    html = html.replace(/(<p[^>]*>)(.*?)<\/p>/gi, (match, openTag, content) => {
      let processedContent = content;
      
      // 为技术词汇添加代码标记，但要避免重复标记
      techTerms.forEach(term => {
        // 跳过已经被标记的内容
        if (processedContent.includes(`<code class="tech-term">${term}</code>`)) {
          return;
        }
        
        // 创建正则表达式，确保不会标记已经在HTML标签内的内容
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        // 先检查是否已经在code标签内
        const codeTagRegex = /<code[^>]*>.*?<\/code>/gi;
        const codeTags = processedContent.match(codeTagRegex) || [];
        
        processedContent = processedContent.replace(regex, (match) => {
          // 检查这个匹配是否在已存在的code标签内
          for (let codeTag of codeTags) {
            if (codeTag.includes(match)) {
              return match; // 不替换已经在code标签内的内容
            }
          }
          // 清理匹配内容中的换行符和多余空格
          const cleanMatch = match.replace(/\s+/g, ' ').trim();
          return `<code class="tech-term">${cleanMatch}</code>`;
        });
      });
      
      return openTag + processedContent + '</p>';
    });

    // 识别代码块（多行代码段落）
    html = html.replace(/(<p[^>]*>)((?:.*\n){2,}.*)<\/p>/gi, (match, openTag, content) => {
      if (this.isCodeBlock(content)) {
        return `<pre class="code-block">${content}</pre>`;
      }
      return match;
    });

    // 清理所有code标签中的换行符和多余空格
    html = html.replace(/<code([^>]*)>(.*?)<\/code>/gi, (match, attributes, content) => {
      const cleanContent = content.replace(/\s+/g, ' ').trim();
      return `<code${attributes}>${cleanContent}</code>`;
    });

    return html;
  }

  /**
   * 识别和标记段落类型
   * @param {string} html - HTML内容
   * @returns {string} 标记后的HTML
   */
  markParagraphTypes(html) {
    return html.replace(/(<p[^>]*>)([^<]*(?:<[^>]*>[^<]*)*)<\/p>/gi, (match, openTag, content) => {
      const paragraphType = this.detectParagraphType(content);
      
      if (paragraphType !== 'normal') {
        return openTag.replace('>', ` class="paragraph-${paragraphType}">`) + content + '</p>';
      }
      
      return match;
    });
  }

  /**
   * 为标题添加简单的语义类名
   * 不对标题内容进行特殊标记，只添加结构性的类名
   * @param {string} html - HTML内容
   * @returns {string} 标记后的HTML
   */
  addHeadingClasses(html) {
    // 直接替换标题标签，避免class属性重复问题
    html = html.replace(/<h1[^>]*>/gi, '<h1 class="heading-main">');
    html = html.replace(/<h2[^>]*>/gi, '<h2 class="heading-section">');
    html = html.replace(/<h3[^>]*>/gi, '<h3 class="heading-subsection">');
    html = html.replace(/<h4[^>]*>/gi, '<h4 class="heading-sub">');
    html = html.replace(/<h5[^>]*>/gi, '<h5 class="heading-minor">');
    html = html.replace(/<h6[^>]*>/gi, '<h6 class="heading-detail">');
    
    return html;
  }

  /**
   * 检测缩进级别
   * @param {string} content - 内容
   * @returns {number} 缩进级别
   */
  detectIndentLevel(content) {
    // 基于内容长度和复杂度判断缩进级别
    const trimmed = content.trim();
    
    if (trimmed.length < 30 && !trimmed.includes('：') && !trimmed.includes(':')) {
      return 1; // 可能是子项
    }
    
    return 0; // 主项
  }

  /**
   * 检测列表类型
   * @param {string} bullet - 项目符号
   * @returns {string} 列表类型
   */
  detectListType(bullet) {
    if (/[•·▪▫◦‣⁃○●◉◎⦿]/.test(bullet)) {
      return 'unordered';
    } else if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(bullet)) {
      return 'numbered-circle';
    } else if (/[1-9]\d*[.)]/.test(bullet)) {
      return 'numbered';
    } else if (/[a-zA-Z][.)]/.test(bullet)) {
      return 'lettered';
    }
    
    return 'unordered';
  }

  /**
   * 判断是否为代码块
   * @param {string} content - 内容
   * @returns {boolean} 是否为代码块
   */
  isCodeBlock(content) {
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /{[\s\S]*}/,
      /\[\s*\]/,
      /=>\s*{/,
      /console\./,
      /require\(/,
      /module\.exports/
    ];

    return codeIndicators.some(pattern => pattern.test(content));
  }

  /**
   * 检测段落类型
   * @param {string} content - 段落内容
   * @returns {string} 段落类型
   */
  detectParagraphType(content) {
    const trimmed = content.trim();
    
    // 引用段落
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return 'quote';
    }
    
    // 注释段落
    if (trimmed.startsWith('注：') || trimmed.startsWith('备注：') || trimmed.startsWith('说明：')) {
      return 'note';
    }
    
    // 警告段落
    if (trimmed.includes('警告') || trimmed.includes('注意') || trimmed.includes('重要')) {
      return 'warning';
    }
    
    // 示例段落
    if (trimmed.startsWith('例如') || trimmed.startsWith('示例') || trimmed.includes('例子')) {
      return 'example';
    }
    
    return 'normal';
  }

  /**
   * 将 Word 文档转换为 HTML 并保存到文件
   * @param {string} inputPath - Word 文档路径
   * @param {string} outputPath - 输出 HTML 文件路径
   * @param {boolean} preserveImages - 是否保留图片（默认为 true）
   * @returns {Promise<string>} 输出文件路径
   */
  async convertToHtmlFile(inputPath, outputPath, preserveImages = true) {
    try {
      const html = await this.convertToHtml(inputPath, preserveImages);
      
      // 确保输出目录存在
      await fs.ensureDir(path.dirname(outputPath));
      
      // 保存 HTML 文件
      await fs.writeFile(outputPath, html, 'utf8');
      console.log(`HTML 文件已保存: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`保存 HTML 文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 格式化 HTML 代码
   * @param {string} html - 原始HTML
   * @returns {string} 格式化后的HTML
   */
  formatHtml(html) {
    // 只进行基本的清理，不添加缩进，避免在内容前添加空格
    let formatted = html
      .replace(/\n\s*\n/g, '\n')  // 移除多余的空行
      .replace(/\s+/g, ' ')       // 将多个空格合并为一个
      .trim();
    
    // 块级元素
    const blockElements = ['html', 'head', 'body', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'pre', 'blockquote'];
    
    // 分割标签和内容
    const parts = [];
    let current = '';
    let inTag = false;
    
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      
      if (char === '<') {
        if (current.trim()) {
          parts.push({ type: 'text', content: current.trim() });
        }
        current = '<';
        inTag = true;
      } else if (char === '>' && inTag) {
        current += '>';
        parts.push({ type: 'tag', content: current });
        current = '';
        inTag = false;
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      parts.push({ type: 'text', content: current.trim() });
    }
    
    // 格式化输出 - 只添加换行，不添加缩进空格
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.type === 'tag') {
        const isClosingTag = part.content.startsWith('</');
        const tagName = part.content.match(/<\/?([a-zA-Z0-9]+)/)?.[1]?.toLowerCase();
        const isBlockElement = blockElements.includes(tagName);
        
        if (isClosingTag && isBlockElement) {
          result.push('\n' + part.content);
        } else if (isBlockElement) {
          result.push('\n' + part.content);
        } else {
          result.push(part.content);
        }
      } else {
        // 文本内容
        result.push(part.content);
      }
    }
    
    return result.join('').trim();
  }
  async getDocumentInfo(inputPath) {
    try {
      const buffer = await fs.readFile(inputPath);
      const result = await mammoth.extractRawText(buffer);
      
      const stats = await fs.stat(inputPath);
      
      return {
        path: inputPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        textLength: result.value.length,
        hasImages: result.messages.some(msg => msg.type === 'image'),
        warnings: result.messages.length
      };
    } catch (error) {
      console.error(`获取文档信息失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = WordToHtmlConverter;