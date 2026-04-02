# Pet Trading — 去中心化宠物交换市场

## 概述

为桌面数字宠物添加去中心化交换市场功能。用户可以在 P2P 网络上浏览、交换、赠送宠物。
采用 Cloudflare Worker（极薄信令层）+ WebRTC 直连架构，配合 Ed25519 数字签名防篡改。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 去中心化程度 | 混合（Worker 信令 + WebRTC 直连） | 最简单稳定，Worker 极薄只做发现和信令 |
| 防篡改 | Ed25519 数字签名 + 交换日志 | 零门槛（无需钱包/gas），能检测篡改 |
| 交换模式 | 交换 + 赠送 | 用户可选以物换物或单向赠送 |
| 宠物持有 | 全局背包 `~/.pets/` | 不绑定项目，可拥有多只，选一只激活 |
| 操作界面 | Tauri UI 为主，CLI 辅助 | 交换在桌面 UI 完成，CLI 做查看和管理 |

---

## 1. 身份 & 数据模型

### 用户身份

应用首次启动时自动生成 Ed25519 密钥对，存在 `~/.pets/identity.json`：

```json
{
  "publicKey": "base64...",
  "privateKey": "base64...",
  "nickname": "豚豚主人",
  "createdAt": "2026-04-02T..."
}
```

- `publicKey` 是用户的全局身份标识
- `privateKey` 永远不离开本地
- `nickname` 用户自设，用于市场展示

### 全局背包目录结构

```
~/.pets/
├── identity.json              # 密钥对 + 昵称
├── inventory/                 # 宠物背包
│   ├── abc123.json            # petId = 签名哈希前 6 位
│   └── def456.json
├── active.txt                 # 内容为激活宠物的 petId（跨平台，避免 symlink）
└── trade-log.json             # 本地交换日志副本
```

### Pet Schema v2.1

在现有 v2.0 基础上扩展 `id` 和 `ownership` 字段：

```json
{
  "version": "2.1",
  "id": "abc123",
  "meta": {
    "createdAt": "2026-04-02T...",
    "source": "cli",
    "sourceUrl": "",
    "projectContext": "..."
  },
  "bones": { "..." },
  "soul": { "..." },
  "ownership": {
    "creatorPublicKey": "base64...",
    "currentOwnerPublicKey": "base64...",
    "signature": "base64...",
    "transferHistory": [
      {
        "from": "pubkey_a",
        "to": "pubkey_b",
        "timestamp": "2026-04-02T...",
        "fromSignature": "base64...",
        "toSignature": "base64..."
      }
    ]
  }
}
```

- `signature`：创建者对 `meta + bones + soul` 的签名（不可变部分）
- `transferHistory`：每次交换/赠送追加一条记录，双方签名

### 数字签名机制

- **创建时**：`signature = ed25519.sign(privateKey, hash(meta + bones + soul))`
- **验证时**：`ed25519.verify(creatorPublicKey, hash(meta + bones + soul), signature)` → 确认数据未被篡改
- **交换时**：双方各自签名交换记录，确认所有权转移的合法性
- 同一只宠物如果出现两次（复制作弊），交换日志中能看到所有权链条冲突

---

## 2. Cloudflare Worker（信令 + 挂单）

### API 端点

```
POST   /listings          # 发布挂单
GET    /listings          # 浏览所有挂单（支持筛选）
DELETE /listings/:id      # 撤回挂单

POST   /signal            # WebRTC 信令中继（交换 SDP/ICE candidate）

GET    /trades            # 查询交换记录（按 petId 或 pubkey）
POST   /trades            # 存储交换记录
```

### 挂单数据结构

```json
{
  "id": "listing_001",
  "type": "trade | gift",
  "pet": {
    "id": "abc123",
    "name": "豚豚",
    "species": "水豚",
    "emoji": "🦫",
    "rarity": "SSR",
    "asciiArt": ["..."],
    "ownership": { "currentOwnerPublicKey": "..." }
  },
  "wantDescription": "想换一只 SR 以上的",
  "ownerPublicKey": "base64...",
  "ownerNickname": "豚豚主人",
  "signature": "base64...",
  "createdAt": "2026-04-02T...",
  "expiresAt": "2026-04-09T..."
}
```

- 挂单只含宠物摘要（不含 systemPrompt 等私密数据）
- 签名确保无人能伪造他人的挂单
- TTL 7 天自动过期

### 存储

Cloudflare KV：免费额度每天 10 万次读 / 1000 次写。挂单设 TTL 7 天自动清理。

### 信令流程

```
发起方                    Worker                    接收方
  │                         │                         │
  ├─ POST /signal ──────────┤                         │
  │  { to: pubkey_b,        │                         │
  │    sdp: offer }         ├── 存入 KV, 短 TTL ──────┤
  │                         │                         │
  │                         │       GET /signal ──────┤
  │                         │       (轮询或 SSE)       │
  │                         │                         │
  │                         ├─────── sdp: answer ─────┤
  │                         │                         │
  │◄── WebRTC 直连建立 ─────────────────────────────►│
  │        (Worker 退出, 后续数据不经过 Worker)         │
```

---

## 3. WebRTC 直连 & 网络

### 连接建立

1. STUN 服务器发现双方公网地址（Google/Cloudflare 公共 STUN，免费）
2. 通过 Worker 交换 SDP offer/answer + ICE candidate
3. 尝试 NAT 穿透直连（UDP hole punching）
4. 直连失败 → 自动 fallback 到 TURN relay

### NAT 穿透兼容性

| 场景 | 直连 | 备选 |
|------|------|------|
| 普通家庭 WiFi | ✅ | — |
| 手机热点 | ✅ | — |
| 公司网络（防火墙） | 大概率 ✅ | 少数封 UDP 时用 TURN |
| 对称型 NAT（少见） | ❌ | TURN relay |

**整体成功率约 95%+**，TURN 兜底后 100%。

### TURN Relay 兜底

选项：Cloudflare Calls（有免费额度）或 Metered.ca（免费 50GB/月）。
数据经 relay 中转但全程加密，relay 无法查看内容。

---

## 4. 交换 & 赠送流程

### 交换流程（以物换物）

```
      发起方                                    接收方
         │                                        │
    ① 浏览挂单列表                                 │
    ② 看中对方宠物，点击"发起交换"                    │
    ③ 从背包选一只宠物作为筹码                       │
         │                                        │
         ├── Worker 信令 → WebRTC 直连 ────────────►│
         │                                        │
         ├── 发送交换请求 ──────────────────────────►│
         │   { 我出: 宠物A, 我想要: 宠物B }          │
         │                                     ④ 收到请求弹窗
         │                                     ⑤ 验签 → ✅
         │                                        │
         │◄──────────────────── 确认接受 ───────────┤
         │                                        │
    ⑥ 双方同时执行：                                │
         │   签名交换记录（双方签名）                  │
         │   交换宠物 JSON                          │
         │   更新各自 ownership                     │
         │   更新本地 trade-log                     │
         │   从背包移除送出的宠物                      │
         │   加入收到的宠物                          │
         │                                        │
    ⑦ 广播交换记录到 Worker                         │
         │                                        │
      完成 ✅                                    完成 ✅
```

### 赠送流程（单向）

同交换流程但发送方不要求回报，接收方只需确认接收。

### 原子性保障

```
1. 双方先交换签名过的交换记录（承诺）
2. 收到对方承诺后，才执行本地数据变更
3. 中途断连处理：
   - 未收到对方承诺 → 无事发生，各自回滚
   - 已交换承诺但断连 → 本地标记为 "pending"，重连后恢复
```

### 拒绝和取消

| 场景 | 处理 |
|------|------|
| 接收方拒绝 | 发起方收到拒绝通知，无事发生 |
| 发起方取消 | 接收方收到取消通知，弹窗关闭 |
| 验签失败 | 自动拒绝，提示"宠物数据异常" |
| 对方离线 | 请求超时（30s），提示稍后再试 |

### 交换记录结构

```json
{
  "tradeId": "uuid",
  "type": "trade | gift",
  "petA": { "id": "abc123", "name": "豚豚", "rarity": "SSR" },
  "petB": { "id": "def456", "name": "狐狐", "rarity": "SR" },
  "from": "pubkey_a",
  "to": "pubkey_b",
  "fromSignature": "base64...",
  "toSignature": "base64...",
  "timestamp": "2026-04-02T..."
}
```

赠送时 `petB` 为 `null`。完成后 POST 到 Worker 存公开记录。

---

## 5. UI 界面

### 右键菜单扩展

```
右键桌面宠物
├── 📦 我的背包          → 打开背包窗口
├── 🔄 交换市场          → 打开市场窗口
├── 🎁 赠送这只宠物       → 直接为当前宠物创建赠送挂单
├── ───────────
├── Show Pet
└── Quit
```

### 背包窗口（新窗口，约 400×500）

```
┌─ 我的宠物 ──────────────────────┐
│                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │ (°▽°) │ │ /\_/\ │ │ ◉_◉   │ │
│  │ 豚豚   │ │ 狐狐  │ │ 墨墨   │ │
│  │ SSR ✨ │ │ SR 🌟 │ │ N 🔵  │ │
│  └───────┘ └───────┘ └───────┘ │
│                                 │
│  点击 → 查看详情 / 设为激活       │
│  长按 → 挂单交换 / 赠送          │
└─────────────────────────────────┘
```

### 市场窗口（新窗口，约 600×500）

```
┌─ 交换市场 ─────────────────────────────┐
│  筛选: [全部 ▾] [稀有度 ▾] [物种 ▾]     │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │ 🎁 赠送  豚豚 (SSR ✨)  水豚     │   │
│  │ 来自: 星星主人                    │   │
│  │              [我要了!]           │   │
│  ├─────────────────────────────────┤   │
│  │ 🔄 交换  狐狐 (SR 🌟)  耳廓狐   │   │
│  │ 来自: 月亮主人                    │   │
│  │ 想要: R 以上的任意宠物            │   │
│  │              [发起交换]           │   │
│  └─────────────────────────────────┘   │
│                                        │
│  在线: 12 只宠物挂单中                   │
└────────────────────────────────────────┘
```

### 交换确认弹窗

```
┌─ 交换请求 ────────────────────┐
│                               │
│  星星主人 想用                  │
│                               │
│   (°▽°)        换你的   /\_/\ │
│   豚豚 SSR              狐狐 SR│
│                               │
│  验证: ✅ 签名有效              │
│                               │
│    [接受]          [拒绝]      │
└───────────────────────────────┘
```

---

## 6. CLI 命令

```bash
pet inventory                       # 列出背包所有宠物
pet inventory --set-active abc123   # 切换激活宠物
pet market                          # 列出当前挂单（文本表格）
pet export abc123                   # 导出宠物 JSON（备份用）
pet verify abc123                   # 验证签名 + 查所有权链
```

CLI 不做交换操作（WebRTC 在终端不便），只做查看和管理。

---

## 7. 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 身份/签名 | `ed25519-dalek` (Rust) | Tauri 侧原生，快且安全 |
| WebRTC | `webrtc-rs` (Rust) | 纯 Rust 实现，不依赖系统库 |
| STUN | Google/Cloudflare 公共服务器 | 免费，稳定 |
| TURN 兜底 | Cloudflare Calls 或 Metered.ca | 免费额度足够 |
| 信令 + 挂单 | Cloudflare Worker + KV | 免费额度（10万读/天），全球边缘 |
| 交换记录 | Worker KV + 本地 trade-log.json | 双重备份 |
| 背包存储 | `~/.pets/inventory/` 本地文件 | 与现有 `.pet/` 模式一致 |
| CLI | 现有 bin/ 下新增命令 | 复用现有 TypeScript 工具链 |

---

## 8. 对现有代码的改动

### 不动的

- `engine/` — 宠物生成引擎不变
- `ui/main.js` — 桌面宠物渲染不变
- `hooks/` — Agent hook 不变
- `skills/` — 技能不变

### 修改的

- `engine/types.ts` — Pet v2.0 → v2.1（加 `id` + `ownership` 字段）
- `src-tauri/src/lib.rs` — `load_pet` 改为从 `~/.pets/` 读取激活宠物
- `src-tauri/src/tray.rs` — 右键菜单加背包/市场入口

### 新增的

```
src-tauri/src/
├── identity.rs          # 密钥对管理（生成/加载/签名/验签）
├── inventory.rs         # 背包 CRUD（列表/添加/移除/激活）
├── webrtc.rs            # WebRTC 连接管理（信令/ICE/数据通道）
├── trade.rs             # 交换协议（握手/确认/执行/回滚）
└── market.rs            # Worker API 客户端（挂单/信令/交易记录）

ui/
├── inventory.html + inventory.js   # 背包窗口
└── market.html + market.js         # 市场窗口

worker/                  # Cloudflare Worker
├── index.ts             # API 路由 + 逻辑
└── wrangler.toml        # Worker 配置

bin/
└── pet-cli.ts           # CLI 背包/市场/验证命令
```

### 迁移兼容

现有 `.pet/<name>.json`（v2.0）首次启动时自动迁移到 `~/.pets/inventory/`，
补充 `id` + `ownership` 字段（用新生成的密钥签名），版本号升为 `"2.1"`。
