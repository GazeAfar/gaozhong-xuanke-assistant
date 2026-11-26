import { loadSettings } from './storage';

/**
 * 隐私友好埋点适配器：
 * 1. 默认关闭，仅在用户开启可选统计时记录事件名、耗时区间等非敏感元信息。
 * 2. 严禁发送自评、兴趣、专业意向、学校、姓名或报告全文。
 */
export type AnalyticsEventName =
  | 'home_view'
  | 'assessment_start'
  | 'report_open'
  | 'compare_open'
  | 'major_search';

export function trackEvent(
  eventName: AnalyticsEventName,
  meta?: { durationBucket?: string; provinceSupported?: boolean }
): void {
  const settings = loadSettings();
  if (!settings.analyticsOptIn) {
    return;
  }
  // 预留轻量上报接口；仅保留脱敏后的事件结构
  void eventName;
  void meta;
}
