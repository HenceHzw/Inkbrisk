# Inkbrisk 隐私说明

Inkbrisk 的 Android 版从手机直连 DeepSeek。对话历史保存在应用私有存储中；发送消息时，本轮输入与生成回复所需的对话上下文会发给 DeepSeek。 [DeepSeek 开放平台隐私政策](https://cdn.deepseek.com/policies/zh-CN/deepseek-open-platform-privacy-policy.html)

## API Key

在 Android 原生弹窗中输入 Key。应用使用 Android Keystore 中的密钥加密保存 Key，由原生 HTTPS 请求将它用于 DeepSeek 鉴权。应用网页界面只获取是否已配置 Key 的状态。发布版关闭了应用调试、WebView 调试和 Capacitor 日志。

在「设置 → 数据管理」可更换或清除本机 Key。如果担心 Key 已泄露，请在 DeepSeek 开放平台撤销旧 Key，再在 app 中输入新 Key。 [DeepSeek API Key 管理](https://platform.deepseek.com/api_keys)

## 数据何时发送给 DeepSeek

| 功能     | 发送的数据                                                                 |
| -------- | -------------------------------------------------------------------------- |
| 发送消息 | 本轮消息和相关历史上下文。若已手动设置地区，Flash 请求可能同时携带该地区。 |
| 上传附件 | 选择文件后先在本机预览，点击发送后才上传。                                 |
| 语音输入 | 将录音发给 DeepSeek 转写。                                                 |
| 朗读回复 | 将要朗读的回复文本发给 DeepSeek 合成语音。                                 |

录音需要麦克风权限。拍照会调用系统相机，选取现有图片和文件时使用系统选择器。地区信息来自用户手动填写。

## 云端附件

Inkbrisk 新上传的文件有效期为 7 天。上传 JPEG、PNG 或 WebP 时，应用会清理上传副本中的常见图片元数据（如 EXIF），原件保留在本机。文档中的作者信息等元数据可能随原文件上传。需要重新上传过期或失效的历史附件时，应用会请你确认。 [DeepSeek Files API](https://api-docs.deepseek.com/zh-cn/guides/files_api/)

在「设置 → 数据管理 → DeepSeek 云端附件」可以查看并逐个删除当前 DeepSeek 账户的附件，列表也可能包含其他客户端上传的文件。带下划线的文件名可以点击预览，图片取自本机保存的原件。

删除本机对话会清理本地记录。云端删除只处理选中的 DeepSeek 文件；本机对话和附件副本仍可保留。DeepSeek 对已接收的其他请求数据的处理方式见其[开放平台隐私政策](https://cdn.deepseek.com/policies/zh-CN/deepseek-open-platform-privacy-policy.html)。

## 聊天备份

导出的 ZIP 为明文文件，包含会话数据及有本地副本的图片原件。其他附件只保留元数据，应用保存的 API Key 独立存储，不会进入备份。选择云盘目录保存时，云盘可能同步这份备份。

可导入兼容的 DeepSeek 历史 ZIP。确认导入会替换当前的本机对话与附件，迁移前可以先导出现有历史。

## 设备与开发环境

Android 应用沙箱限制其他应用读取 Inkbrisk 的私有文件。输入法、已授权的无障碍服务或具有系统级权限的应用可能接触屏幕、输入或数据。粘贴 Key 后可清除剪贴板。 [Android 应用沙箱](https://source.android.com/docs/security/app-sandbox)

浏览器开发预览会把 API Key 存在当前页面的 `localStorage` 中。开发预览请使用受信任的本地环境。
