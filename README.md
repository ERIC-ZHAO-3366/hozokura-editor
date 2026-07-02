# Hozokura 编辑器

专为 [Hozokura 博客主题](https://github.com/ERIC-ZHAO-3366/hozokura-editor) 设计的 Markdown 文章写作工具，集成了微信公众号文章保存功能。

## 功能概览

### 写作模式
- Markdown 编辑 + 实时预览
- 文章元数据 (Frontmatter) 可视化编辑（标题、日期、分类、标签、置顶、摘要）
- 一键插入短代码：`[warn]` `[wrong]` `[right]` `[hide]` `[video]` `[music]`
- 一键插入常用结构：H2/H3/引用/代码块/链接/图片/表格
- 视频/音乐嵌入（自动识别 Bilibili/YouTube/网易云/Spotify）
- 导出 `.md` 文件（含 Frontmatter）
- 明暗主题切换

### 微信保存模式
- 粘贴微信公众号文章链接，一键抓取文章和图片
- 双视图切换：微信原文 / Markdown 编辑
- 四种导出格式：ZIP（MD + 图片）、HTML（图片内嵌 base64）、Markdown、Hozokura MD（含 Frontmatter）
- 图片灯箱大图预览

## 快速开始

### 方式一：直接打开（仅写作模式）

双击 `index.html` 即可在浏览器中使用写作模式。

> 微信保存模式需要后端支持，直接打开无法使用。

### 方式二：本地服务器运行（推荐）

```powershell
# 进入项目目录
cd editor

# 启动本地服务器
npx serve . -l 3000
```

然后访问 http://localhost:3000

> 写作模式可正常使用，但微信保存模式仍需 Cloudflare 后端。

### 方式三：完整运行（含微信保存功能）

微信保存模式依赖 Cloudflare Pages Functions 作为后端代理，需要使用 Wrangler 本地运行：

```powershell
# 进入项目根目录
cd editor

# 启动 Cloudflare Pages 本地开发服务器
npx wrangler pages dev . --port 8788 --compatibility-date=2024-09-23
```

等待出现 `Ready on http://127.0.0.1:8788` 后，访问 http://localhost:8788

> 此模式下写作和微信保存功能均可使用。
> 首次运行可能需要较长时间下载 workerd 运行时。

## 使用教程

### 写作模式

1. 打开页面后默认进入「写作」模式
2. 在顶部「文章元数据设置」面板填写标题、日期、分类、标签等
3. 在左侧编辑区使用 Markdown 编写文章，右侧实时预览
4. 使用工具栏按钮或快捷键快速插入格式和短代码
5. 点击右上角「导出 .md」下载包含 Frontmatter 的 Markdown 文件

**快捷键：**

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+Shift+W` | 警告短代码 |
| `Ctrl+Shift+E` | 错误短代码 |
| `Ctrl+Shift+R` | 正确短代码 |
| `Ctrl+Shift+H` | 隐藏文字 |

**短代码示例：**

```markdown
[warn]这是一个警告提示[/warn]
[wrong]这是一个错误提示[/wrong]
[right]这是一个成功提示[/right]
[hide]这段文本默认隐藏，悬停可见[/hide]
[video title="我的视频"]https://www.bilibili.com/video/BV1xx411c7mD[/video]
[music title="夜间循环播放"]https://music.163.com/#/song?id=29764561[/music]
```

### 微信保存模式

1. 点击顶部「微信保存」标签切换模式
2. 在「微信文章获取」面板粘贴微信公众号文章链接（`https://mp.weixin.qq.com/s/...`）
3. 点击「获取文章」，等待抓取完成
4. 在左侧通过「微信原文」/「Markdown 编辑」标签切换视图
5. 在 Markdown 编辑区可修改转换后的内容，右侧实时预览
6. 点击「导出」按钮选择导出格式：
   - **导出 ZIP**：包含 `article.md`、`images/` 图片文件夹、`hozokura-article.md`
   - **导出 HTML**：图片内嵌 base64 的单文件 HTML
   - **导出 Markdown**：纯文本 Markdown
   - **导出 Hozokura MD**：带 Frontmatter 的 Markdown，可直接放入 Hozokura 博客

### 主题切换

- 点击右上角日/月图标切换明暗主题
- 主题偏好自动保存到浏览器
- `Shift + 点击` 主题开关可清除保存的偏好，回到自动模式

## 项目结构

```
editor/
├── index.html              # 主入口页面
├── main.js                 # 核心逻辑（写作 + 微信保存）
├── styles.css              # 统一样式
├── 404.html                # 自定义 404 页面
├── functions/api/
│   └── fetch-article.js    # Cloudflare Function：服务端抓取微信文章
└── wechat-article-saver/
    ├── functions/api/
    │   └── fetch-article.js  # （同上，原始副本）
    ├── app.js                # （旧版独立前端逻辑，已合并到 main.js）
    ├── index.html            # （旧版独立页面，已合并）
    ├── styles.css            # （旧版独立样式，已合并）
    ├── package.json          # Wrangler 依赖配置
    └── wrangler.toml         # Cloudflare 部署配置
```

## 技术栈

- **前端**：原生 HTML/CSS/JS (ES Module)
- **Markdown 解析**：[marked.js](https://marked.js.org/) (CDN)
- **ZIP 打包**：[JSZip](https://stuk.github.io/jszip/) (CDN)
- **后端**：Cloudflare Pages Functions (Edge Runtime)
- **部署**：Cloudflare Pages + Wrangler CLI
- **设计**：iOS 风格毛玻璃 (Glassmorphism) + CSS 自定义属性

## 部署

### Cloudflare Pages 部署（完整功能）

1. 将项目推送到 GitHub
2. 在 Cloudflare Pages 中导入仓库
3. 构建配置：根目录设为 `/`，输出目录设为 `/`
4. 部署完成后即可使用全部功能

### 静态部署（仅写作模式）

将 `index.html`、`main.js`、`styles.css` 上传到任意静态托管服务即可。
