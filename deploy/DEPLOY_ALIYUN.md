# 阿里云 ECS 部署指南

本服务为零第三方运行时依赖的 Node.js 20 Web + SSR 服务，启动时仅加载各省轻量 `*-stats.json`（约 15 KB/省，支持毫秒级冷启动），院校明细按省份懒加载并由有界 LRU 缓存管理（默认最多常驻 2 省），即使接入 5 省（43.4 万+ 条）内存占用仍稳定在 150–220 MB，无需额外部署数据库。

## 1. 上传必要文件到阿里云 ECS

只需上传以下三个目录（无需上传 `node_modules` 或 `data/raw`）：
- `server/`
- `web/`
- `data/normalized/`（包含各省 `*-2027.json`、`*-2027-rule.json`、`*-2027-stats.json` 与 `sources.json`）

```bash
ssh root@<你的ECS公网IP> "mkdir -p /opt/gaozhong-xuanke-assistant/data"
scp -r server web root@<你的ECS公网IP>:/opt/gaozhong-xuanke-assistant/
scp -r data/normalized root@<你的ECS公网IP>:/opt/gaozhong-xuanke-assistant/data/
```

## 2. 启动方式（二选一）

### 方式 A：Node.js 20 + systemd（推荐）
```bash
cp deploy/xuanke-api.service /etc/systemd/system/xuanke-web.service
systemctl daemon-reload
systemctl enable --now xuanke-web
curl http://127.0.0.1:3000/healthz
```

### 方式 B：Docker
```bash
docker build -f deploy/Dockerfile -t xuanke-web:1.0 .
docker run -d --name xuanke-web --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e SITE_URL=https://xuanke.visc.cn \
  xuanke-web:1.0
```

## 3. 配置 Nginx HTTPS 与搜索引擎收录

1. 参考 `deploy/nginx.conf.example` 配置已备案域名（如 `xuanke.visc.cn`）与 SSL 证书，将 `https://xuanke.visc.cn` 反向代理至 `127.0.0.1:3000`。
2. 上线后验证以下地址可正常访问：
   - 首页：`https://xuanke.visc.cn/`
   - 江苏选科分析：`https://xuanke.visc.cn/jiangsu`
   - 湖北选科分析：`https://xuanke.visc.cn/hubei`
   - 站点地图：`https://xuanke.visc.cn/sitemap.xml`
   - 爬虫规则与 AI 检索说明：`https://xuanke.visc.cn/robots.txt`、`https://xuanke.visc.cn/llms.txt`
3. 将 `https://xuanke.visc.cn/sitemap.xml` 提交至 Google Search Console 与百度搜索资源平台加速收录。
