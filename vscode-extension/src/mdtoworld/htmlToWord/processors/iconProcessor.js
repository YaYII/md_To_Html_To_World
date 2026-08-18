const { TextRun } = require('docx');

/**
 * @class IconProcessor
 * @description 处理HTML中图标元素的类
 */
class IconProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    
    // 图标字体映射表 - 将CSS类名映射到Unicode字符
    this.iconMappings = {
      // Font Awesome 常用图标
      'fa-home': '🏠',
      'fa-user': '👤', 
      'fa-search': '🔍',
      'fa-envelope': '✉️',
      'fa-phone': '📞',
      'fa-heart': '❤️',
      'fa-star': '⭐',
      'fa-check': '✅',
      'fa-times': '❌',
      'fa-plus': '➕',
      'fa-minus': '➖',
      'fa-info': 'ℹ️',
      'fa-warning': '⚠️',
      'fa-exclamation': '❗',
      'fa-question': '❓',
      'fa-edit': '✏️',
      'fa-trash': '🗑️',
      'fa-download': '⬇️',
      'fa-upload': '⬆️',
      'fa-print': '🖨️',
      'fa-save': '💾',
      'fa-settings': '⚙️',
      'fa-gear': '⚙️',
      'fa-cog': '⚙️',
      'fa-lock': '🔒',
      'fa-unlock': '🔓',
      'fa-eye': '👁️',
      'fa-eye-slash': '🙈',
      'fa-calendar': '📅',
      'fa-clock': '🕐',
      'fa-location': '📍',
      'fa-map': '🗺️',
      'fa-car': '🚗',
      'fa-plane': '✈️',
      'fa-train': '🚂',
      'fa-ship': '🚢',
      'fa-shopping-cart': '🛒',
      'fa-money': '💰',
      'fa-credit-card': '💳',
      'fa-file': '📄',
      'fa-folder': '📁',
      'fa-image': '🖼️',
      'fa-video': '🎥',
      'fa-music': '🎵',
      'fa-comment': '💬',
      'fa-comments': '💬',
      'fa-thumbs-up': '👍',
      'fa-thumbs-down': '👎',
      'fa-share': '📤',
      'fa-link': '🔗',
      'fa-external-link': '🔗',
      'fa-refresh': '🔄',
      'fa-sync': '🔄',
      'fa-spinner': '⟳',
      'fa-loading': '⟳',
      
      // Material Icons 常用图标
      'material-icons': {
        'home': '🏠',
        'person': '👤',
        'search': '🔍',
        'email': '✉️',
        'phone': '📞',
        'favorite': '❤️',
        'star': '⭐',
        'check': '✅',
        'close': '❌',
        'add': '➕',
        'remove': '➖',
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌',
        'help': '❓',
        'edit': '✏️',
        'delete': '🗑️',
        'download': '⬇️',
        'upload': '⬆️',
        'print': '🖨️',
        'save': '💾',
        'settings': '⚙️',
        'lock': '🔒',
        'visibility': '👁️',
        'visibility_off': '🙈',
        'calendar_today': '📅',
        'schedule': '🕐',
        'location_on': '📍',
        'map': '🗺️',
        'directions_car': '🚗',
        'flight': '✈️',
        'train': '🚂',
        'shopping_cart': '🛒',
        'attach_money': '💰',
        'credit_card': '💳',
        'description': '📄',
        'folder': '📁',
        'image': '🖼️',
        'videocam': '🎥',
        'music_note': '🎵',
        'comment': '💬',
        'thumb_up': '👍',
        'thumb_down': '👎',
        'share': '📤',
        'link': '🔗',
        'refresh': '🔄',
        'sync': '🔄'
      },
      
      // Bootstrap Icons
      'bi-house': '🏠',
      'bi-person': '👤',
      'bi-search': '🔍',
      'bi-envelope': '✉️',
      'bi-telephone': '📞',
      'bi-heart': '❤️',
      'bi-star': '⭐',
      'bi-check': '✅',
      'bi-x': '❌',
      'bi-plus': '➕',
      'bi-dash': '➖',
      'bi-info-circle': 'ℹ️',
      'bi-exclamation-triangle': '⚠️',
      'bi-question-circle': '❓',
      'bi-pencil': '✏️',
      'bi-trash': '🗑️',
      'bi-download': '⬇️',
      'bi-upload': '⬆️',
      'bi-printer': '🖨️',
      'bi-save': '💾',
      'bi-gear': '⚙️',
      'bi-lock': '🔒',
      'bi-eye': '👁️',
      'bi-calendar': '📅',
      'bi-clock': '🕐',
      'bi-geo-alt': '📍',
      'bi-map': '🗺️',
      'bi-car-front': '🚗',
      'bi-airplane': '✈️',
      'bi-cart': '🛒',
      'bi-currency-dollar': '💰',
      'bi-credit-card': '💳',
      'bi-file-text': '📄',
      'bi-folder': '📁',
      'bi-image': '🖼️',
      'bi-camera-video': '🎥',
      'bi-music-note': '🎵',
      'bi-chat': '💬',
      'bi-hand-thumbs-up': '👍',
      'bi-hand-thumbs-down': '👎',
      'bi-share': '📤',
      'bi-link': '🔗',
      'bi-arrow-clockwise': '🔄'
    };
    
    // 默认图标字体配置
    this.defaultIconFont = 'Segoe UI Emoji';
  }

  /**
   * @method isIconElement
   * @description 判断是否是图标元素
   * @param {Cheerio} $el - Cheerio元素
   * @returns {boolean} 是否是图标元素
   */
  isIconElement($el) {
    const tagName = $el.prop('tagName')?.toLowerCase();
    const className = $el.attr('class') || '';
    const text = $el.text().trim();
    
    // 检查常见的图标标识
    const iconIndicators = [
      // Font Awesome
      'fa ', 'fas ', 'far ', 'fab ', 'fal ', 'fad ',
      // Material Icons
      'material-icons', 'material-icons-outlined', 'material-icons-round',
      // Bootstrap Icons
      'bi ', 'bi-',
      // Ionicons
      'ion-', 'ionicon',
      // Feather Icons
      'feather',
      // Heroicons
      'heroicon',
      // Tabler Icons
      'tabler-icon',
      // Lucide
      'lucide',
      // 其他常见图标库
      'icon-', 'iconfont', 'glyphicon'
    ];
    
    // 1. 检查是否有图标相关的CSS类
    const hasIconClass = iconIndicators.some(indicator => 
      className.includes(indicator)
    );
    
    // 2. 检查是否是空的 i 或 span 标签（通常用于图标）
    const isEmptyIconTag = (tagName === 'i' || tagName === 'span') && 
                          !text && 
                          className;
    
    // 3. 检查是否包含Unicode图标字符
    const hasUnicodeIcon = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
    
    return hasIconClass || isEmptyIconTag || hasUnicodeIcon;
  }

  /**
   * @method extractIconUnicode
   * @description 从图标元素中提取Unicode字符
   * @param {Cheerio} $el - Cheerio元素
   * @returns {string|null} Unicode字符或null
   */
  extractIconUnicode($el) {
    const className = $el.attr('class') || '';
    const text = $el.text().trim();
    
    // 1. 如果元素已经包含Unicode字符，直接返回
    if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text)) {
      return text;
    }
    
    // 2. 检查Font Awesome图标类
    for (const [faClass, unicode] of Object.entries(this.iconMappings)) {
      if (typeof unicode === 'string' && className.includes(faClass)) {
        return unicode;
      }
    }
    
    // 3. 检查Material Icons
    if (className.includes('material-icons')) {
      const materialIconName = text.toLowerCase().replace(/[_-]/g, '_');
      const materialIcon = this.iconMappings['material-icons'][materialIconName];
      if (materialIcon) {
        return materialIcon;
      }
    }
    
    // 4. 检查Bootstrap Icons
    const biMatch = className.match(/bi-([a-z-]+)/);
    if (biMatch) {
      const biClass = `bi-${biMatch[1]}`;
      const biIcon = this.iconMappings[biClass];
      if (biIcon) {
        return biIcon;
      }
    }
    
    // 5. 检查其他常见图标模式
    const iconPatterns = [
      /fa-([a-z-]+)/,
      /icon-([a-z-]+)/,
      /glyphicon-([a-z-]+)/
    ];
    
    for (const pattern of iconPatterns) {
      const match = className.match(pattern);
      if (match) {
        const iconName = match[1];
        // 尝试找到对应的Unicode字符
        const mappedIcon = this.iconMappings[`fa-${iconName}`] || 
                          this.iconMappings[`icon-${iconName}`] ||
                          this.iconMappings[`glyphicon-${iconName}`];
        if (mappedIcon) {
          return mappedIcon;
        }
      }
    }
    
    return null;
  }

  /**
   * @method processIcon
   * @description 处理图标元素
   * @param {Cheerio} $el - Cheerio元素
   * @returns {TextRun|null} TextRun对象或null
   */
  processIcon($el) {
    if (!this.isIconElement($el)) {
      return null;
    }
    
    const unicodeIcon = this.extractIconUnicode($el);
    
    if (unicodeIcon) {
      // 获取字体配置（配置已由 defaultConfig 保证非空）
      const { fonts: fontsConfig, sizes: sizesConfig, colors: colorsConfig } = this.config;
      
      return new TextRun({
        text: unicodeIcon,
        font: {
          name: fontsConfig.icon
        },
        size: sizesConfig.icon * 2,
        color: colorsConfig.icon.replace('#', '')
      });
    }
    
    // 如果无法转换为Unicode，返回一个占位符
    const className = $el.attr('class') || '';
    const fallbackText = `[图标: ${className}]`;
    
    return new TextRun({
      text: fallbackText,
      font: {
        name: this.config.fonts.default
      },
      size: this.config.sizes.default * 2,
      color: '#666666'
    });
  }
}

module.exports = IconProcessor; 