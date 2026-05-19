# 掼蛋游戏 (Guandan Game)

一款支持本地 AI 和在线对战的掼蛋扑克牌游戏。

## 项目简介

掼蛋是流行于江苏、安徽等地的四人扑克牌游戏。本项目实现了一个完整的掼蛋游戏，支持：

- 人机对战（AI 对手）
- 四人在线匹配
- 实时聊天和表情
- 完整掼蛋规则

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- Pinia (状态管理)
- Socket.IO Client

### 后端
- Node.js + Express
- Socket.IO
- TypeScript

### AI
- 基础规则引擎
- 可选 LLM API 增强

## 游戏规则

### 基本规则
- 4 人参与，两副牌（108 张），每人 27 张
- 对家为队友，交叉坐
- 从 2 打 到 A，先打过 A 且满足条件者获胜

### 牌型
- 单张、对子、三张、三带二
- 顺子（5 张以上）
- 炸弹（4 张及以上同点数）
- 同花顺
- 四王（最大）

### 升级规则
- 双下（队友两人一二游）：升 3 级
- 头游 + 三游：升 2 级
- 头游 + 末游：升 1 级
- 打 A 时需要头游且队友不是末游

### 进贡规则
- 下游给上游最大牌，上游还 2-10 的牌
- 双下各进贡一张，还牌时大给头游，小给二游

## 项目结构

```
guandan/
├── client/                 # Vue 前端
│   ├── src/
│   │   ├── components/    # 组件
│   │   │   ├── Game/      # 游戏相关
│   │   │   ├── Chat/      # 聊天相关
│   │   │   └── UI/        # 通用 UI
│   │   ├── composables/   # 组合式 API
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── types/         # TypeScript 类型
│   │   ├── utils/         # 工具函数
│   │   └── views/         # 页面视图
│   └── package.json
├── server/                # Node.js 后端
│   ├── src/
│   │   ├── game/         # 游戏逻辑
│   │   ├── ai/           # AI 引擎
│   │   └── socket/       # WebSocket 处理
│   └── package.json
├── README.md
└── package.json
```

## 快速开始

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install

# 安装后端依赖
cd server && npm install
```

### 启动开发服务器

```bash
# 启动后端 (端口 3001)
npm run server

# 启动前端 (端口 5173)
npm run client
```

访问 http://localhost:5173 开始游戏。

### 生产构建

```bash
# 构建前端
npm run build

# 启动生产服务器
npm run start
```

## 功能说明

### 游戏模式
- **本地对战**: 与 AI 对手进行双人/四人游戏
- **在线匹配**: 创建房间或加入房间进行网络对战

### AI 难度
- **简单**: 基于基础规则的随机出牌
- **普通**: 优化的出牌策略
- **困难**: 使用 LLM API 的智能对手（需配置 API Key）

### 聊天功能
- 文字消息发送
- 内置表情包
- 游戏状态提示

## 配置说明

### LLM AI 配置（可选）

在 `server/.env` 中配置：

```env
OPENAI_API_KEY=your-api-key
# 或
ANTHROPIC_API_KEY=your-api-key
```

### 环境变量

```env
# server/.env
PORT=3001
CLIENT_URL=http://localhost:5173
```

## 开发指南

### 添加新的牌型

在 `server/src/game/rules.ts` 中添加牌型定义，并在 `judge.ts` 中实现判断逻辑。

### 添加新的表情

在 `client/src/components/Chat/EmojiPicker.vue` 的表情列表中添加。

## 许可证

MIT License
