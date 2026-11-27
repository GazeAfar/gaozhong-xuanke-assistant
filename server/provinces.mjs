/**
 * 多省份统一注册表（Single Source of Truth）：
 * 新增 3+1+2 省份只需：
 * 1. 导入官方数据到 data/normalized/<code.toLowerCase()>-2027.json 与 <code.toLowerCase()>-2027-rule.json；
 * 2. 运行 node scripts/build-province-stats.mjs 生成轻量预计算索引 *-stats.json；
 * 3. 在 sources.json 补充官方来源；
 * 4. 在下方 PROVINCE_REGISTRY 增加一条配置并生成 web/qr-<slug>.svg。
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
    statsFile: 'js-2027-stats.json',
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
    statsFile: 'hb-2027-stats.json',
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
  {
    code: 'HA',
    slug: 'henan',
    name: '河南',
    fullName: '河南省',
    shortGeo: '在豫',
    mode: '3+1+2',
    ruleFile: 'ha-2027-rule.json',
    bundleFile: 'ha-2027.json',
    statsFile: 'ha-2027-stats.json',
    sourceId: 'S04',
    authorityName: '河南省教育考试院',
    authorityDept: '河南省教育考试院',
    sampleSearchPlaceholder: '搜高校或专业，如：郑州大学、河南大学、计算机',
    qrPath: '/qr-henan.svg',
    keywordsExtra: '河南高中选科,河南高一选科,郑州高中选科,郑州高一选科',
    provinceExamName: '河南省考',
    hubCities: '郑州、洛阳等中原重点城市',
    regionIndustryNote: '河南本地（郑州航空港、洛阳先进制造基地）的新能源汽车、电子信息与装备制造企业',
    gridLocalNote: '国网河南省电力公司及郑州/洛阳等重点市局核心岗',
    gridCountyNote: '河南各地市县级供电局及铁路/能源企业',
    teacherHubCities: '郑州、洛阳等重点城市重点中学教师编',
    grades: STANDARD_312_GRADES,
    storagePrefix: 'ha_xuanke_web',
  },
  {
    code: 'HE',
    slug: 'hebei',
    name: '河北',
    fullName: '河北省',
    shortGeo: '在冀',
    mode: '3+1+2',
    ruleFile: 'he-2027-rule.json',
    bundleFile: 'he-2027.json',
    statsFile: 'he-2027-stats.json',
    sourceId: 'S05',
    authorityName: '河北省教育考试院',
    authorityDept: '河北省教育厅',
    sampleSearchPlaceholder: '搜高校或专业，如：河北工业大学、燕山大学、临床医学',
    qrPath: '/qr-hebei.svg',
    keywordsExtra: '河北高中选科,河北高一选科,石家庄高中选科,唐山高中选科',
    provinceExamName: '河北省考',
    hubCities: '石家庄、唐山、雄安新区及京津冀城市群',
    regionIndustryNote: '京津冀协同与河北本地（石家庄、唐山、雄安新区）的生物医药、新能源、装备制造与数字经济企业',
    gridLocalNote: '国网河北/冀北电力省公司及石家庄、唐山、雄安核心岗',
    gridCountyNote: '河北各地市县级供电局及新能源发电企业',
    teacherHubCities: '石家庄、唐山及京津冀重点城市中学教师编',
    grades: STANDARD_312_GRADES,
    storagePrefix: 'he_xuanke_web',
  },
  {
    code: 'HN',
    slug: 'hunan',
    name: '湖南',
    fullName: '湖南省',
    shortGeo: '在湘',
    mode: '3+1+2',
    ruleFile: 'hn-2027-rule.json',
    bundleFile: 'hn-2027.json',
    statsFile: 'hn-2027-stats.json',
    sourceId: 'S06',
    authorityName: '湖南省教育考试院',
    authorityDept: '湖南省教育厅',
    sampleSearchPlaceholder: '搜高校或专业，如：中南大学、湖南大学、计算机',
    qrPath: '/qr-hunan.svg',
    keywordsExtra: '湖南高中选科,湖南高一选科,长沙高中选科,长沙高一选科',
    provinceExamName: '湖南省考',
    hubCities: '长沙、株洲、湘潭等长株潭重点城市',
    regionIndustryNote: '湖南本地（长株潭）底子极厚的工程机械、轨道交通、新能源与新一代信息技术企业',
    gridLocalNote: '国网湖南省电力公司及长沙/株洲/湘潭等重点市局核心岗',
    gridCountyNote: '湖南各地市县级供电局及轨交/装备制造企业',
    teacherHubCities: '长沙等省内重点城市重点中学教师编',
    grades: STANDARD_312_GRADES,
    storagePrefix: 'hn_xuanke_web',
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
