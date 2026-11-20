# 从源码构建 Inkbrisk

[返回项目首页](../README.md)

## 准备环境

- Linux，Node.js 24 或更新版本，pnpm `12.6.0`
- JDK 21，Android SDK Platform 36 与 Build Tools 35.0.0

让 `JAVA_HOME` 和 `ANDROID_HOME` 分别指向 JDK 和 Android SDK，并接受所用 SDK 组件的许可证。以下命令从仓库根目录运行。

```bash
pnpm install --frozen-lockfile
pnpm type
pnpm lint
```

## 开发预览与调试 APK

- `pnpm dev` 在 `http://localhost:8090` 启动浏览器预览。Android 原生功能可在调试 APK 中验证。 [浏览器预览的 Key 存储方式](../PRIVACY.md#设备与开发环境)
- `pnpm apk:debug` 构建 Web 前端、同步 Capacitor 资源，并通过 Gradle Wrapper 生成 `artifacts/inkbrisk-debug.apk`。

历史 ZIP 的归档格式和导入校验规则见[历史导入导出](../src/services/chat/history/README.md)。

## 构建使用自有签名的 APK

如需自行签名，可以用 JDK 的 `keytool` 创建一个 PKCS12 密钥库。示例中的 `/path/to/inkbrisk.p12` 请替换为你自己的私有路径。覆盖安装自行签名的 APK 时，需要沿用同一签名密钥。

```bash
keytool -genkeypair -storetype PKCS12 -alias inkbrisk \
  -keyalg RSA -keysize 3072 -validity 10000 \
  -keystore /path/to/inkbrisk.p12
```

在 Bash 中提供构建所需的两个变量。`INKBRISK_KEYSTORE` 使用绝对路径，密钥库和密钥使用同一个密码。

```bash
(
  export INKBRISK_KEYSTORE='/path/to/inkbrisk.p12'
  read -rs -p '输入签名密码 ' INKBRISK_KEY_PASSWORD || exit
  printf '\n'
  export INKBRISK_KEY_PASSWORD
  pnpm apk
)
```

`pnpm apk` 在 `artifacts/` 下生成两份文件。

| 文件                      | 用途                                           |
| ------------------------- | ---------------------------------------------- |
| `deepseek-mobile.apk`     | 已签名的 Android 发布包                        |
| `THIRD-PARTY-NOTICES.txt` | 项目许可证和随包第三方声明，可供下载者直接阅读 |

请将签名密钥和密码保存在私有位置。

## 第三方许可来源

签名 APK 中的 `assets/public/LICENSE` 是项目的 MIT 许可证。构建时还会生成 `assets/public/WEB-LICENSES.txt` 与 `assets/ANDROID-LICENSES.txt`，并将三者汇总为 `THIRD-PARTY-NOTICES.txt`。

- Web 声明收录 pnpm 依赖提供的许可文件（含类型包），以及 Mermaid 等图表库预先打包的代码所附声明。 [图表库内嵌组件声明](../licenses/WEB-EMBEDDED.txt)
- KaTeX 化学公式扩展在 MIT 许可下改编，保留了 MathJax 原代码的 Apache 2.0 声明。随包字体使用 SIL OFL 1.1，版权人与保留字体名称见[字体声明](../licenses/KATEX-FONTS.txt)。 [KaTeX mhchem 源码](https://github.com/KaTeX/KaTeX/blob/v0.18.2/contrib/mhchem/mhchem.js)
- Android 声明包含运行库提供的许可和版权文本、Cordova 的 `NOTICE`，以及 Kotlin JVM 运行库的补充声明。 [Cordova 14.0.1 NOTICE](https://github.com/apache/cordova-android/blob/14.0.1/NOTICE) · [Kotlin 2.0.21 许可目录](https://github.com/JetBrains/kotlin/tree/v2.0.21/license)
