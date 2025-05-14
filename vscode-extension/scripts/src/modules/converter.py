"""
转换器主模块
提供从Markdown到Word的完整转换功能
"""

import os
import codecs
from typing import Dict, Any, Optional, List, Union
from docx import Document

# 使用try-except处理不同的导入场景
try:
    # 相对导入（作为包的一部分被导入时）
    from .markdown_to_html import MarkdownToHtml
    from .html_to_word import HtmlToWordConverter
    from .html_elements_processor import HtmlElementsProcessor
except ImportError:
    try:
        # 绝对导入
        from src.modules.markdown_to_html import MarkdownToHtml
        from src.modules.html_to_word import HtmlToWordConverter
        from src.modules.html_elements_processor import HtmlElementsProcessor
    except ImportError:
        # 从当前目录导入
        from markdown_to_html import MarkdownToHtml
        from html_to_word import HtmlToWordConverter
        from html_elements_processor import HtmlElementsProcessor

class Converter:
    """
    /**
     * 转换器主类
     * 
     * 整合Markdown到HTML和HTML到Word的转换功能，
     * 提供完整的文档转换流程
     */
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        /**
         * 初始化转换器
         * 
         * @param {Dict[str, Any]} config - 配置参数字典
         */
        """
        self.config = config
        self.md_to_html = MarkdownToHtml(config)
        self.html_to_word = HtmlToWordConverter(config)
        self.html_processor = HtmlElementsProcessor(config)
        
    def convert_file(self, input_file: str, output_file: str, keep_html: bool = False) -> Document:
        """
        /**
         * 转换单个Markdown文件为Word文档
         * 
         * @param {str} input_file - 输入Markdown文件路径
         * @param {str} output_file - 输出Word文件路径
         * @param {bool} keep_html - 是否保留中间HTML文件
         * @returns {Document} 生成的Word文档对象
         */
        """
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"输入文件不存在: {input_file}")
            
        # 确定HTML中间文件路径
        html_file = None
        if keep_html:
            base_name = os.path.basename(os.path.splitext(input_file)[0])
            # 指向根目录的html文件夹
            html_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "html")
            os.makedirs(html_dir, exist_ok=True)
            html_file = os.path.join(html_dir, f"{base_name}.html")
            
        # 转换Markdown到HTML
        html_content = self.md_to_html.convert_file(input_file, html_file)
        
        # 转换HTML到Word
        if html_file:
            doc = self.html_to_word.convert_file(html_file, output_file)
        else:
            doc = self.html_to_word.convert_html(html_content)
            doc.save(output_file)
            
        return doc
        
    def convert_text(self, md_content: str, output_file: Optional[str] = None) -> Union[str, Document]:
        """
        /**
         * 转换Markdown文本内容
         * 
         * @param {str} md_content - Markdown格式的文本
         * @param {Optional[str]} output_file - 输出Word文件路径，如果不提供则不保存文件
         * @returns {Union[str, Document]} 如果提供output_file则返回Document对象，否则返回HTML内容
         */
        """
        # 转换Markdown到HTML
        html_content = self.md_to_html.convert_text(md_content)
        
        # 如果没有指定输出文件，直接返回HTML内容
        if not output_file:
            return html_content
            
        # 转换HTML到Word并保存
        doc = self.html_to_word.convert_html(html_content)
        doc.save(output_file)
        
        return doc
        
    def batch_convert(self, input_dir: str, output_dir: str, keep_html: bool = False) -> Dict[str, bool]:
        """
        /**
         * 批量转换目录中的Markdown文件
         * 
         * @param {str} input_dir - 输入目录路径
         * @param {str} output_dir - 输出目录路径
         * @param {bool} keep_html - 是否保留中间HTML文件
         * @returns {Dict[str, bool]} 文件转换结果字典，键为文件名，值为转换是否成功
         */
        """
        if not os.path.exists(input_dir):
            raise FileNotFoundError(f"输入目录不存在: {input_dir}")
            
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 如果保留HTML文件，创建/使用根目录下的HTML目录
        html_dir = None
        if keep_html:
            # 指向根目录的html文件夹
            html_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "html")
            os.makedirs(html_dir, exist_ok=True)
            
        # 查找所有Markdown文件
        results = {}
        files = self._find_markdown_files(input_dir)
        
        # 转换每个文件
        total_files = len(files)
        for idx, file_path in enumerate(files, 1):
            # 计算相对路径，用于构建输出路径
            rel_path = os.path.relpath(file_path, input_dir)
            file_base_name = os.path.basename(os.path.splitext(rel_path)[0])
            base_name = os.path.splitext(rel_path)[0]
            
            # 构建输出文件路径
            output_file = os.path.join(output_dir, f"{base_name}.docx")
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            # 构建HTML文件路径（如果需要）
            html_file = None
            if keep_html:
                html_file = os.path.join(html_dir, f"{file_base_name}.html")
                
            # 转换文件并记录结果
            try:
                # 输出进度信息
                print(f"处理文件 {idx}/{total_files}: {rel_path}")
                
                # 转换Markdown到HTML
                html_content = self.md_to_html.convert_file(file_path, html_file)
                
                # 转换HTML到Word
                if html_file:
                    doc = self.html_to_word.convert_file(html_file, output_file)
                else:
                    doc = self.html_to_word.convert_html(html_content)
                    doc.save(output_file)
                    
                results[rel_path] = True
                print(f"  完成: {output_file}")
                
            except Exception as e:
                results[rel_path] = False
                print(f"  失败: {str(e)}")
                
        # 输出统计信息
        success_count = sum(1 for v in results.values() if v)
        print(f"\n转换完成: 共 {total_files} 个文件, 成功 {success_count} 个, 失败 {total_files - success_count} 个")
        
        return results
    
    def _find_markdown_files(self, directory: str) -> List[str]:
        """
        /**
         * 在目录中查找所有Markdown文件
         * 
         * @param {str} directory - 要搜索的目录
         * @returns {List[str]} Markdown文件路径列表
         */
        """
        md_files = []
        
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(('.md', '.markdown')):
                    md_files.append(os.path.join(root, file))
                    
        return md_files
    
    def cleanup(self):
        """
        /**
         * 清理临时资源
         */
        """
        # 清理HTML处理器的临时资源
        self.html_processor.cleanup() 