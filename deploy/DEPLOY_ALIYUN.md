# 阿里云 ECS 部署指南

本服务为零第三方运行时依赖的 Node.js 20 Web + SSR 服务，启动时直接将 `data/normalized/` 下各省官方专业选科要求（江苏 79,753 条 + 湖北 81,803 条，随 `server/provinces.mjs` 扩展）加载至内存索引，内存占用约 120–180 MB，单次检索耗时 < 5ms，无需额外部署数据库。

## 1. 上传必要文件到阿里云 ECS

只需上传以下三个目录（无需上传 `node_modules` 或 `data/raw`）：
- `server/`
- `web/`
- `data/normalized/`（包含 `js-2027.json`、`js-2027-rule.json`、`hb-2027.json`、`hb-2027-rule.json`、`sources.json` 等）

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
