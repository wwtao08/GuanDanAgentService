# 掼蛋游戏开发Wiki

## 项目概述

掼蛋游戏是一个完整的在线扑克牌游戏项目，支持人机对战和在线多人游戏。项目采用前后端分离架构，使用现代Web技术栈构建。

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (Vue 3)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ HomeView │  │GameView  │  │Components│  │  Stores  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                         │                                   │
│                    Socket.io Client                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket
┌─────────────────────────┴───────────────────────────────────┐
│                      服务端 (Node.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Socket  │  │   Game   │  │    AI    │  │  Coach   │    │
│  │  Handler │  │  Engine  │  │  Engine  │  │ Service  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                         │                                   │
│                    LLM API (可选)                           │
└─────────────────────────────────────────────────────────────┘
```

## 模块文档

| 模块 | 文档 | 描述 |
|------|------|------|
| 客户端 | [client.md](./client.md) | Vue 3 前端应用 |
| 服务端 | [server.md](./server.md) | Node.js 后端服务 |
| 游戏核心 | [game.md](./game.md) | 掼蛋游戏规则引擎 |
| AI模块 | [ai.md](./ai.md) | AI出牌策略引擎 |
| 教练模块 | [coach.md](./coach.md) | LLM教练提示系统 |
| Socket通信 | [socket.md](./socket.md) | WebSocket通信层 |

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装与启动

```bash
# 安装依赖
cd client && npm install
cd ../server && npm install

# 启动后端 (端口 3001)
cd server && npm run dev

# 启动前端 (端口 5173)
cd client && npm run dev
```

### 环境配置

在 `server/.env` 中配置：

```env
PORT=3001
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=your-api-key
```

## 目录结构

```
guandan/
├── client/                    # 前端项目
│   ├── src/
│   │   ├── components/       # Vue组件
│   │   ├── composables/      # 组合式API
│   │   ├── stores/           # Pinia状态
│   │   ├── types/            # TypeScript类型
│   │   └── views/            # 页面视图
│   └── package.json
├── server/                    # 后端项目
│   ├── src/
│   │   ├── game/             # 游戏引擎
│   │   ├── ai/               # AI引擎
│   │   ├── coach/            # 教练服务
│   │   ├── socket/           # WebSocket处理
│   │   └── config/           # 配置文件
│   └── package.json
├── wiki/                      # 开发文档
└── README.md
```

## 核心功能

### 1. 游戏模式
- **本地对战**: 与AI对手进行游戏
- **在线匹配**: 创建/加入房间进行网络对战

### 2. AI系统
- 基础规则引擎（BasicAI）
- LLM增强决策（可选）
- 团队协作AI（TeamAI）

### 3. 教练系统
- 出牌建议
- 策略讲解
- 新手/高手模式

### 4. 团队交流
- 全局可见的消息系统
- AI生成提示信息
- 可开关控制

## 开发规范

### 代码风格
- TypeScript严格模式
- ESLint + Prettier
- Vue 3 Composition API

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- refactor: 重构
- test: 测试相关

### 分支管理
- master: 主分支
- feature/*: 功能分支
- hotfix/*: 紧急修复

## 部署指南

### 前端构建
```bash
cd client
npm run build
# 输出到 client/dist
```

### 后端构建
```bash
cd server
npm run build
# 输出到 server/dist
```

### 生产启动
```bash
cd server
npm start
```

## 常见问题

### Q: AI不教我打牌？
A: 确保是本地模式，轮到你出牌时点击"教练提示"按钮。

### Q: 团队消息不显示？
A: 检查首页创建房间时是否开启了"团队交流"开关。

### Q: LLM功能不工作？
A: 检查 server/.env 中是否正确配置了 OPENAI_API_KEY。

## 更新日志

### v2.0.0
- 新增团队交流功能
- AI支持LLM出牌决策
- 优化UI布局

### v1.0.0
- 基础掼蛋游戏
- AI对手
- 在线对战
