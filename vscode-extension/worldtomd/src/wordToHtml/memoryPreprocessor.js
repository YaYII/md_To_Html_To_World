const fs = require('fs-extra');
const path = require('path');

/**
 * 内存预处理器 - 文档转换前的智能内存管理系统
 * 基于策略文档实现的完整内存优化解决方案
 */
class MemoryPreprocessor {
  constructor(options = {}) {
    this.options = {
      // 内存阈值配置
      memoryWarningThreshold: options.memoryWarningThreshold || 0.7, // 70%内存使用率警告
      memoryCriticalThreshold: options.memoryCriticalThreshold || 0.85, // 85%内存使用率危险
      maxHeapSize: options.maxHeapSize || this.getMaxHeapSize(),
      
      // 垃圾回收配置
      enableAutoGC: options.enableAutoGC !== false, // 默认启用
      gcInterval: options.gcInterval || 5000, // 5秒间隔
      forceGCThreshold: options.forceGCThreshold || 0.8, // 80%时强制GC
      
      // 缓存管理配置
      enableCacheClearing: options.enableCacheClearing !== false,
      maxCacheAge: options.maxCacheAge || 300000, // 5分钟缓存过期
      
      // 监控配置
      enableDetailedLogging: options.enableDetailedLogging || true,
      enableMemoryReports: options.enableMemoryReports || true,
      
      // 预处理配置
      enablePreprocessing: options.enablePreprocessing !== false,
      preprocessingTimeout: options.preprocessingTimeout || 30000, // 30秒超时
    };
    
    this.memoryStats = {
      initialMemory: 0,
      currentMemory: 0,
      peakMemory: 0,
      gcCount: 0,
      cacheClears: 0,
      preprocessingCount: 0,
      lastGCTime: 0,
      lastCacheClear: 0
    };
    
    this.cacheRegistry = new Map();
    this.gcTimer = null;
    this.isPreprocessing = false;
    
    // 初始化内存监控
    this.initializeMemoryMonitoring();
  }
  
  /**
   * 获取系统最大堆内存大小
   */
  getMaxHeapSize() {
    try {
      // 尝试从V8获取堆限制
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return heapStats.heap_size_limit || 1.4 * 1024 * 1024 * 1024; // 默认1.4GB
    } catch (error) {
      // 如果V8不可用，使用默认值
      return 1.4 * 1024 * 1024 * 1024; // 1.4GB
    }
  }
  
  /**
   * 初始化内存监控系统
   */
  initializeMemoryMonitoring() {
    this.memoryStats.initialMemory = process.memoryUsage().heapUsed;
    
    if (this.options.enableAutoGC) {
      this.startAutoGC();
    }
    
    if (this.options.enableDetailedLogging) {
      console.log('🧠 内存预处理器已启动');
      console.log(`   最大堆内存: ${(this.options.maxHeapSize / 1024 / 1024).toFixed(0)}MB`);
      console.log(`   警告阈值: ${(this.options.memoryWarningThreshold * 100).toFixed(0)}%`);
      console.log(`   危险阈值: ${(this.options.memoryCriticalThreshold * 100).toFixed(0)}%`);
    }
  }
  
  /**
   * 启动自动垃圾回收
   */
  startAutoGC() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    this.gcTimer = setInterval(() => {
      this.performMemoryCheck();
    }, this.options.gcInterval);
  }
  
  /**
   * 停止自动垃圾回收
   */
  stopAutoGC() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }
  
  /**
   * 执行内存检查和自动优化
   */
  performMemoryCheck() {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const memoryRatio = heapUsed / this.options.maxHeapSize;
    
    this.memoryStats.currentMemory = heapUsed;
    if (heapUsed > this.memoryStats.peakMemory) {
      this.memoryStats.peakMemory = heapUsed;
    }
    
    // 检查是否需要强制垃圾回收
    if (memoryRatio >= this.options.forceGCThreshold) {
      this.forceGarbageCollection('高内存使用率触发');
    }
    
    // 检查是否需要清理缓存
    if (memoryRatio >= this.options.memoryWarningThreshold) {
      this.clearExpiredCaches();
    }
    
    // 内存警告
    if (memoryRatio >= this.options.memoryCriticalThreshold) {
      console.warn(`⚠️  内存使用率过高: ${(memoryRatio * 100).toFixed(1)}% (${(heapUsed / 1024 / 1024).toFixed(1)}MB)`);
    }
  }
  
  /**
   * 强制执行垃圾回收
   */
  forceGarbageCollection(reason = '手动触发') {
    if (!global.gc) {
      console.warn('⚠️  垃圾回收不可用，请使用 --expose-gc 参数启动 Node.js');
      return false;
    }
    
    const beforeMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    
    try {
      global.gc();
      
      const afterMemory = process.memoryUsage().heapUsed;
      const freedMemory = beforeMemory - afterMemory;
      const gcTime = Date.now() - startTime;
      
      this.memoryStats.gcCount++;
      this.memoryStats.lastGCTime = Date.now();
      
      if (this.options.enableDetailedLogging) {
        console.log(`🧹 垃圾回收完成 (${reason})`);
        console.log(`   释放内存: ${(freedMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   耗时: ${gcTime}ms`);
        console.log(`   当前内存: ${(afterMemory / 1024 / 1024).toFixed(2)}MB`);
      }
      
      return true;
    } catch (error) {
      console.error(`垃圾回收失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 清理过期缓存
   */
  clearExpiredCaches() {
    const now = Date.now();
    let clearedCount = 0;
    let freedMemory = 0;
    
    for (const [key, cacheItem] of this.cacheRegistry.entries()) {
      if (now - cacheItem.timestamp > this.options.maxCacheAge) {
        freedMemory += this.estimateCacheSize(cacheItem.data);
        this.cacheRegistry.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      this.memoryStats.cacheClears++;
      this.memoryStats.lastCacheClear = now;
      
      if (this.options.enableDetailedLogging) {
        console.log(`🗑️  清理过期缓存: ${clearedCount}项，估算释放 ${(freedMemory / 1024).toFixed(1)}KB`);
      }
    }
  }
  
  /**
   * 估算缓存项大小
   */
  estimateCacheSize(data) {
    try {
      if (typeof data === 'string') {
        return data.length * 2; // Unicode字符估算
      } else if (Buffer.isBuffer(data)) {
        return data.length;
      } else if (typeof data === 'object') {
        return JSON.stringify(data).length * 2;
      }
      return 100; // 默认估算
    } catch {
      return 100;
    }
  }
  
  /**
   * 注册缓存项
   */
  registerCache(key, data) {
    if (!this.options.enableCacheClearing) return;
    
    this.cacheRegistry.set(key, {
      data: data,
      timestamp: Date.now(),
      size: this.estimateCacheSize(data)
    });
  }
  
  /**
   * 清理所有缓存
   */
  clearAllCaches() {
    const cacheCount = this.cacheRegistry.size;
    this.cacheRegistry.clear();
    
    if (this.options.enableDetailedLogging && cacheCount > 0) {
      console.log(`🗑️  清理所有缓存: ${cacheCount}项`);
    }
  }
  
  /**
   * 文档转换前的完整预处理
   */
  async preprocessBeforeConversion(filePath, options = {}) {
    if (this.isPreprocessing) {
      console.warn('⚠️  预处理正在进行中，跳过重复调用');
      return;
    }
    
    this.isPreprocessing = true;
    this.memoryStats.preprocessingCount++;
    
    try {
      console.log('🚀 开始文档转换前预处理...');
      
      // 1. 内存状态评估
      const memoryAssessment = await this.assessMemoryState(filePath);
      
      // 2. 主动垃圾回收
      if (memoryAssessment.needsGC) {
        this.forceGarbageCollection('预处理阶段');
      }
      
      // 3. 缓存清理
      if (memoryAssessment.needsCacheClearing) {
        this.clearExpiredCaches();
        if (memoryAssessment.criticalMemory) {
          this.clearAllCaches();
        }
      }
      
      // 4. 系统资源检查
      await this.checkSystemResources();
      
      // 5. 生成预处理报告
      const report = this.generatePreprocessingReport(memoryAssessment);
      
      if (this.options.enableDetailedLogging) {
        console.log('✅ 预处理完成');
        console.log(report);
      }
      
      return report;
      
    } catch (error) {
      console.error(`预处理失败: ${error.message}`);
      throw error;
    } finally {
      this.isPreprocessing = false;
    }
  }
  
  /**
   * 评估内存状态
   */
  async assessMemoryState(filePath) {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const memoryRatio = heapUsed / this.options.maxHeapSize;
    
    // 估算文件处理所需内存
    let estimatedMemoryNeeded = 0;
    try {
      const stats = await fs.stat(filePath);
      estimatedMemoryNeeded = stats.size * 2.5; // 估算转换需要2.5倍文件大小的内存
    } catch (error) {
      estimatedMemoryNeeded = 100 * 1024 * 1024; // 默认100MB
    }
    
    const projectedMemoryRatio = (heapUsed + estimatedMemoryNeeded) / this.options.maxHeapSize;
    
    return {
      currentMemory: heapUsed,
      memoryRatio: memoryRatio,
      estimatedMemoryNeeded: estimatedMemoryNeeded,
      projectedMemoryRatio: projectedMemoryRatio,
      needsGC: memoryRatio >= this.options.memoryWarningThreshold,
      needsCacheClearing: memoryRatio >= this.options.memoryWarningThreshold,
      criticalMemory: memoryRatio >= this.options.memoryCriticalThreshold,
      sufficientMemory: projectedMemoryRatio < this.options.memoryCriticalThreshold
    };
  }
  
  /**
   * 检查系统资源
   */
  async checkSystemResources() {
    try {
      const memUsage = process.memoryUsage();
      
      // 检查可用内存
      if (memUsage.heapUsed / this.options.maxHeapSize > 0.9) {
        throw new Error('系统内存不足，建议关闭其他应用程序');
      }
      
      // 检查V8堆状态
      if (typeof require === 'function') {
        try {
          const v8 = require('v8');
          const heapStats = v8.getHeapStatistics();
          
          if (heapStats.used_heap_size / heapStats.heap_size_limit > 0.9) {
            console.warn('⚠️  V8堆内存使用率过高，建议重启应用');
          }
        } catch (v8Error) {
          // V8统计不可用，跳过
        }
      }
      
    } catch (error) {
      console.warn(`系统资源检查警告: ${error.message}`);
    }
  }
  
  /**
   * 生成预处理报告
   */
  generatePreprocessingReport(assessment) {
    const report = {
      timestamp: new Date().toISOString(),
      memoryState: {
        current: `${(assessment.currentMemory / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${(assessment.memoryRatio * 100).toFixed(1)}%`,
        estimated: `${(assessment.estimatedMemoryNeeded / 1024 / 1024).toFixed(2)}MB`,
        projected: `${(assessment.projectedMemoryRatio * 100).toFixed(1)}%`
      },
      actions: {
        garbageCollection: assessment.needsGC,
        cacheClearing: assessment.needsCacheClearing,
        criticalMode: assessment.criticalMemory
      },
      statistics: {
        totalGC: this.memoryStats.gcCount,
        totalCacheClears: this.memoryStats.cacheClears,
        totalPreprocessing: this.memoryStats.preprocessingCount,
        peakMemory: `${(this.memoryStats.peakMemory / 1024 / 1024).toFixed(2)}MB`
      },
      recommendation: assessment.sufficientMemory ? '内存充足，可以开始转换' : '内存紧张，建议释放更多资源'
    };
    
    return report;
  }
  
  /**
   * 获取内存使用统计
   */
  getMemoryStats() {
    const currentMemory = process.memoryUsage();
    
    return {
      ...this.memoryStats,
      currentMemory: currentMemory.heapUsed,
      memoryRatio: currentMemory.heapUsed / this.options.maxHeapSize,
      rss: currentMemory.rss,
      external: currentMemory.external,
      arrayBuffers: currentMemory.arrayBuffers
    };
  }
  
  /**
   * 销毁预处理器
   */
  destroy() {
    this.stopAutoGC();
    this.clearAllCaches();
    
    if (this.options.enableDetailedLogging) {
      console.log('🔚 内存预处理器已销毁');
    }
  }
}

module.exports = MemoryPreprocessor;