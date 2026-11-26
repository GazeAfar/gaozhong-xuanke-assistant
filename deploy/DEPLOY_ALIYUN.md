# 阿里云 ECS 部署指南

本服务为零第三方运行时依赖的 Node.js 20 HTTP API，启动时直接将 `data/normalized/js-2027.json`（79,753 条江苏 2027 官方院校专业选科要求）加载至内存索引，内存占用约 60–90 MB，单次检索耗时 < 5ms，无需额外部署数据库。

## 1. 上传必要文件到阿里云 ECS

只需上传以下两个目录（无需上传 `node_modules` 或 `data/raw`）：
- `server/`
- `data/normalized/`（包含 `js-2027.json`、`js-2027-rule.json`、`sources.json`）

```bash
ssh root@<你的ECS公网IP> "mkdir -p /opt/gaozhong-xuanke-assistant/data"
scp -r server root@<你的ECS公网IP>:/opt/gaozhong-xuanke-assistant/
scp -r data/normalized root@<你的ECS公网IP>:/opt/gaozhong-xuanke-assistant/data/
```

## 2. 启动方式（二选一）

### 方式 A：Node.js 20 + systemd（推荐）
```bash
cp deploy/xuanke-api.service /etc/systemd/system/xuanke-api.service
systemctl daemon-reload
systemctl enable --now xuanke-api
curl http://127.0.0.1:3000/healthz
```

### 方式 B：Docker
```bash
docker build -f deploy/Dockerfile -t xuanke-api:0.1 .
docker run -d --name xuanke-api --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /opt/gaozhong-xuanke-assistant/data/runtime:/app/data/runtime \
  xuanke-api:0.1
```

## 3. 配置 Nginx HTTPS 与微信小程序合法域名

1. 参考 `deploy/nginx.conf.example` 配置已备案域名与 SSL 证书，将 `https://api.yourdomain.com` 反向代理至 `127.0.0.1:3000`。
2. 在微信公众平台 → 开发管理 → 开发设置 → 服务器域名中，将 `https://api.yourdomain.com` 加入 `request合法域名`。
3. 将 `miniprogram/services/api.ts` 中的 `DEFAULT_API_BASE_URL` 改为 `https://api.yourdomain.com`。
