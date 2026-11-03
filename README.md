# 数学花园

面向约 8 岁儿童的纯前端加减法练习。一局 18 题，使用数字键盘作答，提供轻量提示、可视化纠错、技能总结和易错题复盘。

## 本地运行

应用没有构建步骤或第三方运行时依赖。在这个目录启动任意静态文件服务器即可：

```sh
python3 -m http.server 8080
```

然后打开 `http://127.0.0.1:8080/`。

## GitHub Pages

仓库推送到 GitHub 后，在仓库的 **Settings → Pages** 中把发布来源设为 **GitHub Actions**。之后推送到 `main` 分支会通过 `.github/workflows/pages.yml` 自动部署。

## 结构

- `index.html`：页面语义结构
- `styles.css`：视觉系统、响应式布局和动效
- `generator.js`：18 题练习生成器和可视化解释数据
- `app.js`：答题状态、键盘输入、本地存档和结果总结
- `designs/math-garden/`：可编辑的 Design canvas 设计稿

学习记录只保存在当前浏览器的 `localStorage` 中；应用没有后端，也不收集个人信息。
