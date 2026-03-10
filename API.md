# Campus Question Bank API 文档

本文档描述了 Campus Question Bank 服务提供的 RESTful API 接口。

## 基础信息

- **基础 URL**: `http://localhost:3000` (开发环境)
- **鉴权方式**: 加密 Token
  - 通过 HTTP Header: `Authorization: Bearer <token>`
  - 或者通过 Query 参数: `?token=<token>`

---

## 接口列表

### 1. 服务状态检查

检查服务是否正常运行。

- **URL**: `/`
- **方法**: `GET`
- **鉴权**: 否

**响应示例**:
```text
Hello, World! Fiber is running and connected to PostgreSQL.
```

### 2. 健康检查

检查数据库连接状态。

- **URL**: `/health`
- **方法**: `GET`
- **鉴权**: 否

**响应示例 (成功)**:
```json
{
  "status": "success",
  "message": "Database connection is healthy"
}
```

**响应示例 (失败)**:
```json
{
  "status": "error",
  "message": "Database ping failed",
  "error": "connection refused"
}
```

### 3. 获取学校列表

获取已注册的学校列表。数据从内存缓存中读取，每日自动更新。

- **URL**: `/campuses`
- **方法**: `GET`
- **鉴权**: 否

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "北京大学"
  },
  {
    "id": 2,
    "name": "中国人民大学"
  }
]
```

### 4. 绑定学校

用户将账号绑定到特定的学校。需要通过 Cloudflare Turnstile 验证。

- **URL**: `/bind-campus`
- **方法**: `POST`
- **鉴权**: **是** (需要有效的加密 Token)
- **Content-Type**: `application/json`

**请求参数**:

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `campus_id` | uint | 是 | 学校的 ID (对应 `/campuses` 接口返回的 ID) |
| `turnstile_token` | string | 是 | Cloudflare Turnstile 前端验证通过后获取的 token |

**请求示例**:
```json
{
  "campus_id": 1,
  "turnstile_token": "0.xxxxxxx..."
}
```

**响应示例 (成功)**:
```json
{
  "message": "Campus bound successfully",
  "user": {
    "id": 12345,
    "openid": "xxxxxxxx",
    "campus_id": 1
  }
}
```

**响应示例 (失败 - 参数错误)**:
```json
{
  "error": "Campus ID and Turnstile token are required"
}
```

**响应示例 (失败 - 验证失败)**:
```json
{
  "error": "Turnstile verification failed"
}
```

**响应示例 (失败 - 鉴权失败)**:
```json
{
  "error": "Invalid token"
}
```

### 5. 获取用户学校信息

获取当前登录用户绑定的学校信息。

- **URL**: `/user/campus`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token)

**响应示例 (成功 - 已绑定)**:
```json
{
  "message": "User campus retrieved successfully",
  "campus": {
    "ID": 1,
    "CreatedAt": "2026-01-09T15:28:13.119+08:00",
    "UpdatedAt": "2026-01-09T15:28:13.119+08:00",
    "DeletedAt": null,
    "Name": "北京大学"
  },
  "status": "verified",
  "is_trusted": true // 信任用户标识 (trust_score > 500)
}
```

**响应示例 (成功 - 未绑定)**:
```json
{
  "message": "User has not bound a campus",
  "campus": null
}
```

**响应示例 (失败 - 鉴权失败)**:
```json
{
  "error": "Invalid token"
}
```

### 6. 导入学校数据 (管理接口)

从服务器本地的 CSV 文件导入学校数据。

- **URL**: `/import-csv`
- **方法**: `GET`
- **鉴权**: 否 (建议在生产环境中添加鉴权或移除此接口)

**响应示例**:
```json
{
  "message": "Data imported successfully",
  "count": 2915
}
```

### 6.5. 获取文件夹标签列表

获取所有可用的文件夹标签（如“学习通”、“雨课堂”等）。数据从内存缓存中读取。

- **URL**: `/tags`
- **方法**: `GET`
- **鉴权**: 否

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "学习通",
    "domains": "[\"chaoxing.com\", \"xuexitong.com\"]" // JSON string
  },
  {
    "id": 2,
    "name": "雨课堂",
    "domains": "[]"
  }
]
```

### 6.6. 获取学校排名统计 (题目数量)

获取指定学校在所有学校中按题目数量排名的前后邻近学校（包括自身，共 5 所）。
如果该学校排名靠前，则返回前 5 名；如果靠后，则返回后 5 名；如果在中间，则返回前后各 2 名。
**特殊情况**: 如果该学校题目数量为 0，则返回题目数量不为 0 的最后 4 名学校以及该学校自身。
**数据每 24 小时更新一次。**

- **URL**: `/campus/:campus_id/stats`
- **方法**: `GET`
- **鉴权**: **否** (公开接口)

**响应示例**:
```json
{
  "stats": {
    "upload_count": 1400,
    "like_count": 4800,
    "reference_count": 180
  },
  "ranking": [
    {
      "id": 3,
      "name": "清华大学",
      "question_count": 1200,
      "rank": 3
    },
    {
      "id": 1,
      "name": "北京大学", // 当前查询的学校
      "question_count": 1150,
      "rank": 4
    },
    {
      "id": 5,
      "name": "复旦大学",
      "question_count": 980,
      "rank": 5
    }
    // ... 共 5 个对象
  ],
  "top_users": [ // 本周活跃用户 Top 5 (按 API 调用次数)
    {
      "nickname": "学霸小明",
      "call_count": 500
    },
    {
      "nickname": "勤奋小红",
      "call_count": 450
    }
  ],
  "daily_trends": [ // 最近 14 天学校 API 调用趋势
    {
      "date": "2023-10-01",
      "call_count": 1200
    },
    {
      "date": "2023-10-02",
      "call_count": 1350
    }
  ]
}
```

---

## 课程接口

### 7. 获取学校课程列表

获取指定学校下的所有课程。支持通过课程名称进行模糊搜索。**仅限已绑定该学校的用户访问。**

- **URL**: `/campus/:campus_id/courses`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**:
  - `name` (可选): 搜索课程名称的关键字

**响应示例**:
```json
[
  {
    "ID": 1,
    "CreatedAt": "2026-01-10T16:00:00+08:00",
    "UpdatedAt": "2026-01-10T16:00:00+08:00",
    "DeletedAt": null,
    "Name": "高等数学",
    "CampusID": 1,
    "Image": "uuid-filename.webp",
    "is_favorited": true
  }
]
```

### 8. 创建课程

在指定学校下创建新课程。**仅认证用户可用**。
- 若用户为**信任用户**（trust_score > 500），课程直接通过审核（Approved）。
- 否则，课程状态为 Pending，需等待管理员或信任用户审核。

- **URL**: `/courses`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `multipart/form-data`

**请求参数**:

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `campus_id` | int | 是 | 学校 ID |
| `name` | string | 是 | 课程名称（校内唯一） |
| `image` | file | 是 | 课程封面图片 (JPG/PNG/WEBP, < 5MB) |

**响应示例 (成功)**:
```json
{
  "ID": 1,
  "Name": "高等数学",
  "CampusID": 1,
  "Image": "uuid-filename.webp"
}
```

### 9. 编辑课程

修改课程名称或图片。**仅认证用户可用**。
- 若用户为**信任用户**（trust_score > 500），修改直接生效。
- 否则，生成 Pending 状态的修改申请，需等待审核。

- **URL**: `/courses/:id`
- **方法**: `PUT`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `multipart/form-data`

**请求参数**:

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `name` | string | 否 | 新的课程名称 |
| `image` | file | 否 | 新的课程封面图片 |

### 10. 申请删除课程 (发起投票)

发起删除课程的投票。所有认证用户可以投票。若 3 天内同意人数多于拒绝人数，则自动删除。**仅认证用户可用**。

- **URL**: `/courses/:id/delete`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "remark": "删除理由..."
}
```

**响应示例**:
```json
{
  "message": "Vote initiated successfully",
  "vote": {
    "ID": 1,
    "TargetType": "course",
    "TargetID": 1,
    "Remark": "删除理由...",
    "Deadline": "2026-01-13T16:00:00+08:00",
    "Status": "active"
  }
}
```

### 11. 获取课程详情

获取课程的详细信息，包括题库文件夹。未分类题目请使用单独接口获取。**仅限已绑定该课程所属学校的用户访问。**

- **URL**: `/courses/:id`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**:
  - `tag_id` (可选): 按标签 ID 筛选文件夹

**响应示例**:
```json
{
  "id": 1,
  "name": "高等数学",
  "image": "uuid.webp",
  "created_at": "...",
  "updated_at": "...",
  "folders": [
    {
      "ID": 1,
      "Name": "第一章 极限与连续",
      "CourseID": 1,
      "creator_nickname": "User1",
      "tag_name": "学习通", // 若无标签则为空或不返回
      "Year": "2023" // 年份/年级
    }
  ]
  "is_favorited": true
}
```

### 11.5. 获取课程未分类题目

获取课程中未放入文件夹的题目。**仅限已绑定该课程所属学校的用户访问。**

- **URL**: `/courses/:id/questions`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 20

**响应示例**:
```json
[
  {
    "ID": 10,
    "Type": "single_choice",
    "Content": "未分类题目示例",
    "CourseID": 1,
    "QuestionBankID": null,
    "Answer": "A", // 未认证用户此字段为空
    "creator_nickname": "User1",
    "creator_id": 1,
    "last_modifier_nickname": "User3",
    "last_modifier_id": 3,
    "approve_count": 5,
    "confuse_count": 2,
    "user_reaction": "approve", // "approve", "confuse" 或 ""
    "CallCount": 0
  }
]
``````

### 11.6. 收藏/取消收藏课程

收藏或取消收藏指定的课程。**仅认证用户可用**。

- **URL**: `/courses/:id/favorite`
- **方法**: `POST` (收藏) / `DELETE` (取消收藏)
- **鉴权**: **是** (需要认证)

**响应示例 (收藏)**:
```json
{
  "message": "Course favorited successfully"
}
```

**响应示例 (取消收藏)**:
```json
{
  "message": "Course unfavorited successfully"
}
```

### 11.7. 获取我的收藏课程

获取当前用户收藏的所有课程列表。**仅认证用户可用**。

- **URL**: `/user/favorites`
- **方法**: `GET`
- **鉴权**: **是** (需要认证)

**响应示例**:
```json
[
  {
    "ID": 1,
    "Name": "高等数学",
    "CampusID": 1,
    "Image": "uuid.webp",
    "CreatorID": 1,
    "Status": "approved",
    "is_favorited": true
  }
]
```

---

## 题库与题目管理接口

### 12. 创建题库文件夹

在课程中创建一个新的题库文件夹。**仅认证用户可用**。

- **URL**: `/courses/:course_id/folders`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求示例**:
```json
{
  "name": "期末复习题",
  "tag_id": 1, // 可选，文件夹标签 ID
  "year": "2023" // 可选，年份/年级
}
```

### 13. 重命名文件夹

修改文件夹名称或标签。**仅限文件夹创建者或管理员可用**。

- **URL**: `/folders/:folder_id`
- **方法**: `PUT`
- **鉴权**: **是** (需要认证，且必须是创建者或管理员)

**请求示例**:
```json
{
  "name": "新名称",
  "tag_id": 1, // 可选
  "year": "2024" // 可选
}
```

**响应示例**:
```json
{
  "message": "Folder updated successfully",
  "folder": {
    "ID": 1,
    "Name": "新名称",
    "CourseID": 1,
    "CreatorID": 1,
    "TagID": 1,
    "Year": "2024"
  }
}
```

### 14. 申请删除文件夹 (或直接删除)

如果是文件夹创建者，则直接删除。如果是其他用户，则发起删除投票。**仅认证用户可用**。

- **URL**: `/folders/:folder_id/delete`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "remark": "删除理由..." // 创建者可不填，其他人必填
}
```

**响应示例 (创建者直接删除)**:
```json
{
  "message": "Folder deleted successfully (Owner)"
}
```

**响应示例 (发起投票)**:
```json
{
  "message": "Vote initiated successfully",
  "vote": {
    "ID": 2,
    "TargetType": "folder",
    "TargetID": 5,
    "Status": "active"
  }
}
```

### 14.5. 归档文件夹

如果是**文件夹创建者**或**信任用户**，则直接归档。如果是其他用户，则发起归档投票。归档后，文件夹内的题目不可修改、删除或移动，也不可移入新题目。

- **URL**: `/folders/:folder_id/archive`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "remark": "归档理由..." // 创建者可不填，其他人可选
}
```

**响应示例 (创建者直接归档)**:
```json
{
  "message": "Folder archived successfully"
}
```

**响应示例 (发起投票)**:
```json
{
  "message": "Vote initiated successfully",
  "vote": {
    "ID": 3,
    "TargetType": "folder",
    "TargetID": 5,
    "Action": "archive",
    "Status": "active"
  }
}
```

### 14.6. 取消归档文件夹

如果是**文件夹创建者**或**信任用户**，则直接取消归档。如果是其他用户，则发起取消归档投票。

- **URL**: `/folders/:folder_id/unarchive`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "remark": "取消归档理由..." // 创建者可不填，其他人可选
}
```

**响应示例**:
```json
{
  "message": "Folder unarchived successfully"
}
```

### 15. 获取文件夹内题目

获取指定文件夹下的所有题目。如果用户未认证，题目的答案字段将为空。**仅限已绑定该题目所属学校的用户访问。**
返回结果将按照 `sort_order ASC, id ASC` 排序。
对于支持子题的题型（如阅读理解、听力），子题将嵌套在 `children` 字段中返回。

- **URL**: `/folders/:folder_id/questions`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**: 无 (返回该文件夹下的所有题目，不分页)

**响应示例**:
```json
[
  {
    "ID": 12,
    "Type": "reading",
    "Content": "这是一篇阅读理解文章...",
    "CourseID": 1,
    "QuestionBankID": 2,
    "creator_nickname": "User1",
    "children": [
      {
        "ID": 13,
        "Type": "single_choice",
        "Content": "文章主要讲了什么？",
        "Options": "[\"A\", \"B\"]",
        "Answer": "A",
        "parent_id": 12,
        "creator_nickname": "User1"
      }
    ]
  },
  {
    "ID": 14,
    "Type": "single_choice",
    "Content": "普通单选题",
    "Options": "...",
    "Answer": "B"
  }
]
```

### 15.5. 重新排序文件夹内的题目

批量更新文件夹内题目的顺序。**仅限文件夹创建者或管理员可用**。

- **URL**: `/folders/:folder_id/reorder`
- **方法**: `POST`
- **鉴权**: **是** (需要认证，且必须是创建者或管理员)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "question_ids": [5, 2, 8, 1, 9] // 题目 ID 数组，按照期望的顺序排列
}
```

**注意**:
- 只会更新数组中存在的题目 ID 的顺序。
- 建议前端在拖拽排序后，将当前页面的所有题目 ID 按新顺序发送给后端。
- 数组中的第一个 ID `SortOrder` 将被设为 0，第二个为 1，依此类推。

**响应示例**:
```json
{
  "message": "Questions reordered successfully"
}
```

### 16. 创建题目

创建新的题目。**仅认证用户可用**。

**限制说明**:
- **题型 (`type`)**: 必须是以下之一:
  - `single_choice`: 单选题
  - `multiple_choice`: 多选题
  - `true_false`: 判断题
  - `fill_blank`: 填空题
  - `short_answer`: 简答题
  - `essay`: 论述题
  - `calculation`: 计算题
  - `definition`: 名词解释
  - `listening`: 听力 (可包含子题)
  - `reading`: 阅读理解 (可包含子题)
  - `cloze`: 完形填空 (可包含子题，子题必须为单选题)
- **长度限制**:
  - `content`: 最多 10000 字符
  - `options`: 最多 5000 字符
  - `answer`: 最多 5000 字符

- **URL**: `/courses/:course_id/questions`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求示例 (普通题目)**:
```json
{
  "type": "single_choice",
  "content": "题目内容...",
  "options": "[\"A\", \"B\", \"C\", \"D\"]",
  "answer": "A",
  "question_bank_id": 1, // 可选，不填则为未分类
  "add_to_top": true // 可选，默认为 false (添加到末尾)。若为 true，则添加到文件夹开头。
}
```

**请求示例 (子题)**:
```json
{
  "type": "single_choice",
  "content": "子题内容...",
  "options": "[\"A\", \"B\"]",
  "answer": "A",
  "parent_id": 12 // 父题目 ID
}
```

**请求示例 (大题/父题 - 如阅读理解)**:
```json
{
  "type": "reading",
  "content": "这里是阅读理解的文章内容...",
  "question_bank_id": 1
  // 选项和答案通常为空，但也可以根据需求使用
}
```

### 17. 更新题目

更新题目内容或移动题目（修改 `question_bank_id` 或 `parent_id`）。**仅认证用户可用**。

- **URL**: `/questions/:id`
- **方法**: `PUT`
- **鉴权**: **是** (需要认证)

**请求示例**:
```json
{
  "type": "multiple_choice", // 可选，修改题目类型
  "content": "更新后的题目内容",
  "question_bank_id": 2, // 移动到文件夹 ID 2
  "parent_id": 12 // 移动为 ID 12 的子题 (需满足类型限制)
}
```

**请求示例 (更新大题内容)**:
```json
{
  "content": "更新后的文章内容...",
  // 大题通常不需要更新 parent_id，除非将其变为另一个题的子题（如果业务允许）
}
```

### 18. 删除题目 (移至垃圾箱)

- **URL**: `/questions/:id`
- **方法**: `DELETE`
- **鉴权**: **是** (需要认证)

**响应示例**:
```json
{
  "message": "Question moved to trash",
  "restore_deadline": "2026-01-14T12:00:00+08:00"
}
```

### 18.1. 管理子题数量

要管理（添加、删除、移除）子题的数量，请使用以下方法：

1.  **添加子题**: 创建一个新的题目，并将其 `parent_id` 设置为父题目的 ID。参考 `创建题目` 接口。
2.  **删除子题 (移入回收站)**: 直接删除子题目的 ID。参考 `删除题目` 接口。
3.  **彻底删除子题 (不进回收站)**: 使用专用接口 `DELETE /sub-questions/:id` 直接物理删除子题。
4.  **移除子题 (取消关联)**: 使用 `更新题目` 接口，将 `parent_id` 设置为 `0` (或 null/不传，视具体实现而定，推荐传 `0` 表示显式分离)。

**请求示例 (移除子题/变为普通题目)**:
```json
// PUT /questions/:id
{
  "parent_id": 0 // 0 表示移除父级关联
}
```

### 18.2. 彻底删除子题 (物理删除)

直接从数据库中删除子题，不进入回收站。**仅限子题可用**。

- **URL**: `/sub-questions/:id`
- **方法**: `DELETE`
- **鉴权**: **是** (需要认证)

**响应示例**:
```json
{
  "message": "Sub-question permanently deleted"
}
```

### 18.3. 重新排序子题

批量更新子题的顺序。**仅限父题创建者或管理员可用**。
更新排序后，父题的 `updated_at` 和 `last_modifier_id` 也会被更新。

- **URL**: `/questions/:parent_id/reorder`
- **方法**: `POST`
- **鉴权**: **是** (需要认证，且必须是创建者或管理员)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "question_ids": [15, 12, 18, 11] // 子题 ID 数组，按照期望的顺序排列
}
```

**响应示例**:
```json
{
  "message": "Sub-questions reordered successfully"
}
```

### 18.5. 撤回删除题目 (恢复)

- **URL**: `/questions/:id/restore`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)

**响应示例**:
```json
{
  "message": "Question restored successfully"
}
```

### 18.6. 获取课程未分类垃圾箱题目

获取课程中**未分类**的已删除题目。

- **URL**: `/courses/:course_id/trash`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 20

**响应示例**:
```json
[
  {
    "ID": 10,
    "Type": "single_choice",
    "Content": "已删除的未分类题目示例",
    "CourseID": 1,
    "QuestionBankID": null,
    "Answer": "A",
    "creator_nickname": "User1",
    "creator_id": 1,
    "deleter_nickname": "User2",
    "deleter_id": 2,
    "last_modifier_nickname": "User3",
    "last_modifier_id": 3,
    "restore_deadline": "2026-01-14T12:00:00+08:00",
    "approve_count": 5,
    "confuse_count": 2,
    "user_reaction": "approve", // "approve", "confuse" 或 ""
    "CallCount": 0
  }
]
``````

### 18.7. 获取文件夹垃圾箱题目

获取指定文件夹内的已删除题目。

- **URL**: `/folders/:folder_id/trash`
- **方法**: `GET`
- **鉴权**: **是** (需要有效的加密 Token，且用户必须绑定到该学校)
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 20

**响应示例**:
```json
[
  {
    "ID": 11,
    "Type": "single_choice",
    "Content": "已删除的文件夹题目示例",
    "CourseID": 1,
    "QuestionBankID": 2,
    "Answer": "B",
    "creator_nickname": "User1",
    "creator_id": 1,
    "deleter_nickname": "User2",
    "deleter_id": 2,
    "last_modifier_nickname": "User3",
    "last_modifier_id": 3,
    "restore_deadline": "2026-01-14T12:00:00+08:00",
    "approve_count": 5,
    "confuse_count": 2,
    "user_reaction": "approve", // "approve", "confuse" 或 ""
    "CallCount": 0
  }
]
``````

### 18.8. 评价题目 (认可/疑惑)

用户对题目进行评价。**仅限已认证 (verified) 用户可用**。未认证用户禁止操作。

- **URL**: `/questions/:id/react`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求示例**:
```json
{
  "type": "approve" // "approve"(认可), "confuse"(疑惑), "none"(取消评价)
}
```

**响应示例**:
```json
{
  "message": "Reaction saved",
  "type": "approve"
}
```

### 19. 移动题目 (专用接口)

将题目移动到指定文件夹。**仅认证用户可用**。

- **URL**: `/questions/:id/move`
- **方法**: `PUT`
- **鉴权**: **是** (需要认证)

**请求示例**:
```json
{
  "question_bank_id": 2 // 目标文件夹 ID，传 null 移出文件夹
}
```

---

### 20. 投票列表

获取当前学校的活跃投票。**仅认证用户可用**。

- **URL**: `/campus/:campus_id/votes`
- **方法**: `GET`
- **鉴权**: **是** (需要认证且绑定到该学校)

**响应示例**:
```json
[
  {
    "ID": 1,
    "TargetType": "course",
    "TargetID": 1,
    "Remark": "课程已过时",
    "Deadline": "2026-01-13T16:00:00+08:00",
    "Status": "active",
    "ApproveCount": 5,
    "RejectCount": 2,
    "target_name": "高等数学",
    "course_id": 0 // 仅当 TargetType 为 folder 时返回，否则忽略
  }
]
``````

### 21. 投票

对指定的投票进行表决。**仅限已认证 (verified) 用户可用**。未认证用户禁止操作。
- 若用户为**信任用户**（trust_score > 500），投票后将立即根据其决定（通过/拒绝）结束投票并执行相应操作（如删除、归档等）。

- **URL**: `/votes/:id/cast`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "decision": "approve" // 或 "reject"
}
```

### 23. 对题目进行评价 (点赞/困惑)

对题目进行评价。**仅认证用户可用**。

- **URL**: `/questions/:id/react`
- **方法**: `POST`
- **鉴权**: **是** (需要认证)
- **Content-Type**: `application/json`

**请求示例**:
```json
{
  "type": "approve" // "approve" (点赞) 或 "confuse" (困惑)
}
```

**响应示例**:
```json
{
  "message": "Reaction saved",
  "type": "approve"
}
```

### 24. 搜索题目

在当前用户绑定的学校内搜索题目。支持搜索题目内容、选项和答案。

- **URL**: `/search?q=关键词&page=1&page_size=20`
- **方法**: `GET`
- **鉴权**: **是** (需要认证，且需绑定学校)

**响应示例**:
```json
{
  "total": 5,
  "results": [
    {
      "ID": 1,
      "Type": "single_choice",
      "Content": "1+1=?",
      "Options": "[\"1\", \"2\", \"3\", \"4\"]",
      "Answer": "B",
      "course_name": "高等数学",
      "folder_name": "期末复习",
      "folder_id": 10,
      "creator_nickname": "User1",
      "approve_count": 5,
      "confuse_count": 1,
      "user_reaction": "approve"
    }
  ],
  "page": 1
}
```

---

## 管理员接口

### 22. 获取待审核课程列表 (管理员)

获取所有状态为 `pending` 的课程（包括新课程和修改申请）。**仅限管理员访问。**

- **URL**: `/admin/pending-courses`
- **方法**: `GET`
- **鉴权**: **是** (需要管理员权限)

**响应示例**:
```json
[
  {
    "ID": 2,
    "Name": "新提交的课程",
    "Status": "pending",
    "ParentID": null // 如果是修改申请，此处为原课程 ID
  }
]
```

### 23. 批准课程 (管理员)

批准待审核的课程。**仅限管理员访问。**

- **URL**: `/admin/courses/:id/approve`
- **方法**: `POST`
- **鉴权**: **是** (需要管理员权限)

### 24. 拒绝课程 (管理员)

拒绝待审核的课程。**仅限管理员访问。**

- **URL**: `/admin/courses/:id/reject`
- **方法**: `POST`
- **鉴权**: **是** (需要管理员权限)

### 24.5. 搜索用户 (管理员)

根据 ID 或昵称搜索用户。**仅限管理员访问。**

- **URL**: `/admin/users/search`
- **方法**: `GET`
- **鉴权**: **是** (需要管理员权限)
- **查询参数**:
  - `q` (必填): 搜索关键词 (ID 或昵称)

**响应示例**:
```json
[
  {
    "id": 1,
    "openid": "xxxx",
    "nickname": "User1",
    "created_at": "...",
    "status": "verified", // "verified", "unverified", "banned"
    "trust_score": 100,
    "upload_count": 5, // 上传题目数量
    "like_count": 10   // 获赞数量
  }
]
```

### 24.6. 更新用户信息 (管理员)

更新用户的状态或信任分数。**仅限管理员访问。**

- **URL**: `/admin/users/:id`
- **方法**: `PUT`
- **鉴权**: **是** (需要管理员权限)
- **Content-Type**: `application/json`

**请求参数**:
```json
{
  "status": "banned", // 可选: "verified", "unverified", "banned"
  "trust_score": 600 // 可选: 整数
}
```

**响应示例**:
```json
{
  "id": 1,
  "nickname": "User1",
  "status": "banned",
  "trust_score": 600
  // ... 其他字段
}

### 24.7. 管理学校 (管理员)

管理学校列表（创建/更新/删除）。**仅限管理员访问。**

- **URL**:
  - `POST /admin/campuses`: 创建学校
  - `PUT /admin/campuses/:id`: 更新学校
  - `DELETE /admin/campuses/:id`: 删除学校
- **鉴权**: **是** (需要管理员权限)
- **Content-Type**: `application/json`

**请求参数 (创建/更新)**:
```json
{
  "name": "北京大学"
}
```

### 24.8. 管理标签 (管理员)

管理文件夹标签列表（创建/更新/删除）。**仅限管理员访问。**

- **URL**:
  - `POST /admin/tags`: 创建标签
  - `PUT /admin/tags/:id`: 更新标签
  - `DELETE /admin/tags/:id`: 删除标签
- **鉴权**: **是** (需要管理员权限)
- **Content-Type**: `application/json`

**请求参数 (创建/更新)**:
```json
{
  "name": "学习通",
  "domains": "[\"chaoxing.com\", \"xuexitong.com\"]" // JSON string
}
```

---

## 信任用户审核接口

### 25. 获取本校待审核课程列表

获取当前用户所属学校的待审核课程。**仅限信任用户访问。**

- **URL**: `/review/courses/pending`
- **方法**: `GET`
- **鉴权**: **是** (需要信任用户权限: trust_score > 500)

**响应示例**:
```json
[
  {
    "ID": 3,
    "Name": "本校新课程",
    "Status": "pending",
    "CampusID": 1
  }
]
```

### 26. 批准本校课程

批准本校的待审核课程。**仅限信任用户访问。**

- **URL**: `/review/courses/:id/approve`
- **方法**: `POST`
- **鉴权**: **是** (需要信任用户权限)

### 27. 拒绝本校课程

拒绝本校的待审核课程。**仅限信任用户访问。**

- **URL**: `/review/courses/:id/reject`
- **方法**: `POST`
- **鉴权**: **是** (需要信任用户权限)

---

## 搜索接口

### 27.5. 全文搜索题目

使用 PostgreSQL 内置全文搜索和 pg_trgm 扩展搜索题目。支持中文和多语言。

- **URL**: `/search`
- **方法**: `GET`
- **鉴权**: **是** (需要认证)
- **查询参数**:
  - `q` (必填): 搜索关键词
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 20

**响应示例**:
```json
{
  "total": 15,
  "page": 1,
  "results": [
    {
      "ID": 10,
      "Type": "single_choice",
      "Content": "关于高等数学的极限...",
      "course_name": "高等数学",
      "folder_name": "第一章 极限",
      "folder_id": 1,
      "creator_nickname": "User1",
      "approve_count": 12,
      "confuse_count": 0,
      "user_reaction": ""
    }
  ]
}
```

---

## 图片访问接口

### 28. 获取图片

获取存储在 WebDAV 中的图片。由于 WebDAV 服务器可能是私有的，此接口充当代理。

- **URL**: `/images/:filename`
- **方法**: `GET`
- **鉴权**: 否 (图片公开访问，或根据需求添加鉴权)

**请求示例**:
`GET /images/123e4567-e89b-12d3-a456-426614174000.webp`

**响应**:
- 成功: 返回图片文件流
- 失败: 404 Not Found


