/**
 * 多省份统一注册表（Single Source of Truth）：
 * 新增 3+1+2 省份只需：
 * 1. 导入官方数据到 data/normalized/<code.toLowerCase()>-2027.json 与 <code.toLowerCase()>-2027-rule.json；
 * 2. 在 sources.json 补充官方来源；
 * 3. 在下方 PROVINCE_REGISTRY 增加一条配置并生成 web/qr-<slug>.svg。
 */

export const STANDARD_312_GRADES = [
  { grade: 'A', ratio: '约 15%', rankRange: '前 15%', scoreRange: '100-86' },
  { grade: 'B', ratio: '约 35%', rankRange: '15%~50%', scoreRange: '85-71' },
  { grade: 'C', ratio: '约 35%', rankRange: '50%~85%', scoreRange: '70-56' },
  { grade: 'D', ratio: '约 13%', rankRange: '85%~98%', scoreRange: '55-41' },
  { grade: 'E', ratio: '约 2%', rankRange: '后 2%', scoreRange: '40-30' },
];

export const PROVINCE_REGISTRY = [
  {
    code: 'JS',
    slug: 'jiangsu',
    name: '江苏',
    fullName: '江苏省',
    shortGeo: '在苏',
    mode: '3+1+2',
    ruleFile: 'js-2027-rule.json',
    bundleFile: 'js-2027.json',
    sourceId: 'S01',
    authorityName: '江苏省教育考试院',
    authorityDept: '江苏省教育厅',
    sampleSearchPlaceholder: '搜高校或专业，如：南京大学、计算机、临床医学',
    qrPath: '/qr-jiangsu.svg',
    keywordsExtra: '江苏高中选科,江苏高一选科,南京高中选科,南京高一选科',
    provinceExamName: '江苏省考',
    hubCities: '南京、苏州、无锡等苏南重点城市',
    regionIndustryNote: '江苏本地（苏锡常、南京）大量高端制造与芯片企业',
    gridLocalNote: '江苏电网省公司及南京/苏州/无锡等苏南市局核心岗',
    gridCountyNote: '江苏部分县级供电局及电建/新能源企业',
    teacherHubCities: '南京/苏州等重点城市重点中学教师编',
    grades: STANDARD_312_GRADES,
    storagePrefix: 'js_xuanke_web',
  },
  {
    code: 'HB',
    slug: 'hubei',
    name: '湖北',
    fullName: '湖北省',
    shortGeo: '在鄂',
    mode: '3+1+2',
    ruleFile: 'hb-2027-rule.json',
    bundleFile: 'hb-2027.json',
    sourceId: 'S03',
    authorityName: '湖北省教育考试院',
    authorityDept: '湖北省教育厅',
    sampleSearchPlaceholder: '搜高校或专业，如：武汉大学、华中科技大学、计算机',
    qrPath: '/qr-hubei.svg',
    keywordsExtra: '湖北高中选科,湖北高一选科,武汉高中选科,武汉高一选科',
    provinceExamName: '湖北省考',
    hubCities: '武汉、襄阳、宜昌等省内重点城市',
    regionIndustryNote: '湖北本地（武汉光谷、车谷及襄阳/宜昌）大量光电子信息、新能源汽车与智能制造企业',
    gridLocalNote: '国网湖北省电力公司及武汉/襄阳/宜昌等重点市局核心岗',
    gridCountyNote: '湖北部分地市县级供电局及水电/新能源企业',
    teacherHubCities: '武汉等省内重点城市重点中学教师编',
    grades: STANDARD_312_GRADES,
    storagePrefix: 'hb_xuanke_web',
  },
];

export const DEFAULT_PROVINCE_CODE = 'JS';

const BY_CODE = new Map(PROVINCE_REGISTRY.map((p) => [p.code.toUpperCase(), p]));
const BY_SLUG = new Map(PROVINCE_REGISTRY.map((p) => [p.slug.toLowerCase(), p]));

export function getProvinceByCode(code) {
  if (!code) return BY_CODE.get(DEFAULT_PROVINCE_CODE);
  return BY_CODE.get(String(code).trim().toUpperCase()) || null;
}

export function getProvinceBySlug(slug) {
  if (!slug) return null;
  return BY_SLUG.get(String(slug).trim().toLowerCase()) || null;
}

export function resolveProvince(input) {
  if (!input) return BY_CODE.get(DEFAULT_PROVINCE_CODE);
  const raw = String(input).trim();
  return getProvinceByCode(raw) || getProvinceBySlug(raw) || BY_CODE.get(DEFAULT_PROVINCE_CODE);
}
