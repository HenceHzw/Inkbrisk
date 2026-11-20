# 获取 DeepSeek API Key

API Key 是 Inkbrisk 调用 DeepSeek API 时使用的凭据。用手机浏览器登录 DeepSeek 开放平台，创建并复制密钥，再将它粘贴到 Inkbrisk。

## 1. 登录 DeepSeek 开放平台

打开官方 API Key 管理页，按页面提示登录。已有 DeepSeek 账号可直接使用，新用户请先注册。若平台要求补充账号信息或完成验证，请按页面提示操作。 [DeepSeek API Key 管理](https://platform.deepseek.com/api_keys)

## 2. 创建并复制密钥

1. 登录后进入「API keys」页面，点击「创建 API key」。
2. 为密钥填写一个便于辨认的名称，例如 `Inkbrisk`，然后点击「创建」。
3. 在创建成功的窗口中复制完整密钥，再关闭窗口。下一步需要粘贴的是这串密钥，而「Inkbrisk」只是管理时使用的名称。

API Key 可用于消耗你的账户余额。请妥善保管，避免将完整密钥放进聊天、截图或 GitHub Issue。如果密钥已泄露，请在管理页撤销旧密钥，再创建一个新的。 [DeepSeek API Key 管理](https://platform.deepseek.com/api_keys)

## 3. 查看余额与用量

发送消息会产生 API 用量，由 DeepSeek 按实际用量计费。先用创建密钥的同一账号查看可用余额，余额不足时按需充值。 [DeepSeek 充值页面](https://platform.deepseek.com/top_up) · [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)

开始使用后，可用同一账号登录开放平台查看实际 API 用量。 [DeepSeek 用量查询](https://platform.deepseek.com/usage)

## 4. 在 Inkbrisk 中输入 API Key

1. 打开 Inkbrisk，在「输入 API Key 开始使用」提示中点击「验证并开始」。也可通过「设置 → 数据管理 → 请输入 API Key」打开输入窗口。
2. 在弹窗中粘贴完整密钥，再点击「验证并开始」。验证通过后，Inkbrisk 会保存密钥。
3. 回到聊天界面，发送一条简短消息。收到回复即表示配置成功。

如果提示 **API Key 无效**，请确认复制完整，并检查密钥是否仍在开放平台的管理列表中。已保存密钥时，可在「设置 → 数据管理」点击密钥旁的编辑按钮更换。如果提示 **账户余额不足**，请检查创建该密钥的账号余额。 [DeepSeek 错误码说明](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes/)

[返回 Inkbrisk 安装说明](../README.md#安装)
