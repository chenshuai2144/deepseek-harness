# @deepseek-ai/dsh-client-ui-layout

[English](README.md) | 中文

外壳插件：三栏 AppFrame（侧栏 | 对话 | 详情，拖动手柄与让步链）加 `ctx.layout` 面板几何服务；它注册到运行时拥有的 `root` slot，并声明 `sidebar.agent`、`conversation`、`details`、`details.home`、`details.changes`、`details.files`、`details.file`、`details.browser`、`details.scm` 和 `shell.overlay`。左栏是 Agent 会话列表。右栏首页是基于现有客户端投影的任务概览：它显示 Session 状态和错误、Goal 与 Plan 状态、子代理和后台任务数量、正在运行的工具、排队消息、待处理交互，以及这些记录标识的实时活动。工作区操作会打开 Changes（SCM）、File 和 Browser；Terminal 在具备真实占用方之前不出现。任务概览不发起 RPC，也不拥有业务状态。视图选择、SCM 文件选择、File 选择和 Browser 地址存在 layout store 中，从不进入会话日志。侧边栏的缩放边界是不可见命中条带，详情栏边界则保留其浮动胶囊；让步期间只有详情栏会收缩并随后自动关闭。关闭的侧边栏仍保留 56px 控制栏，详情栏则关闭到零宽度。该包还提供主题呈现器：它消费解析后的 `ctx.theme` 快照，并将其投影到 document（用 `html { color-scheme }` 驱动原生 UA 控件，依据当前配色方案设置 `body[data-ds-dark-theme]`，并将主题的别名 token 设为 body 上的内联变量，同时拥有一个 `<meta name="theme-color">`，其内容随计算后的 body 背景色更新）。在应用调色板和 token 后进行测量，可确保渲染后的背景成为唯一的颜色依据；呈现器在 dispose（资源释放）时会移除其自有的元数据节点，并一并清除其写入的其他全局状态。

框架还拥有全局任务中心、通知收件箱和应用命令注册表。任务中心根据现有 Session 与后台任务投影，把非空白根 Session 聚合为“运行中”、“等待我”、“已完成”或“失败”；选择一行会打开对应 Session。收件箱集中显示现有的完成边沿、待处理交互和后台任务失败信号。`Ctrl+K` 打开各插件贡献的应用命令，`Ctrl+P` 打开 File 栏的快速搜索。在 Electron 外壳中，新的完成与待处理边沿经沙箱化 preload 桥转发为操作系统原生通知。

AppFrame 始终挂载会话栏和详情栏；已连接 Session 通过 `SessionProvider` 渲染。布局 store 是瞬时状态，侧边栏和工作区首页以默认宽度启动，且该 store 从不读写 `localStorage`。hero 和其他未选中状态会将详情栏的渲染宽度派生为零，但不会改变存储的宽度偏好。AppFrame 会跨越这些状态保留最后一个非 blank 会话 id：首个会话打开工作区首页；返回同一会话时恢复其未改变的宽度；选择不同会话时，右栏会在绘制前回到首页。会话 owner share 为空，侧边栏 owner share 只包含 `collapsed` 和 `width`；注册方通过标准钩子获取业务数据，并从各自的 inject 接口获取操作。

`/client` 导出表层包含插件主体（`apply`／`inject`）、`LayoutController` 和 owner-share 接口。AppFrame、面板 store 与让步求解器仍属于包内部。

## 模型体验

无。布局外壳管理浏览器查看状态；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **面板几何信息是瞬时状态**：重新加载会恢复侧边栏默认值和工作区首页；在不同会话 id 之间切换会把右栏带回首页，而未选中表面会以零宽度渲染详情栏，但不会修改几何信息。
- **让步链自动关闭通过推导零宽度实现，不会改动宽度偏好**：窗口变宽时面板会自行恢复；消费方禁止把 store 中的详情宽度当作实际渲染状态。
- **挤压重排期间不提供滚动锚定**：布局变化可能移动读者的 viewport。
- **任务概览是实时投影，不是任务流水账**：它汇总当前 Session 窗口和列表镜像；已结算的工具调用和历史任务仍保留在 Chat、Trajectory 和现有任务列表中，不会累积到首页。
