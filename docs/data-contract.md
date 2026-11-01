# 数据接口约定（schema 1）

日期：2026-11-01。适用于当前 0.1.1 开发构建。本文描述现有代码契约，不是整个个人文娱数据库的统一 schema，也不触发 Vault 迁移。

## 本地 Work、来源 Source、个人数据

| 逻辑层 | 持久化位置 | 写入边界 |
|---|---|---|
| Work | 顶层 `uid`、`title`、`authors`、`cover`、`summary`、`first_published_year`、`serialization_status` | 新建时生成独立 `work-UUID`；已有 uid 不替换；资料按采用规则更新 |
| Source | `webnovel_import.sources[]` | 保存各平台最近已知的作品资料、来源证据及获取方式 |
| 采用记录 | `webnovel_import.adopted` | 保存上次插件采用值与归属，用于和当前 Work 值比较 |
| Personal Data | 用户已有字段及正文，例如 `reading_status`、`reading_progress`、`rating`、`review`、`notes` | 插件不定义默认值、不改名、不覆盖，不将这些字段加入来源资料 |

新建时另写 `type: work`、`media: webnovel`；已有字段不替换。正文只在首次创建时生成，以后刷新不重写正文。正文中的简介和封面是初始快照，最新采用资料以属性为准。

Source 与 Work 通过所在文件关联，一份笔记可包含多条 Source。来源身份是 `provider + id`，不是标题。外部 ID 始终为字符串；长数字 ID 不转 Number。本地作品身份不使用外部 ID。

全库手动建档、Series 组织、平台个人标记收录及跨插件整合属于数据库核心职责，本插件不主动扩充关联作品，也不迁移其他插件的数据。当前手动补填入口仍要求已支持的作品链接；无来源 Work 可由用户在插件之外创建。

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
| `first_published_at` / `first_published_year` | 仅明确作品级首发证据或人工补填；现有两站解析器没有可靠首发信息，留空 |
| `last_updated_at` / `latest_chapter` | 网站显示的更新时间和最新章节，不等于作品首发时间；不推断时区 |
| `acquisition` | remote：普通 HTTP；html：用户提供页面；browser：浏览器采集；manual：人工补填 |
| `fetched_at` | 本次获取时间（ISO 字符串），不是平台更新时间，也不是每个字段发生变化的时间 |
| `evidence` | 字段名到证据说明的映射，可记录 DOM、元标签或结构化数据位置；identity 记录页级身份依据 |
| `warnings` | 本次获取的限制或缺失说明 |
| `retained_fields` | 本次未取得却沿用旧值的字段 → 该值最后被取得的时间；不能把旧值解释为本次已验证 |

这里的来源资料是经过适配器选择的元数据，不是完整原始 HTML、小说正文、Cookie 或账户信息。字段缺失不代表主动删除；缺失、空简介及自动 unknown 不清除已知来源值。历史字段沿用时保留旧证据，并以 retained_fields 标记时间。

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

封面下载失败会报告警告；若已有可用本地封面则保持原路径，新作品可保留远端地址。这个策略不代表失败的新图片已成功下载。

## 适配器输出协议

具体签名以 `src/adapters/types.ts` 为准，不为套用概念示例重写接口。

1. `matchUrl` 识别官网详情路径并生成规范 BookRef；公共入口先拒绝非 HTTP(S)、账户凭据及自定义端口。
2. `identities` 收集当前页身份，公共入口核对平台与 ID；推荐条目不能冒充当前作品身份。
3. `parse` 返回 SourceFields，包含资料、evidence、warnings；公共入口补 BookRef、获取时间与方式，并验证书名、作者。
4. `recoveryHint` 当前为静态文本；HTTP 状态由导入器加入消息。没有实际差异需求时不改成函数。
5. 可选 `browserCapture` 声明 DOM 选择器；未声明的平台不开放书签采集或剪贴板接收。

适配器不执行网络、创建 Markdown、决定字段覆盖、跨平台合并或访问 Vault。所有来源使用同一导入器与合并规则。新增平台需核验真实页面、实现接口、注册并添加对应验证。

## 版本、时间与未来迁移

- `schema_version: 1` 仅管理 webnovel_import 命名空间；插件版本号与 schema 版本不是同一概念。
- 兼容现有 sources、adopted 和人工标记，不批量重写 YAML。未知 schema 或格式不兼容时拒绝覆盖目标文件。
- 当前没有 `adopted_at`、`last_synced_at` 或完整字段变化历史。fetched_at 与 retained_fields 只描述获取时效，不能补造首次采用时间。
- ownership 由采用基线、本地值及来源归属推导；本阶段不增设重复状态标记。
- 未来添加时间字段需允许旧记录缺失；没有历史证据的时间保持未知。破坏性格式变化必须另定迁移方案、备份和验收，不能随普通刷新静默迁移全库。
- 阶段 2 已增加完整书名与作者集合的候选提示，用户选择后才关联；同一来源仍优先自动定位。详细差异预览、来源切换权限与变化历史仍属于后续阶段。
