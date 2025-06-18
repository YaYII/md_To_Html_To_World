# VS Code Extension 重构方案

## 当前问题分析

`src/extension.ts` 文件目前有 **2155 行代码**，违反了单一职责原则，包含了以下多个职责：

1. **依赖管理** - `AutoDependencyInstaller` 类
2. **命令注册和处理** - 多个 vscode.commands.registerCommand
3. **配置管理** - `getUserConfig` 函数和配置相关逻辑
4. **文件转换逻辑** - 转换相关的业务逻辑
5. **错误处理** - 各种错误处理逻辑
6. **插件生命周期管理** - activate/deactivate 函数

## 重构目标

1. **模块化设计** - 将功能按职责拆分到独立模块
2. **提高可维护性** - 每个模块职责单一，易于理解和修改
3. **提高可测试性** - 独立模块便于单元测试
4. **遵循 VS Code 扩展最佳实践** - 清晰的架构和代码组织

## 重构方案

### 1. 依赖管理模块 (`src/services/dependencyService.ts`)

**职责：** 管理 Node.js 依赖的检查、安装和验证

```typescript
// 将 AutoDependencyInstaller 类移动到独立文件
export class DependencyService {
    // 现有的依赖管理逻辑
}
```

### 2. 命令处理模块 (`src/commands/`)

**职责：** 处理所有 VS Code 命令的注册和执行

```
src/commands/
├── index.ts              // 命令注册入口
├── convertCommands.ts    // 转换相关命令
├── configCommands.ts     // 配置相关命令
└── dependencyCommands.ts // 依赖检查命令
```

### 3. 配置管理模块 (`src/services/configService.ts`)

**职责：** 管理用户配置的读取、保存和验证

```typescript
export class ConfigService {
    async getUserConfig(): Promise<IDocumentConfig>
    async saveConfig(config: IDocumentConfig): Promise<void>
    getDefaultConfig(): IDocumentConfig
}
```

### 4. 转换服务模块 (`src/services/conversionService.ts`)

**职责：** 处理文件转换的业务逻辑

```typescript
export class ConversionService {
    async convertFile(filePath: string, options: ConversionOptions): Promise<ConversionResult>
    async handleCommandLineArgs(): Promise<void>
}
```

### 5. 错误处理模块 (`src/utils/errorHandler.ts`)

**职责：** 统一的错误处理和用户反馈

```typescript
export class ErrorHandler {
    static handleConversionError(error: Error): void
    static handleDependencyError(error: Error): void
    static showErrorWithActions(message: string, actions: string[]): Promise<string | undefined>
}
```

### 6. 重构后的主入口文件 (`src/extension.ts`)

**职责：** 仅负责插件的初始化和生命周期管理

```typescript
import { CommandRegistry } from './commands';
import { DependencyService } from './services/dependencyService';
import { ConfigService } from './services/configService';

export async function activate(context: vscode.ExtensionContext) {
    // 初始化服务
    const dependencyService = new DependencyService(context);
    const configService = new ConfigService(context);
    
    // 注册命令
    const commandRegistry = new CommandRegistry(context, dependencyService, configService);
    commandRegistry.registerAllCommands();
    
    console.log('插件激活完成');
}

export function deactivate(): void {
    console.log('插件已停用');
}
```

## 实施步骤

### 第一阶段：创建服务层
1. 创建 `DependencyService` 类
2. 创建 `ConfigService` 类
3. 创建 `ConversionService` 类
4. 创建 `ErrorHandler` 工具类

### 第二阶段：重构命令处理
1. 创建命令模块结构
2. 将命令处理逻辑移动到对应模块
3. 创建 `CommandRegistry` 统一管理命令注册

### 第三阶段：简化主入口
1. 重构 `extension.ts`，移除业务逻辑
2. 保留插件生命周期管理
3. 集成所有服务和命令模块

### 第四阶段：测试和优化
1. 确保所有功能正常工作
2. 添加单元测试
3. 优化模块间的依赖关系

## 预期收益

1. **代码可读性提升** - 每个文件职责明确，代码量控制在合理范围内
2. **维护性提升** - 修改某个功能时只需关注对应模块
3. **可测试性提升** - 独立模块便于编写单元测试
4. **扩展性提升** - 新功能可以独立开发，不影响现有代码
5. **团队协作效率提升** - 不同开发者可以并行开发不同模块

## 文件大小对比

| 文件 | 重构前 | 重构后 |
|------|--------|--------|
| extension.ts | 2155 行 | ~50 行 |
| dependencyService.ts | - | ~300 行 |
| configService.ts | - | ~200 行 |
| conversionService.ts | - | ~400 行 |
| commands/* | - | ~600 行 |
| errorHandler.ts | - | ~100 行 |

重构后，最大的单个文件不超过 600 行，符合良好的代码组织原则。