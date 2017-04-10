# Personal Cloud Object Storage Service

- Serverless Version: 1.9.0

## Installation

### Install Packages

The following command will install all the packages defined in package.json file.

```
npm install
```

## Secrets

### The Secure Password

將以下字串貼到 Ecowork Slack 透過 `/decrypt` 取得加密解密用安全密碼

```
AQECAHgYhi+TjHUXc6v+Lu3jcPp3VvveRGfp7gtrNYFugssIcgAAAGowaAYJKoZIhvcNAQcGoFswWQIBADBUBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDGldo0D4NRZhHxY0kQIBEIAn/+4t16xd4D11rjz+tUYpABsQYn9cjFmVM3I3NGDpwSp1gGJTVKoJ
```

### Encrypt File

```
sls encrypt -s alpha -p '{the secure password}'
```

### Decrypt File

```
sls decrypt -s alpha -p '{the secure password}'
```

## Seeds

執行以下指令可以新增測試資料至 test stage

```
sls seed -s test
```

## Debug Mode

如果執行測試要看到 Signature keysSorted 的 log 資訊，可以宣告 SLS_DEBUG=*。

```
SLS_DEBUG=* npm test
```
