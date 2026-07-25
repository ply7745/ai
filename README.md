# 微习惯打卡 (iOS · SwiftUI)

一个用 SwiftUI 写的极简习惯打卡 App：当日计数 `+1 / -1 / 重置`，通过 `UserDefaults` 持久化（杀进程/重开不丢），自带系统深色模式。对应安卓版「微习惯打卡」。

> 本工程用 **XcodeGen** 管理（`project.yml`），无需手写 `.pbxproj`。

## 目录结构
```
iOShabit/
├── project.yml                  # XcodeGen 工程描述
├── Sources/
│   ├── Info.plist
│   └── MyiOShabit/
│       ├── App/HabitApp.swift        # @main 入口
│       ├── Model/HabitCounter.swift  # @Observable 数据模型 + 持久化
│       ├── Views/ContentView.swift   # 主界面
│       └── Assets.xcassets
└── .github/workflows/build.yml  # 云端编译 IPA
```

## 方式一：在 Mac 上本地运行（若有 Mac）
```bash
brew install xcodegen
cd iOShabit
xcodegen generate
open MyiOShabit.xcodeproj   # Xcode 里选模拟器/真机 → Run
```

## 方式二：Windows 用户 —— 云端编译 + 侧载安装（无需 Mac）
1. **建仓库并推送**：在 GitHub 新建空仓库，把本目录内容推上去（推到 `main` 分支）。
2. **触发构建**：推送后自动跑 Actions；也可在仓库 `Actions → Build iOS IPA → Run workflow` 手动触发。
3. **下载 IPA**：构建完成后，在 Actions 运行结果页下载产物 `MyiOShabit-unsigned`（即无签名 IPA）。
4. **装到 iPhone（AltStore，免费 Apple ID 即可，全程 Windows）**：
   - 电脑装 [AltServer](https://altstore.io/)（Windows 版），手机装 AltStore。
   - 用数据线连手机，AltServer 用你的**免费 Apple ID** 给 AltStore 签名。
   - 手机上用 AltStore 打开下载的 `MyiOShabit.ipa` → 安装。
   - 免费签名有效期 7 天，到期在 AltServer 上「刷新」即可。

> 说明：GitHub 免费 macOS runner 没有你的 Apple 签名证书，所以这里产出**无签名 IPA**，由 AltStore 在手机端用免费 Apple ID 现场签名安装——这是 Windows 用户免 Mac 装真机的可行链路。若你有付费开发者账号，可改工作流走正式签名（需把证书/描述文件作为 Secrets 注入）。

## 重新构建
改完 Swift 代码推送到 `main` 即可，Actions 会自动重新编译并产出新 IPA。
