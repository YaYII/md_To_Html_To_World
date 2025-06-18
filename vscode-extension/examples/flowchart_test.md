# 流程图测试文档

本文档包含多种类型的流程图，用于测试 Markdown 到 Word 转换功能中的图表处理能力。

## 1. 基础流程图

```mermaid
flowchart TD
    A[开始] --> B{是否登录?}
    B -->|是| C[显示主页]
    B -->|否| D[跳转登录页]
    D --> E[用户输入账号密码]
    E --> F{验证是否通过?}
    F -->|是| C
    F -->|否| G[显示错误信息]
    G --> E
    C --> H[结束]
```

## 2. 复杂业务流程图

```mermaid
flowchart LR
    A[用户提交订单] --> B[库存检查]
    B --> C{库存充足?}
    C -->|是| D[创建订单]
    C -->|否| E[通知缺货]
    D --> F[计算价格]
    F --> G[选择支付方式]
    G --> H{支付方式}
    H -->|信用卡| I[信用卡支付]
    H -->|支付宝| J[支付宝支付]
    H -->|微信| K[微信支付]
    I --> L[支付处理]
    J --> L
    K --> L
    L --> M{支付成功?}
    M -->|是| N[发送确认邮件]
    M -->|否| O[支付失败处理]
    N --> P[更新库存]
    P --> Q[安排发货]
    Q --> R[订单完成]
    O --> G
    E --> S[推荐替代商品]
```

## 3. 系统架构流程图

```mermaid
flowchart TB
    subgraph "前端层"
        A[Web界面]
        B[移动端App]
        C[管理后台]
    end
    
    subgraph "API网关层"
        D[负载均衡器]
        E[API网关]
        F[认证服务]
    end
    
    subgraph "业务服务层"
        G[用户服务]
        H[订单服务]
        I[支付服务]
        J[库存服务]
    end
    
    subgraph "数据层"
        K[(用户数据库)]
        L[(订单数据库)]
        M[(Redis缓存)]
        N[(文件存储)]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    G --> K
    H --> L
    I --> L
    J --> M
    G --> M
    H --> N
```

## 4. 决策树流程图

```mermaid
flowchart TD
    A[客户咨询] --> B{问题类型}
    B -->|技术问题| C[技术支持]
    B -->|账单问题| D[财务部门]
    B -->|产品咨询| E[销售部门]
    B -->|投诉建议| F[客服主管]
    
    C --> C1{能否解决?}
    C1 -->|是| C2[问题解决]
    C1 -->|否| C3[升级到高级技术]
    C3 --> C4[专家处理]
    C4 --> C2
    
    D --> D1[查询账单]
    D1 --> D2{账单正确?}
    D2 -->|是| D3[解释说明]
    D2 -->|否| D4[调整账单]
    D3 --> D5[客户满意]
    D4 --> D5
    
    E --> E1[产品介绍]
    E1 --> E2{客户感兴趣?}
    E2 -->|是| E3[发送报价]
    E2 -->|否| E4[记录需求]
    E3 --> E5[跟进订单]
    E4 --> E6[定期回访]
    
    F --> F1[记录投诉]
    F1 --> F2[调查处理]
    F2 --> F3[反馈结果]
    F3 --> F4[客户满意度调查]
```

## 5. 数据处理流程图

```mermaid
flowchart LR
    A[原始数据] --> B[数据清洗]
    B --> C[数据验证]
    C --> D{数据质量检查}
    D -->|通过| E[数据转换]
    D -->|不通过| F[错误处理]
    F --> G[数据修复]
    G --> C
    E --> H[数据加载]
    H --> I[数据索引]
    I --> J[数据备份]
    J --> K[完成处理]
    
    subgraph "监控模块"
        L[性能监控]
        M[错误监控]
        N[质量监控]
    end
    
    B -.-> L
    F -.-> M
    D -.-> N
```

## 6. 用户注册流程图

```mermaid
flowchart TD
    Start([开始注册]) --> Input[输入用户信息]
    Input --> Validate{信息验证}
    Validate -->|格式错误| Error1[显示格式错误]
    Error1 --> Input
    Validate -->|格式正确| CheckUser{用户是否存在?}
    CheckUser -->|存在| Error2[用户已存在]
    Error2 --> Input
    CheckUser -->|不存在| SendCode[发送验证码]
    SendCode --> InputCode[输入验证码]
    InputCode --> VerifyCode{验证码正确?}
    VerifyCode -->|错误| Error3[验证码错误]
    Error3 --> InputCode
    VerifyCode -->|正确| CreateUser[创建用户账户]
    CreateUser --> SendEmail[发送欢迎邮件]
    SendEmail --> Success([注册成功])
    
    style Start fill:#90EE90
    style Success fill:#90EE90
    style Error1 fill:#FFB6C1
    style Error2 fill:#FFB6C1
    style Error3 fill:#FFB6C1
```

## 7. 简单的状态转换图

```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中 : 开始处理
    处理中 --> 已完成 : 处理成功
    处理中 --> 处理失败 : 处理出错
    处理失败 --> 待处理 : 重新处理
    处理失败 --> 已取消 : 取消任务
    已完成 --> [*]
    已取消 --> [*]
```

## 8. Git 工作流程图

```mermaid
flowchart LR
    A[本地开发] --> B[git add]
    B --> C[git commit]
    C --> D[git push]
    D --> E[创建PR]
    E --> F{代码审查}
    F -->|通过| G[合并到主分支]
    F -->|不通过| H[修改代码]
    H --> B
    G --> I[部署到测试环境]
    I --> J{测试通过?}
    J -->|是| K[部署到生产环境]
    J -->|否| L[修复bug]
    L --> B
    K --> M[发布完成]
```

## 测试说明

本文档包含了以下类型的流程图：

1. **基础流程图** - 简单的条件判断流程
2. **复杂业务流程图** - 多分支、多决策点的业务流程
3. **系统架构流程图** - 包含子图的系统架构展示
4. **决策树流程图** - 复杂的决策分支结构
5. **数据处理流程图** - 包含监控模块的数据处理流程
6. **用户注册流程图** - 带样式的用户交互流程
7. **状态转换图** - 使用 stateDiagram 语法
8. **Git工作流程图** - 开发流程示例

这些流程图涵盖了不同的复杂度和使用场景，可以全面测试 Markdown 到 Word 转换功能中的图表渲染能力。

## 预期测试结果

- 所有流程图应该能够正确渲染为图片
- 图片应该清晰可读
- 中文字符应该正确显示
- 不同类型的图表语法都应该被支持
- 图片应该适当缩放以适应Word文档页面