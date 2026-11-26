import { ApiResponse } from '../lib/contracts/index';

/**
 * 阿里云自建 API 网关地址配置：
 * - 本地微信开发者工具联调：http://127.0.0.1:3000（需在开发者工具勾选“不校验合法域名”）
 * - 生产环境（阿里云 ECS + Nginx HTTPS）：替换为已备案并配置在微信后台 request 合法域名中的 https:// 域名
 */
export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';

export function getApiBaseUrl(): string {
  const app = getApp<{ globalData?: { apiBaseUrl?: string } }>();
  return app?.globalData?.apiBaseUrl || DEFAULT_API_BASE_URL;
}

export function callApiAction<TData = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 8000
): Promise<ApiResponse<TData>> {
  const requestId = `${action.replace(/\./g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const url = `${getApiBaseUrl().replace(/\/$/, '')}/api/v1/action`;

  return new Promise((resolve) => {
    wx.request({
      url,
      method: 'POST',
      timeout: timeoutMs,
      header: {
        'content-type': 'application/json',
      },
      data: {
        action,
        requestId,
        payload,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && typeof res.data === 'object') {
          resolve(res.data as ApiResponse<TData>);
          return;
        }
        resolve({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: `服务返回异常状态（HTTP ${res.statusCode}）`,
          },
          requestId,
          schemaVersion: '1.0',
        });
      },
      fail() {
        resolve({
          ok: false,
          error: {
            code: 'NETWORK_ERROR',
            message: '无法连接服务器，请检查网络或服务地址配置',
          },
          requestId,
          schemaVersion: '1.0',
        });
      },
    });
  });
}
