import { DEFAULT_API_BASE_URL } from './services/api';

export interface AppGlobalData {
  apiBaseUrl: string;
  appVersion: string;
}

App<{ globalData: AppGlobalData }>({
  globalData: {
    // 上线前替换为阿里云 HTTPS 域名，例如 https://api.yourdomain.com
    apiBaseUrl: DEFAULT_API_BASE_URL,
    appVersion: '0.1.0',
  },

  onLaunch() {
    // 所有计算在本地规则引擎执行，公共规则与专业查询通过阿里云 HTTPS API 读取
  },
});
