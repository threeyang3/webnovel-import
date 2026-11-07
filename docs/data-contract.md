# 数据接口约定（schema 1）

适用于 0.3.0 候选构建。schema 1 仅约定 Webnovel Import 的独立笔记格式。

## 本地 Work、来源 Source、个人数据

| 逻辑层 | 持久化位置 | 写入边界 |
|---|---|---|
| Work | 顶层 `uid`、`title`、`authors`、`cover`、`summary`、`first_published_year`、`serialization_status` | 新建时生成独立 `work-UUID`；已有 uid 不替换；资料按采用规则更新 |
| Source | `webnovel_import.sources[]` | 保存各平台最近已知的作品资料、来源证据及获取方式 |
| 采用记录 | `webnovel_import.adopted` | 保存上次插件采用值与归属，用于和当前 Work 值比较 |
| Personal Data | 用户已有字段及正文，例如 `reading_status`、`reading_progress`、`rating`、`review`、`notes` | 插件不定义默认值、不改名、不覆盖，不将这些字段加入来源资料 |

新建时另写 `type: work`、`media: webnovel`；已有字段不替换。正文只在首次创建时生成，以后刷新不重写正文。正文中的简介和封面是初始快照，最新采用资料以属性为准。

Source 与 Work 通过所在文件关联，一份笔记可包含多条 Source。来源身份是 `provider + id`，不是标题。外部 ID 始终为字符串；长数字 ID 不转 Number。本地作品身份不使用外部 ID。

无来源建档使用独立的 `ManualWorkDraft`。独立模式创建 `sources: []`，提供的字段保存为本地值，并记录 `adopted.*.source_key: manual:local` 保护用户后续清空。历史平台、链接和说明另存于 `webnovel_import.manual_reference`。首次补挂正式来源时，原位追加 Source 并保留本地 UID、个人属性及正文。

## Source 字段

规划中的 `external_id`、`source_url` 在现有 schema 中分别对应 `id`、`url`，本阶段不改键名。

| 字段 | 含义与约束 |
|---|---|
| `provider` / `id` / `url` | 已注册平台、字符串 ID、适配器生成的规范详情链接 |
| `title` / `authors` | 书名及作者数组，页面解析成功要求二者有效 |
| `description` / `cover_url` | 来源简介、原始 HTTP(S) 图片地址；不等于 Work 的截短简介或本地封面路径 |
| `tags` | 平台分类标签，不写入个人 tags |
| `serialization_status` | ongoing / completed / paused；自动来源的 unknown 不作为清空依据 |
| `word_count_text` | 保留网站显示精度，不将“万字”伪装为精确字数 |
| `first_published_at` / `first_published_year` | 仅明确作品级首发证据或人工补填。当前已验证的详情页样本未取得可靠作品级首发信息 |
| `last_updated_at` / `latest_chapter` | 网站显示的更新时间和最新章节，不等于作品首发时间；不推断时区 |
| `acquisition` | remote：普通 HTTP；html：用户提供页面；browser：浏览器采集；manual：人工补填 |
| `fetched_at` | 本次获取时间（ISO 字符串），不是平台更新时间，也不是每个字段发生变化的时间 |
| `evidence` | 字段名到证据说明的映射，可记录 DOM、元标签或结构化数据位置；identity 记录页级身份依据 |
| `warnings` | 本次获取的限制或缺失说明 |
| `retained_fields` | 本次未取得却沿用旧值的字段 → 该值最后被取得的时间；不能把旧值解释为本次已验证 |

这里的来源资料是经过适配器选择的元数据，不是完整原始 HTML、小说正文、Cookie 或账户信息。字段缺失、空简介和未知连载状态都按资料缺失处理，保留已知来源值。历史字段沿用时保留旧证据，并以 retained_fields 标记时间。

## 采用字段与保护规则

| Work 字段 | Source 字段 |
|---|---|
| title | title |
| authors | authors |
| summary | description（按设置截短） |
| cover | cover_url（优先采用下载成功的本地路径） |
| first_published_year | first_published_year |
| serialization_status | serialization_status |

每条采用记录当前包含：

- `value`：上次插件采用的基线值，**不是当前本地值**；用户修改后两者可以不同。
- `source_key`：通常为 `provider:id`；人工补填采用值为 `manual:provider:id`。
- `evidence`：当前只对人工采用记录保存说明；自动字段的证据在 sources 内，不能假称已逐字段复制到 adopted。

更新条件：没有采用记录且本地为空时可补填；有采用记录时，只有来源归属允许且本地仍等于基线才能更新。人工改值、人工清空、有内容但无采用记录、其他来源的采用值均保留。人工来源标记不能被普通远端刷新夺走。导入表单留空表示本次不采用，不是清空本地字段。

旧版表单存入的 `unknown` 在当前值仍等于人工采用记录中的 `unknown` 时，可由明确的来源状态补入。

封面下载失败会报告警告；若已有可用本地封面则保持原路径，新作品可保留远端地址。这个策略不代表失败的新图片已成功下载。

## 适配器输出协议

具体签名以 `src/adapters/types.ts` 为准，不为套用概念示例重写接口。

1. `matchUrl` 识别官网详情路径并生成规范 BookRef；公共入口先拒绝非 HTTP(S)、账户凭据及自定义端口。
2. `identities` 收集当前页身份，公共入口核对平台与 ID；推荐条目不能冒充当前作品身份。
3. `parse` 返回 SourceFields，包含资料、evidence、warnings；公共入口补 BookRef、获取时间与方式，并验证书名、作者。
4. `recoveryHint` 当前为静态文本；HTTP 状态由导入器加入消息。没有实际差异需求时不改成函数。
5. 可选 `browserCapture` 声明支持书签。书签用相同适配器解析当前已显示的 DOM，只通过剪贴板发送核对后的元数据。

适配器不执行网络、创建 Markdown、决定字段覆盖、跨平台合并或访问 Vault。所有来源使用同一导入器与合并规则。新增平台需核验真实页面、实现接口、注册并添加对应验证。

## 版本、时间与未来迁移

- `schema_version: 1` 仅管理 webnovel_import 命名空间；插件版本号与 schema 版本不是同一概念。
- 兼容现有 sources、adopted 和人工标记，不批量重写 YAML。未知 schema 或格式不兼容时拒绝覆盖目标文件。
- 当前没有 `adopted_at`、`last_synced_at` 或完整字段变化历史。fetched_at 与 retained_fields 只描述获取时效，不能补造首次采用时间。
- ownership 由采用基线、本地值及来源归属推导；本阶段不增设重复状态标记。
- 未来添加时间字段需允许旧记录缺失；没有历史证据的时间保持未知。破坏性格式变化必须另定迁移方案、备份和验收，不能随普通刷新静默迁移全库。
- 阶段 2 已增加完整书名与作者集合的候选提示，用户选择后才关联；同一来源仍优先自动定位。详细差异预览、来源切换权限与变化历史仍属于后续阶段。

## Media Core 规范交换

网文插件从现有作品资料预览或独立笔记的来源记录输出 `media-source/v2`。它使用 Media Core 随构建分发的校验器。独立 Markdown 采用规则仍使用 schema 1，规范观察与本地采用记录各有自己的版本。

| 网文字段 | 交换位置 | 处理 |
|---|---|---|
| `title`、`authors`、`tags` | `fields.title`、`fields.authors`、`fields.tags` | 全书名，作者和分类使用各自列表 |
| `description`、`cover_url` | `fields.summary`、`fields.cover` | 保留完整来源简介与有效图片链接 |
| `first_published_year`、`first_published_at` | `fields.year`、`fields.release_date` | 只采用明确首发资料，日期保留已知精度 |
| `serialization_status` | `fields.original_status` | 映射连载、完结、暂停。未知值保留在平台原文区 |
| `last_updated_at` | `fields.latest_chapter_updated_at` 或平台原文区 | 适配器的章节位置与时间依据都成立才映射，保留无时区的精度。相对时间留原文 |
| `latest_chapter`、`word_count_text` | `extensions.<provider>` | 保留章节名和“万字”等显示值 |
| `acquisition`、`evidence`、`warnings` | `observation`、`field_evidence`、`extensions.<provider>` | 采集、人工与读档依据分开，保留限制提示 |
| `retained_fields` | `field_evidence` 与平台扩展 | 有原采集依据时沿用原观察时间。旧档中无法恢复依据的时间保留原文供核对 |

读档时间只用于该次生成的交换对象。旧 HTML 的读取时刻不作为远端观察时间。混合预览中的手工编辑有独立人工证据，同次采集的其他字段保留原方法和观察时刻。新独立刷新为沿用项附加 `retained_field_acquisitions`，从可确认的原采集方式推导证据。独立笔记原有个人数据、正文和本地采用记录仍由既有规则保护。

### 托管写入边界

Media Core 使用 `webnovel_import.schema_version: 2` 和 `managed_by: media-core` 标记托管 Work。新建的托管 Work 在 `sources` 中保留 `provider`、`id`、`url` 身份引用。实际观察、证据和采用值由 Media Core 保存。新网文写入器识别托管标记并提供采集导出路径。

兼容的 Media Core 构建在插件实例上暴露 `sourceIntake`。Webnovel Import 检查 `apiVersion: 1` 和 `sourceSchema: 'media-source/v2'` 后调用 `openSourcePreview(source, { targetUid })`。`targetUid` 仅用于明确指定当前作品，归属与候选仍由 Core 判定。调用成功表示预览已准备，保存需要在 Core 界面确认。旧版 Core 可继续接收同一对象的 JSON。

Media Core 可通过可选能力 `manualWorkApiVersion: 1` 和 `openManualWork(draft, { onAccepted })` 接收本地草稿。先显示同名候选与手工字段，用户确认后使用 Core 的本地 Work 流程。初始托管标记含空来源列表，正式来源以后再挂接。

已有独立文件可在 Media Core 的规范来源预览中显式原位交接。适用对象是 UID 和来源归属唯一、旧来源与采用记录完整的 schema 1 网文，或带 `manual:local` 建档标记的无来源笔记。预览确认目标路径后执行交接，继续使用原 UID、正文、个人属性及未知属性。已有完整来源和采用记录在交接中保留。新来源继续追加身份引用。身份或记录有冲突时需先核对。

交接先在原文件冻结旧写入器，同时记录 `handoff_pending`。规范来源经 Media Core 按需保存到实体和 sidecar 的版本 3 后，待完成标记会清除。若在冻结后中断，重新导入同一来源可继续。网文插件的独立刷新仍只适用于 schema 1 文件。

旧写入器验证使用 0.1.1 提交 `2c3ef2aa49a3fd3bacf2a1f15b9f2b15aeb39372` 的真实 Importer，搭配模拟 Vault。schema 1 对照文件可更新。保留两条完整历史来源与旧采用记录的 schema 2 文件，在交接待完成和已完成两种状态下均拒绝刷新、同源另建及关联另一来源。模拟 Markdown 保持字节一致，作品保存与创建次数均为零。开启旧版封面下载后，直接关联另一来源可能在属性拒写之前生成一份未绑定的封面附件。

在包含固定提交的本地仓库运行 `node scripts/verify-media-core-handoff.cjs` 可复跑历史写入器检查。当前写入器在封面请求前核对目标笔记的属性，并在提交属性时再次校验。

### 更新共享产物

契约权威实现位于 Media Core 仓库的 `obsidian-media-lab/plugin/src/contracts`。更新时从已核对的 Media Core 修订重新生成 `vendor/media-source-v2.cjs`，并同步复制同修订的 `obsidian-media-lab/plugin/contracts/examples/media-source-v2.json` 至 `vendor/examples/`。脚本用法如下。

```sh
node /path/to/MediaCore/obsidian-media-lab/plugin/tools/export-source-contract.cjs vendor/media-source-v2.cjs
npm test
npm run build
```

本构建的固定校验器 SHA-256 见 [共享契约清单](../vendor/media-source-v2.sha256)。测试同时通过该校验器检查公共样本与普通适配器生成的资料。
