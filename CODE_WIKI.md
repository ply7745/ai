# Code Wiki — 微习惯打卡 (MyiOShabit)

> 一份面向开发者的项目代码 Wiki，覆盖整体架构、模块职责、关键类与函数、依赖关系与运行方式。

---

## 1. 项目概述

| 项 | 内容 |
|---|---|
| 项目名称 | 微习惯打卡 (MyiOShabit) |
| 平台 | iOS（iPhone） |
| 最低部署版本 | iOS 17.0 |
| 主要语言 | Swift 5.x |
| UI 框架 | SwiftUI |
| 工程管理工具 | XcodeGen（`project.yml` 驱动，无需手写 `.pbxproj`） |
| 持久化方案 | `UserDefaults`（轻量键值存储） |
| CI/CD | GitHub Actions（macOS runner 云端编译产出 unsigned IPA） |
| 项目定位 | 安卓版「微习惯打卡」对应的 iOS 极简版：当日计数 `+1 / -1 / 重置`，杀进程/重开不丢，自带系统深色模式 |

---

## 2. 整体架构

### 2.1 架构风格

本项目采用 **SwiftUI + `@Observable` 宏（Observation 框架）** 的轻量单向数据流架构，可视为 MVVM 的极简变体：

- **Model（状态 + 行为）**：`HabitCounter`，使用 `@Observable` 宏让 SwiftUI 自动追踪属性变化并刷新视图。
- **View**：`ContentView`，纯声明式 UI，通过 `@State` 持有 Model 实例。
- **App 入口**：`HabitApp`，`@main` 标注的 SwiftUI App，负责装配根视图。

无独立 ViewModel 层、无网络层、无第三方依赖，依赖 Apple 官方 SDK 完成 UI 渲染与持久化。

### 2.2 数据流

```
用户点击按钮 (+ / − / 重置)
        │
        ▼
HabitCounter.increment() / decrement() / reset()
        │  修改 @Observable 的 count 属性
        ├──▶ SwiftUI Observation 自动通知 ContentView 刷新
        │
        └──▶ didSet 钩子写入 UserDefaults（key: "habitCount"）

App 启动 → HabitCounter.init() → 从 UserDefaults 读取上次值 → 恢复 UI
```

### 2.3 架构图（模块关系）

```
┌──────────────────────────────────────────────────────────┐
│                    HabitApp (@main)                      │
│              WindowGroup { ContentView() }              │
└──────────────────────────────────────────────────────────┘
                            │ 装配
                            ▼
┌──────────────────────────────────────────────────────────┐
│              ContentView (SwiftUI View)                 │
│  @State var counter = HabitCounter()                    │
│  - 显示 count（大号数字 + numericText 过渡动画）          │
│  - 按钮：减少 / 增加 / 重置                              │
│  - NavigationStack + 背景色 + 无障碍标签                 │
└──────────────────────────────────────────────────────────┘
                            │ 持有并调用
                            ▼
┌──────────────────────────────────────────────────────────┐
│         HabitCounter (@MainActor @Observable)           │
│  - count: Int (private(set))                             │
│  - increment() / decrement() / reset()                  │
│  - didSet → UserDefaults 持久化                          │
│  - init() → 从 UserDefaults 恢复                         │
└──────────────────────────────────────────────────────────┘
                            │ 读写
                            ▼
                  UserDefaults (key: "habitCount")
```

---

## 3. 目录结构

```
iOShabit/
├── .github/
│   └── workflows/
│       └── build.yml                 # GitHub Actions：云端编译 IPA
├── .gitignore                        # 忽略 Xcode/XcodeGen 产物
├── project.yml                       # XcodeGen 工程描述（核心配置入口）
├── push.ps1                          # Windows 一键推送脚本（触发云端编译）
├── README.md                         # 用户文档
└── Sources/
    ├── Info.plist                    # App 元信息（显示名、启动屏）
    └── MyiOShabit/
        ├── App/
        │   └── HabitApp.swift        # @main 入口
        ├── Model/
        │   └── HabitCounter.swift    # @Observable 数据模型 + 持久化
        ├── Views/
        │   └── ContentView.swift     # 主界面
        └── Assets.xcassets           # 资源目录
            ├── Contents.json
            ├── AccentColor.colorset/  # 强调色（系统默认）
            └── AppIcon.appiconset/   # App 图标占位（多尺寸）
```

---

## 4. 主要模块职责

### 4.1 App 入口模块 — `Sources/MyiOShabit/App/HabitApp.swift`

- 职责：SwiftUI App 的程序入口（`@main`），声明 `WindowGroup` 场景并挂载根视图 `ContentView`。
- 特点：极简，不包含任何状态/路由逻辑；遵循 SwiftUI App 生命周期（取代传统 `UIApplicationDelegate`）。

### 4.2 Model 模块 — `Sources/MyiOShabit/Model/HabitCounter.swift`

- 职责：封装「当日打卡计数」的状态与行为，并把状态持久化到 `UserDefaults`。
- 设计要点：
  - 使用 `@Observable` 宏（iOS 17+ Observation 框架），让 SwiftUI 在 `count` 变化时自动刷新依赖视图。
  - 使用 `@MainActor` 保证所有 UI 相关操作在主线程执行。
  - `count` 为 `private(set)`：外部只读，修改必须通过语义化方法。
  - 持久化通过属性 `didSet` 钩子自动触发，无需在调用处手动保存。

### 4.3 View 模块 — `Sources/MyiOShabit/Views/ContentView.swift`

- 职责：渲染主界面并响应用户交互。
- 界面元素：
  - 标题 `今日打卡`（`title3`，次要色）。
  - 大号数字显示 `counter.count`（96pt 粗体 rounded，`.tint` 色），配合 `contentTransition(.numericText())` 实现数字滚动过渡 + spring 动画。
  - 减号/加号圆形按钮（`-` 用 `.thinMaterial` 背景，`+` 用 `.tint` 背景白字）。
  - 「重置」破坏性按钮（`.bordered` 样式，`.destructive` role）。
  - `NavigationStack` 包裹，标题「微习惯打卡」，inline 模式。
  - 无障碍：`accessibilityLabel("减少")` / `accessibilityLabel("增加")`。
  - 背景使用 `.systemGroupedBackground`，天然适配深色模式。

### 4.4 资源模块 — `Sources/MyiOShabit/Assets.xcassets/`

- `AppIcon.appiconset/Contents.json`：声明 iOS App 图标的多尺寸占位（20/29/40/60/76/83.5/1024 等，2x/3x），当前未填入实际图片。
- `AccentColor.colorset/Contents.json`：App 强调色占位（universal idiom，未指定具体颜色，回退系统 tint）。
- `Contents.json`：资源目录根元信息。

### 4.5 工程配置模块 — `project.yml` / `Sources/Info.plist`

- `project.yml`：XcodeGen 工程描述文件，定义：
  - 工程名 `MyiOShabit`，`bundleIdPrefix: com.example`。
  - 部署目标 iOS 17.0。
  - 全局设置：`PRODUCT_BUNDLE_IDENTIFIER = com.example.myhabit`，指定 Info.plist 与 Asset Catalog 编译参数。
  - 单一 target `MyiOShabit`（application / iOS），源码路径指向 `Sources`。
- `Info.plist`：
  - `CFBundleDisplayName = 微习惯打卡`（Home 屏图标下显示名）。
  - `UILaunchScreen` 为空 dict（使用默认启动屏，无自定义启动图）。

### 4.6 CI/CD 模块 — `.github/workflows/build.yml`

- 触发条件：`push` 到 `main` 分支 或 `workflow_dispatch` 手动触发。
- 运行环境：`macos-15` runner。
- 流程：
  1. Checkout 代码。
  2. `xcode-select` 切到 `/Applications/Xcode.app`。
  3. `brew install xcodegen` 安装 XcodeGen。
  4. `xcodegen generate` 生成 `.xcodeproj`。
  5. `xcodebuild build` 以 Release 配置、`generic/platform=iOS`、关闭签名（`CODE_SIGNING_ALLOWED=NO`）编译。
  6. 找到 `.app` 产物，打包成 `Payload/MyiOShabit.app` → `zip` 成 `MyiOShabit.ipa`。
  7. `actions/upload-artifact@v4` 上传名为 `MyiOShabit-unsigned` 的产物。

### 4.7 辅助脚本 — `push.ps1`

- 面向 Windows 用户的一键推送脚本，将本地代码推到指定 GitHub 远程仓库以触发云端编译。
- 行为：切到脚本所在目录 → 把当前分支改名为 `main` → 重置 `origin` 远程 → `git push -u origin main`。
- 安全性：仅做本地→远程推送，无破坏性 git 操作；若 `$REMOTE` 仍为占位符则提示退出。

---

## 5. 关键类与函数说明

### 5.1 `HabitApp`（[HabitApp.swift](file:///workspace/Sources/MyiOShabit/App/HabitApp.swift)）

```swift
@main
struct HabitApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

| 成员 | 说明 |
|---|---|
| `@main` | 标记程序入口，由 SwiftUI 运行时调用。 |
| `body: some Scene` | 返回 `WindowGroup` 场景，内嵌 `ContentView` 作为根视图。 |

### 5.2 `HabitCounter`（[HabitCounter.swift](file:///workspace/Sources/MyiOShabit/Model/HabitCounter.swift)）

```swift
@MainActor
@Observable
final class HabitCounter {
    private(set) var count: Int {
        didSet { UserDefaults.standard.set(count, forKey: Self.storageKey) }
    }
    private static let storageKey = "habitCount"

    init() { self.count = UserDefaults.standard.integer(forKey: Self.storageKey) }

    func increment() { count += 1 }
    func decrement() { if count > 0 { count -= 1 } }
    func reset() { count = 0 }
}
```

| 成员 | 签名 | 职责 / 行为 |
|---|---|---|
| `@MainActor` | 类标注 | 限定该类所有成员在主线程执行，保障 UI 安全。 |
| `@Observable` | 类标注（宏） | 自动生成属性变化通知，使 SwiftUI 视图在 `count` 变化时自动刷新。 |
| `final class` | 类修饰 | 禁止继承，便于编译器优化。 |
| `count` | `private(set) var count: Int` | 当前打卡数。外部只读；`didSet` 钩子在每次赋值后写入 `UserDefaults`。 |
| `storageKey` | `private static let storageKey = "habitCount"` | `UserDefaults` 的存储键，私有常量。 |
| `init()` | `init()` | 构造时从 `UserDefaults` 读取上次值（首次为 0），完成状态恢复。 |
| `increment()` | `func increment()` | 计数 +1。 |
| `decrement()` | `func decrement()` | 计数 -1，**下界保护**：`count > 0` 才递减，不会出现负数。 |
| `reset()` | `func reset()` | 计数清零。 |

**关键设计点：**
- 持久化是「写穿透」式：每次 `count` 变更即同步落盘，无需手动 `save()`，进程被杀也不会丢。
- `init()` 内部直接赋值 `self.count = ...`，会触发 `didSet`（Swift 中初始化器内对存储属性赋值默认**不触发** `didSet`，但因 `count` 此刻已是首次赋初值，等价于恢复，不会重复写入覆盖相同值；实际行为依赖 Swift 版本语义，不影响功能正确性）。

### 5.3 `ContentView`（[ContentView.swift](file:///workspace/Sources/MyiOShabit/Views/ContentView.swift)）

```swift
struct ContentView: View {
    @State private var counter = HabitCounter()
    var body: some View { ... }
}
```

| 成员 / 视图节点 | 作用 |
|---|---|
| `@State private var counter = HabitCounter()` | 视图本地持有 Model；`@State` 保证 Model 实例在视图重建时保持稳定，配合 `@Observable` 实现细粒度刷新。 |
| `NavigationStack { ... }` | 提供导航容器与标题栏。 |
| `Text("今日打卡")` | 副标题。 |
| `Text("\(counter.count)")` | 大号数字（96pt bold rounded + `.tint`），使用 `contentTransition(.numericText())` 实现数字位滚动过渡，`.animation(.spring(duration: 0.3), value: counter.count)` 提供 spring 动画。 |
| 减号按钮 | 调 `counter.decrement()`，圆形 `.thinMaterial` 背景，`accessibilityLabel("减少")`。 |
| 加号按钮 | 调 `counter.increment()`，圆形 `.tint` 背景 + 白字，`accessibilityLabel("增加")`。 |
| 重置按钮 | `Button(role: .destructive)` + `.bordered` 样式，调 `counter.reset()`。 |
| `.navigationTitle("微习惯打卡")` / `.inline` | 导航栏标题。 |
| `.background(Color(.systemGroupedBackground))` | 系统分组背景色，自动适配浅色/深色模式。 |

---

## 6. 依赖关系

### 6.1 第三方依赖

**无。** 项目不引入任何 SPM / CocoaPods 包，全部依赖 Apple 官方 SDK：

| 框架 | 用途 |
|---|---|
| `SwiftUI` | 声明式 UI（`App`、`View`、`NavigationStack`、`Button`、`Text` 等）。 |
| `Foundation` | `UserDefaults` 持久化。 |
| `Observation` | `@Observable` 宏（隐式由 `@Observable` 展开，`import Observation` 显式声明）。 |

### 6.2 构建期工具依赖

| 工具 | 用途 | 安装方式 |
|---|---|---|
| Xcode 15+（含 iOS 17 SDK） | 编译 Swift / SwiftUI 代码 | macOS 系统自带或 App Store |
| XcodeGen | 由 `project.yml` 生成 `.xcodeproj` | `brew install xcodegen` |
| Git | 版本控制 / 推送触发 CI | 系统自带 |

### 6.3 模块内依赖图

```
HabitApp  ──依赖──▶  ContentView
ContentView ──持有──▶  HabitCounter (@State)
HabitCounter ──读写──▶ UserDefaults
HabitCounter ──标注──▶ @Observable (Observation 框架)
                                └─▶ 驱动 ContentView 自动刷新
```

### 6.4 工程配置依赖

- `project.yml` 引用 `Sources/Info.plist` 作为 `INFOPLIST_FILE`。
- `project.yml` 引用 `Sources` 作为源码路径（含 `Assets.xcassets`）。
- `project.yml` 引用 Asset Catalog 名 `AppIcon` / `AccentColor`。

---

## 7. 项目运行方式

### 7.1 方式一：Mac 本地运行

```bash
# 1. 安装 XcodeGen
brew install xcodegen

# 2. 进入工程根目录（含 project.yml）
cd iOShabit

# 3. 生成 Xcode 工程（生成 MyiOShabit.xcodeproj）
xcodegen generate

# 4. 打开工程
open MyiOShabit.xcodeproj
# 在 Xcode 中选择模拟器或真机 → 按 ⌘R 运行
```

> 要求：macOS + Xcode 15+（含 iOS 17 SDK）。

### 7.2 方式二：Windows 用户云端编译 + 侧载（无需 Mac）

1. **建仓库并推送**：在 GitHub 新建空仓库，把本目录内容推到 `main` 分支。可使用 `push.ps1` 一键推送：
   - 编辑 `push.ps1` 顶部 `$REMOTE` 为你的仓库地址。
   - 右键「使用 PowerShell 运行」。
2. **触发构建**：推送后 GitHub Actions 自动跑；也可在仓库 `Actions → Build iOS IPA → Run workflow` 手动触发。
3. **下载 IPA**：构建完成后，在 Actions 运行结果页下载产物 `MyiOShabit-unsigned`（无签名 IPA）。
4. **装到 iPhone（AltStore，免费 Apple ID）**：
   - 电脑装 [AltServer](https://altstore.io/)（Windows 版），手机装 AltStore。
   - 数据线连手机，AltServer 用免费 Apple ID 给 AltStore 签名。
   - 手机上用 AltStore 打开下载的 `MyiOShabit.ipa` → 安装。
   - 免费签名有效期 7 天，到期在 AltServer 上「刷新」即可。

> 说明：GitHub 免费 macOS runner 没有用户的 Apple 签名证书，所以产出**无签名 IPA**，由 AltStore 在手机端用免费 Apple ID 现场签名安装。若拥有付费开发者账号，可改工作流走正式签名（把证书/描述文件作为 Secrets 注入）。

### 7.3 重新构建

改完 Swift 代码推送到 `main` 即可，Actions 会自动重新编译并产出新 IPA。

---

## 8. CI/CD 流水线详解

### 8.1 触发条件

- `push` 到 `main` 分支
- `workflow_dispatch`（手动触发）

### 8.2 Job 步骤（[build.yml](file:///workspace/.github/workflows/build.yml)）

| Step | 命令 / 动作 | 作用 |
|---|---|---|
| Checkout | `actions/checkout@v4` | 拉取代码到 runner。 |
| Select Xcode | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` | 指定使用的 Xcode。 |
| Install XcodeGen | `brew install xcodegen` | 安装工程生成工具。 |
| Generate Xcode project | `xcodegen generate` | 由 `project.yml` 生成 `MyiOShabit.xcodeproj`。 |
| Build app (unsigned) | `xcodebuild build -project MyiOShabit.xcodeproj -scheme MyiOShabit -configuration Release -destination 'generic/platform=iOS' -derivedDataPath build CODE_SIGNING_ALLOWED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS=""` | Release 编译 iOS 通用产物，关闭签名。 |
| Package IPA | `find ... → cp → zip -r MyiOShabit.ipa Payload` | 把 `.app` 打包成标准 IPA（Payload 目录结构）。 |
| Upload IPA artifact | `actions/upload-artifact@v4` | 上传产物名为 `MyiOShabit-unsigned`，路径 `MyiOShabit.ipa`。 |

### 8.3 产物

- 名称：`MyiOShabit-unsigned`
- 内容：`MyiOShabit.ipa`（无签名，需 AltStore/签名工具现场签名后安装）

---

## 9. 配置项参考

### 9.1 `project.yml` 关键字段

| 字段 | 值 | 含义 |
|---|---|---|
| `name` | `MyiOShabit` | 工程名 |
| `options.bundleIdPrefix` | `com.example` | Bundle ID 前缀 |
| `options.deploymentTarget.iOS` | `"17.0"` | 最低部署版本 |
| `settings.base.PRODUCT_BUNDLE_IDENTIFIER` | `com.example.myhabit` | App Bundle ID |
| `settings.base.INFOPLIST_FILE` | `Sources/Info.plist` | Info.plist 路径 |
| `settings.base.ASSETCATALOG_COMPILER_APPICON_NAME` | `AppIcon` | 图标资源名 |
| `settings.base.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` | `AccentColor` | 全局强调色资源名 |
| `targets.MyiOShabit.type` | `application` | 应用型 target |
| `targets.MyiOShabit.platform` | `iOS` | 目标平台 |
| `targets.MyiOShabit.sources` | `Sources` | 源码根路径 |

### 9.2 `Info.plist` 关键字段

| Key | 值 | 含义 |
|---|---|---|
| `CFBundleDisplayName` | `微习惯打卡` | Home 屏图标下显示名 |
| `UILaunchScreen` | `<dict/>` | 默认启动屏（无自定义启动图） |

---

## 10. 设计要点与最佳实践总结

1. **极简依赖**：零第三方库，纯 Apple SDK，降低维护与供应链风险。
2. **Observation 而非 Combine**：采用 iOS 17 的 `@Observable` 宏，比传统 `ObservableObject` + `@Published` 更细粒度、更少样板代码。
3. **状态封装**：`count` 为 `private(set)`，外部只能通过语义方法修改，避免越权直改。
4. **写穿透持久化**：`didSet` 自动落盘，调用方零心智负担。
5. **线程安全**：`@MainActor` 标注 Model，确保 UI 线程一致。
6. **下界保护**：`decrement()` 内置 `count > 0` 判断，防止负数。
7. **无障碍**：为图标按钮提供 `accessibilityLabel`，支持 VoiceOver。
8. **深色模式**：使用系统语义背景色 `.systemGroupedBackground`，自动跟随外观。
9. **工程免手写 pbxproj**：XcodeGen + `project.yml` 让工程文件可文本化、可 diff、可复现生成。
10. **云端编译链路**：GitHub Actions + AltStore 组合，让无 Mac 的 Windows 用户也能产出并安装真机 IPA。
