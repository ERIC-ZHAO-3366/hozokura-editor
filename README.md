# Hozokura 独立文章编辑器

这是一个独立于主题代码的文章编辑器，专门用于写作 Hozokura 主题文章。

## 已支持短代码

- `[warn]...[/warn]`
- `[wrong]...[/wrong]`
- `[right]...[/right]`
- `[hide]...[/hide]`

## 功能

- Markdown 编辑 + 实时预览
- 一键插入短代码
- 一键插入常用结构（H2/链接/代码块）
- 导出 `.md` 文件

## 使用方式

直接在浏览器打开 `index.html` 即可使用。

如果你希望通过本地服务器访问（推荐，避免某些浏览器对模块加载限制）：

```powershell
cd hozokura-editor
npx serve .
```

然后打开输出地址。
