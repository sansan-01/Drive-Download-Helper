# 极速文件链接 (File Link Accelerator)

这是一个部署在 **Cloudflare Workers** 上的文件直链加速服务。它可以将 Google Drive 和 Dropbox 的分享链接转换为高速、不经过本地流量的代理下载链接，有效解决部分地区下载速度慢或无法下载的问题。

![项目用户界面截图](./assets/screenshot.webp)

## ✨ 功能特性

  - **高速代理**: 利用 Cloudflare 的全球网络为文件下载提供加速。
  - **支持主流网盘**: 完美支持 Google Drive 和 Dropbox 的文件分享链接。
  - **智能处理**:
      - **Google Drive**: 支持公开文件、病毒扫描确认页面和允许列表内的下载跳转。
      - **Dropbox**: 自动将分享链接转换为强制下载链接 (`dl=1`)。
  - **目标限制**: 仅代理允许列表 (`ALLOWED_HOSTS`) 中的 HTTPS 下载主机及 Dropbox 分配的下载子域名。
  - **一键部署**: 无需服务器，代码复制粘贴到 Cloudflare Workers 即可上线。
  - **现代化前端**: 简洁美观的 UI 界面，支持浅色/深色模式自动切换，适配移动设备。

## 🚀 工作原理

此 Worker 的核心原理是作为中间代理。当你访问 `https://your-worker.workers.dev/https://drive.google.com/file/d/xxx/view` 时：

1.  **拦截请求**: Cloudflare Worker 获取路径中的目标文件链接 (`https://drive.google.com/...`)。
2.  **验证链接**: Worker 检查目标为 HTTPS 下载地址，且主机符合 `ALLOWED_HOSTS` 规则。
3.  **后端请求**: Worker 向文件服务发起 GET 或 HEAD 请求，并转发分段下载和条件请求所需的标头。
4.  **处理重定向**: Worker 验证下载跳转的目标，将允许的 `Location` 地址重写为 Worker 链接。
5.  **处理确认页面**: Google Drive 的下载确认表单在隔离页面中显示，并通过 Worker 提交。
6.  **传输文件**: Worker 以附件形式流式传输文件。

通过这种方式，用户的整个下载过程始终与 Cloudflare 节点交互，从而实现了加速和跨区域访问的目的。

## 🛠️ 部署指南

部署过程非常简单，只需要一个 Cloudflare 账户即可。

1.  **登录 Cloudflare**: 打开你的 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  **进入 Workers**: 在左侧菜单中，选择 `Workers & Pages`。
3.  **创建服务**: 点击 `Create application` -\> `Create Worker`。
4.  **命名服务**: 为你的 Worker 指定一个你喜欢的子域名（例如 `my-file-proxy`），然后点击 `Deploy`。
5.  **编辑代码**: 点击 `Edit code`，将仓库中 `worker.js` 的 **全部代码** 复制粘贴到在线编辑器中，覆盖原有的示例代码。
6.  **配置 (可选)**: 你可以根据需要修改代码顶部的 `用户配置区域`。
    ```javascript
    // == 用户配置区域开始 ==

    // 版本号 (会显示在页面页脚)
    const SCRIPT_VERSION = 'v1.0.1';

    // 允许代理的域名列表
    const ALLOWED_HOSTS = [
      'drive.google.com',
      'www.dropbox.com',
      'drive.usercontent.google.com',
      'dl.dropboxusercontent.com',
    ];

    // == 用户配置区域结束 ==
    ```
7.  **保存并部署**: 点击右上角的 `Save and deploy` 按钮。

完成！现在你可以访问 `https://<你的Worker名称>.<你的子域>.workers.dev` 来使用你的文件加速服务了。

## 📝 使用方法

1.  打开你部署好的 Worker 服务地址。
2.  将可公开下载的 Google Drive 或 Dropbox HTTPS 分享链接粘贴到输入框中。
3.  点击 **"生成链接"** 按钮。
4.  生成的代理链接会显示在下方，你可以 **"复制链接"** 或直接点击 **"立即下载"**。

需要登录的文件请在文件服务上打开。代理链接包含原始分享地址，请仅与有权访问文件的人共享。

## 📜 开源许可

本项目采用 [MIT License](https://www.google.com/search?q=./LICENSE) 开源。
