### apps

| 欄位名稱          | 型態              | 說明                                                      |
|-----------------  |------------------ |---------------------------------------------------------  |
| app_id            | String(Hash Key)  | 對於 app 具有唯一性與識別性的 Key                         |
| realm_id          | String            | 對於 realm 具有唯一性與識別性的 Key                       |
| status            | String            | app 的狀態 active 或 inactive                             |
| platform          | String            | app 平台                                                  |
| description       | String            | Application Description (可修改)                         |
| name              | String            | Application Display Name (可修改)                        |
| application_arn   | String            | PlatformApplicationArn is used to create a an endpoint.   |
| topic_arn         | String            | The ARN of the topic you want to subscribe to.            |
| bundle_id         | String            | iOS bundle id                                             |
| package_name      | String            | Android package name                                      |
| created_at        | Number            | 建立時間                                                  |
| updated_at        | Number            | 最後修改時間                                              |

### access_keys

| 欄位名稱        | 型態             | 說明                                                                    |
|-----------------|------------------|-------------------------------------------------------------------------|
| access_key_id   | String(Hash Key) | 名稱識別 UUID                                                           |
| realm_id        | String           | 對應 realms 的 id ( 產生 access key 時從 realms 反正規化過來 )          |
| realm_topic_arn | String           | 對應 realms 的 topic ARN ( 產生 access key 時從 realms 反正規化過來 )   |
| type            | String           | master、realm、app                                                      |
| public_key      | String           | PEM 格式的 Key                                                          |
| status          | String           | active、inactive、revoked                                               |
| description     | String           | 使用者自己寫的 access key 描述                                          |
| app_id          | String           | 對應 apps 的 id ( 產生 access key 時從 apps 反正規化過來 )              |
| platform        | String           | 對應 apps 的 platform ( 產生 access key 時從 apps 反正規化過來 )        |
| application_arn | String           | 對應 apps 的 application ARN ( 產生 access key 時從 apps 反正規化過來 ) |
| app_topic_arn   | String           | 對應 apps 的 topic ARN ( 產生 access key 時從 apps 反正規化過來 )       |
| created_at      | Number           | 建立時間                                                                |
| updated_at      | Number           | 修改時間                                                                |

### devices

| 欄位名稱                | 型態              | 說明                                                  |
|------------------------ |------------------ |------------------------------------------------------ |
| udid                    | String(Hash key)  | 裝置識別，Android 的 UUID 和 iOS 的 Vendor ID         |
| app_id                  | String(Sort key)  | 對應 apps 的 id 反正規化過來                           |
| realm_id                | String            | 對於 realm 具有唯一性與識別性的 Key                   |
| app_info                | Map               | app 的其他資訊，包含裝置、App、SDK 資訊等等           |
| endpoint_arn            | String            | 裝置的 ARN                                             |
| platform                | String            | 對應 apps 的 platform 反正規化過來，如果統計上有需求  |
| push_token              | String            | iOS device token、Android registration id              |
| realm_subscription_arn  | String            | 裝置訂閱 Realm Topic 的 Subscription ARN               |
| app_subscription_arn    | String            | 裝置訂閱 App Topic 的 Subscription ARN                 |
| user_id                 | String            | 對於使用者具有唯一性與識別性的 Key                     |
| created_at              | Number            | 建立時間                                              |
| updated_at              | Number            | 修改時間                                              |

##### Global Secondary index：

user_id-udid-app_id ( Projected Attributes: All )

| 欄位名稱    | 型態             | 說明                                                                                             | 範例 |
|-------------|------------------|--------------------------------------------------------------------------------------------------|------|
| user_id     | String(Hash key) | 對於使用者具有唯一性與識別性的 Key                                                               | TL;  |
| udid-app_id | String(Sort key) | udid + app_id，udid: 對於裝置具有唯一性與識別性的 Key，app_id: 對於 app 具有唯一性與識別性的 Key |      |

### jobs

| 欄位名稱      | 型態             | 說明                                                                                     |
|---------------|------------------|------------------------------------------------------------------------------------------|
| job_id        | String(Hash key) | 對於 job 具有唯一性與識別性的 Key。                                                      |
| realm_id      | String           | 對於 realm 具有唯一性與識別性的 Key                                                      |
| inbox_msg_id  | String           | 對於 inbox_msg 具有唯一性與識別性的 Key ( 僅 broadcast inbox 、personal inbox 時會有值 ) |
| notifications | Array            | []                                                                                       |
| message_type  | String           | 推播類型: device、personal、broadcast                                                    |
| report_url    | String           | 此次發送的結果報表                                                                       |
| description   | String           | Job 描述                                                                                 |
| publish       | Boolean          | 是否發送推播。( for inbox message job ) ( 由 inbox_msg 反正規化過來 )                    |
| created_at    | Number           | 建立時間                                                                                 |
| updated_at    | Number           | 修改時間                                                                                 |                                                                                |

### notifications

| 欄位名稱          | 型態              | 說明                                                                    |
|-----------------  |------------------ |------------------------------------------------------------------------ |
| notification_id   | String(Hash key)  | 對於 notification 具有唯一性與識別性的 Key。                             |
| job_id            | String(Sort key)  | 對於 job 具有唯一性與識別性的 Key，job 與 notification 為 1 對多關係。  |
| app_id            | String            | 對於 app 具有唯一性與識別性的 Key                                       |
| message_id        | String            | SNS message id，發送推播到 SNS 時，SNS 回傳的 message id                 |
| message_type      | String            | 推播類型：personal、device、broadcast                                    |
| payload           | String            | 實際發送出去的推播訊息 payload                                           |
| udid              | String            | 對於裝置具有唯一性與識別性的 Key。                                       |
| user_id           | String            | 對於使用者具有唯一性與識別性的 Key。                                    |
| failure_reason    | String            | 訊息發送失敗原因 ( 記錄該筆訊息對 SNS 發送前發生錯誤的原因 )             |
| created_at        | Number            | 建立時間                                                                |
| updated_at        | Number            | 修改時間                                                                |

### deliveries

| 欄位名稱          | 型態              | 說明                                                                                                |
|------------------ |------------------ |---------------------------------------------------------------------------------------------------- |
| delivery_id       | String(Hash key)  | 對於 delivery 具有唯一性與識別性的 Key                                                              |
| message_id        | String            | SNS message id，發送推播到 SNS 時，SNS 產生的 message id                                             |
| dwellTimeMs       | Number            | 推播訊息在 SNS 的停留時間                                                                           |
| providerResponse  | String            | 從 provider 推播服務 ( 如 GCM、APNS ) 回傳給 SNS 的 repsonse，描述推播訊息在 provider 端的發送情形   |
| status            | String            | SUCCESS: 成功、FAILURE: 失敗                                                                         |
| statusCode        | Number            | SNS 對 provider 的發送請求的 statusCode                                                              |
| timestamp         | String            | SNS 紀錄的訊息發送時間戳記                                                                           |
| token             | String            | iOS: device token、Android: registration id                                                          |

### inbox_msgs

| 欄位名稱            | 型態              | 說明                                          |
|-------------------- |------------------ |---------------------------------------------- |
| inbox_msg_id        | String(Hash key)  | 對於 inbox_msg 具有唯一性與識別性的 Key。      |
| realm_id            | String            | 對於 realm 具有唯一性與識別性的 Key。          |
| message_type        | String            | 推播類型: broadcast、personal                  |
| title               | String            | inbox title                                   |
| body                | String            | inbox body                                    |
| notification_title  | String            | 推播訊息的 title                               |
| notification_body   | String            | 推播訊息的 body                                |
| uri                 | Map               |                                               |
| type                | String            | 推播訊息類型: plain_text、web_url、deep_link  |
| meta                | Map               | 客戶自訂的資料，也會用來帶到推播去             |
| targets             | Set               |                                               |
| publish             | Boolean           | Inbox 訊息是否發送                            |
| job_id              | String            | 要發送就要有對應的 job_id                      |
| created_at          | Number            | 建立時間                                      |
| updated_at          | Number            | 最後修改時間                                  |
