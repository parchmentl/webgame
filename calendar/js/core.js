'use strict';
/* 万年历 · 数据引擎：农历 / 天文节气 / 干支 / 节日 / 建除宜忌（1900–2100） */

const Cal = (() => {

  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const LMONTH = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const LDAY = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  const TERMS = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
  const OFFICERS = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  const YIJI = [
    { yi: ['出行', '赴任', '会友', '入学', '祈福'], ji: ['动土', '开仓', '掘井'] },
    { yi: ['沐浴', '剃头', '求医', '扫舍', '解除'], ji: ['嫁娶', '赴任', '远行'] },
    { yi: ['嫁娶', '祈福', '开市', '交易', '立券'], ji: ['服药', '栽种', '词讼'] },
    { yi: ['修造', '动土', '安床', '栽种', '牧养'], ji: ['祈福', '求嗣', '赴任', '开渠'] },
    { yi: ['祭祀', '祈福', '嫁娶', '修造', '安床'], ji: ['词讼', '出行', '交涉'] },
    { yi: ['捕捉', '结网', '收敛', '造屋', '种植'], ji: ['开市', '交易', '移徙', '远行'] },
    { yi: ['破屋', '坏垣', '求医', '治病'], ji: ['嫁娶', '开市', '入宅', '安葬'] },
    { yi: ['祭祀', '祈福', '交易', '安床'], ji: ['登高', '远行', '迁徙'] },
    { yi: ['开市', '交易', '立券', '嫁娶', '入学'], ji: ['词讼', '破土'] },
    { yi: ['纳财', '藏宝', '修仓', '纳畜', '入殓'], ji: ['出行', '开市', '嫁娶'] },
    { yi: ['开市', '交易', '出行', '嫁娶', '修造'], ji: ['破土', '安葬', '伐木'] },
    { yi: ['安葬', '收殓', '修坟', '筑堤', '闭户'], ji: ['开市', '嫁娶', '出行', '开光'] }
  ];
  const CONSTELL = [[1, 20, '水瓶座'], [2, 19, '双鱼座'], [3, 21, '白羊座'], [4, 20, '金牛座'],
    [5, 21, '双子座'], [6, 22, '巨蟹座'], [7, 23, '狮子座'], [8, 23, '处女座'],
    [9, 23, '天秤座'], [10, 24, '天蝎座'], [11, 23, '射手座'], [12, 22, '摩羯座']];
  const SOLAR_FEST = { '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '3-12': '植树节', '4-1': '愚人节',
    '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节', '7-1': '建党节', '8-1': '建军节',
    '9-10': '教师节', '10-1': '国庆节', '10-31': '万圣夜', '12-24': '平安夜', '12-25': '圣诞节' };
  const LUNAR_FEST = { '1-1': '春节', '1-15': '元宵节', '2-2': '龙抬头', '5-5': '端午节', '7-7': '七夕',
    '7-15': '中元节', '8-15': '中秋节', '9-9': '重阳节', '12-8': '腊八节', '12-23': '小年' };
  const JIE_ZHI = { '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7,
    '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 0, '小寒': 1 };

  // 1900–2100 农历压缩表：低 4 位闰月，0x10000 闰月大小，0x8000>>m 各月大小
  const INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520
  ];

  const rad = d => d * Math.PI / 180;
  const norm360 = d => ((d % 360) + 360) % 360;
  const gz = n => GAN[((n % 10) + 10) % 10] + ZHI[((n % 12) + 12) % 12];
  const utcDays = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const fromDays = n => { const t = new Date(n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  const pad2 = n => String(n).padStart(2, '0');

  /* ---------- 农历 ---------- */
  const leapMonth = y => INFO[y - 1900] & 0xf;
  const leapDays = y => leapMonth(y) ? ((INFO[y - 1900] & 0x10000) ? 30 : 29) : 0;
  const monthDays = (y, m) => (INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  function yearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) sum += (INFO[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  // 历元：1900-01-31 = 庚子年正月初一
  const EPOCH = utcDays(1900, 1, 31);

  function solarToLunar(y, m, d) {
    if (y < 1900 || y > 2100) return null;
    let offset = utcDays(y, m, d) - EPOCH;
    if (offset < 0) return null;
    let i, temp = 0;
    for (i = 1900; i < 2101 && offset > 0; i++) { temp = yearDays(i); offset -= temp; }
    if (offset < 0) { offset += temp; i--; }
    const year = i;
    const leap = leapMonth(year);
    let isLeap = false;
    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) { --i; isLeap = true; temp = leapDays(year); }
      else temp = monthDays(year, i);
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) isLeap = false; else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; --i; }
    const month = i, day = offset + 1;
    return {
      year, month, day, isLeap,
      monthText: (isLeap ? '闰' : '') + LMONTH[month - 1],
      dayText: LDAY[day - 1],
      yearGZ: gz(year - 4),
      zodiac: ZODIAC[((year - 4) % 12 + 12) % 12]
    };
  }

  function lunarToSolar(ly, lm, ld, isLeap) {
    let offset = 0;
    for (let i = 1900; i < ly; i++) offset += yearDays(i);
    const leap = leapMonth(ly);
    for (let i = 1; i < lm; i++) {
      offset += monthDays(ly, i);
      if (i === leap) offset += leapDays(ly);
    }
    if (isLeap) offset += monthDays(ly, lm);
    offset += ld - 1;
    return fromDays(EPOCH + offset);
  }

  /* ---------- 天文节气（VSOP87 截断 + 光行差 + 章动，北京时） ---------- */
  // 地球黄经周期项 [振幅(1e-8 rad), 相位, 频率]
  const XL = [
    [[175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517], [3497, 2.7441, 5753.3849],
      [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715], [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097],
      [1324, 0.7425, 11506.7698], [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
      [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694], [753, 2.533, 5507.553],
      [505, 4.583, 18849.228], [492, 4.205, 775.523], [357, 2.92, 0.067], [317, 5.849, 11790.629],
      [284, 1.899, 796.298], [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
      [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299], [132, 3.411, 2942.463],
      [126, 1.083, 20.775], [115, 0.645, 0.98], [103, 0.636, 4694.003], [102, 0.976, 15720.839],
      [102, 4.267, 7.114], [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
      [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15], [79, 3.04, 12036.46],
      [75, 1.76, 5088.63], [74, 3.5, 3154.69], [74, 4.68, 801.82], [70, 0.83, 9437.76],
      [62, 3.98, 8827.39], [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
      [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02], [51, 0.28, 5856.48],
      [49, 0.49, 1194.45], [41, 5.37, 8429.24], [41, 2.4, 19651.05], [39, 6.17, 10447.39],
      [37, 6.04, 10213.29], [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
      [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87], [25, 3.16, 4690.48]],
    [[628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517], [425, 1.59, 3.523],
      [119, 5.796, 26.298], [109, 2.966, 1577.344], [93, 2.59, 18849.23], [72, 1.14, 529.69],
      [68, 1.87, 398.15], [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
      [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11], [21, 5.34, 0.98],
      [19, 1.85, 5486.78], [19, 4.97, 213.3], [17, 2.99, 6275.96], [16, 0.03, 2544.31],
      [16, 1.43, 2146.17], [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
      [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57], [10, 1.3, 6286.6],
      [10, 4.24, 1349.87], [9, 2.7, 242.73], [9, 5.64, 951.72], [8, 5.3, 2352.87],
      [6, 2.65, 9437.76], [6, 4.67, 4690.48]],
    [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152], [27, 0.05, 3.52],
      [16, 5.19, 26.3], [16, 3.68, 155.42], [10, 0.76, 18849.23], [9, 2.06, 77713.77],
      [7, 0.83, 775.52], [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
      [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73], [3, 6.12, 529.69],
      [3, 0.31, 398.15], [3, 2.28, 553.57], [2, 4.38, 5223.69], [2, 3.75, 0.98]],
    [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.2, 155.42],
      [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73]],
    [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
    [[1, 3.14, 0]]
  ];

  function sunLon(jd) {
    const T = (jd - 2451545) / 36525;
    const tau = T / 10;
    let L = 0;
    for (let i = 0; i < XL.length; i++) {
      let s = 0;
      for (const [A, B, C] of XL[i]) s += A * Math.cos(B + C * tau);
      L += s * Math.pow(tau, i);
    }
    let deg = norm360(L / 1e8 * 180 / Math.PI + 180);
    const omega = 125.04 - 1934.136 * T;
    const ls = 280.4665 + 36000.7698 * T;
    const lm = 218.3165 + 481267.8813 * T;
    const dpsi = (-17.20 * Math.sin(rad(omega)) - 1.32 * Math.sin(rad(2 * ls))
      - 0.23 * Math.sin(rad(2 * lm)) + 0.21 * Math.sin(rad(2 * omega))) / 3600;
    return norm360(deg - 0.09033 / 3600 + dpsi - 20.4898 / 3600);
  }

  function deltaT(y) {
    let t;
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }

  const termCache = new Map();
  function termsOfYear(y) {
    if (termCache.has(y)) return termCache.get(y);
    const list = [];
    const jan1 = Date.UTC(y, 0, 1) / 86400000 + 2440587.5;
    for (let k = 0; k < 24; k++) {
      const target = (285 + k * 15) % 360;
      let jd = jan1 + 4 + k * 15.22;
      for (let it = 0; it < 24; it++) {
        let diff = ((target - sunLon(jd) + 180) % 360 + 360) % 360 - 180;
        jd += diff / 360 * 365.25;
        if (Math.abs(diff) < 1e-8) break;
      }
      const bj = jd - deltaT(y + k / 24) / 86400 + 8 / 24;
      let days = Math.floor(bj + 0.5);
      let mins = Math.round((bj + 0.5 - days) * 1440);
      if (mins >= 1440) { mins -= 1440; days += 1; }
      const dt = fromDays(days - 2440588);
      list.push({ name: TERMS[k], lon: target, y: dt.y, m: dt.m, d: dt.d, hh: Math.floor(mins / 60), mm: mins % 60, time: pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60) });
    }
    termCache.set(y, list);
    return list;
  }

  function termOn(y, m, d) {
    if (y < 1900 || y > 2100) return null;
    return termsOfYear(y).find(t => t.y === y && t.m === m && t.d === d) || null;
  }

  function nextTerm(y, m, d) {
    const key = utcDays(y, m, d);
    for (const yy of [y, y + 1]) {
      if (yy > 2100) break;
      for (const t of termsOfYear(yy)) {
        if (utcDays(t.y, t.m, t.d) > key) return Object.assign({ away: utcDays(t.y, t.m, t.d) - key }, t);
      }
    }
    return null;
  }

  /* ---------- 干支 / 建除 ---------- */
  // 年柱以立春为界（历法专业规则）；生肖以正月初一为界（民俗规则）
  function yearPillar(y, m, d) {
    const lc = termsOfYear(Math.min(Math.max(y, 1900), 2100)).find(t => t.name === '立春');
    const sy = utcDays(y, m, d) < utcDays(lc.y, lc.m, lc.d) ? y - 1 : y;
    return { gz: gz(sy - 4), gan: ((sy - 4) % 10 + 10) % 10, sy };
  }

  function monthPillar(y, m, d) {
    const key = utcDays(y, m, d);
    let jie = null;
    for (const yy of [y, y - 1]) {
      if (yy < 1900) continue;
      for (const t of termsOfYear(yy)) {
        if (JIE_ZHI[t.name] === undefined) continue;
        if (utcDays(t.y, t.m, t.d) <= key && (!jie || utcDays(t.y, t.m, t.d) > utcDays(jie.y, jie.m, jie.d))) jie = t;
      }
    }
    if (!jie) return { gz: '—', zhi: -1 };
    const zhi = JIE_ZHI[jie.name];
    const start = ((yearPillar(y, m, d).gan % 5) * 2 + 2) % 10;
    const stem = (start + (zhi - 2 + 12) % 12) % 10;
    return { gz: GAN[stem] + ZHI[zhi], zhi };
  }

  // 日柱锚点：JDN 2451594（2000-01-01）= 戊午
  function dayPillar(y, m, d) {
    const idx = ((utcDays(y, m, d) + 2440637) % 60 + 60) % 60;
    return { gz: GAN[idx % 10] + ZHI[idx % 12], idx, zhi: idx % 12 };
  }

  function officer(y, m, d) {
    const mp = monthPillar(y, m, d);
    const dp = dayPillar(y, m, d);
    if (mp.zhi < 0) return null;
    const idx = (dp.zhi - mp.zhi + 12) % 12;
    return Object.assign({ name: OFFICERS[idx] + '日', idx }, YIJI[idx]);
  }

  /* ---------- 节日 / 星座 ---------- */
  function festivals(y, m, d, lunar, term) {
    const out = [];
    const sf = SOLAR_FEST[m + '-' + d];
    if (sf) out.push({ name: sf, type: 'solar' });
    if (lunar && !lunar.isLeap) {
      const lf = LUNAR_FEST[lunar.month + '-' + lunar.day];
      if (lf) out.push({ name: lf, type: 'lunar' });
      if (lunar.month === 12 && lunar.day === monthDays(lunar.year, 12)) out.push({ name: '除夕', type: 'lunar' });
    }
    if (term && term.name === '清明') out.push({ name: '清明节', type: 'term' });
    const wd = new Date(y, m - 1, d).getDay();
    if (m === 5 && wd === 0 && d >= 8 && d <= 14) out.push({ name: '母亲节', type: 'rule' });
    if (m === 6 && wd === 0 && d >= 15 && d <= 21) out.push({ name: '父亲节', type: 'rule' });
    if (m === 11 && wd === 4 && d >= 22 && d <= 28) out.push({ name: '感恩节', type: 'rule' });
    return out;
  }

  function constellation(m, d) {
    let name = '摩羯座';
    for (const [cm, cd, cn] of CONSTELL) {
      if (m > cm || (m === cm && d >= cd)) name = cn;
    }
    return name;
  }

  function isoWeek(y, m, d) {
    const t = new Date(Date.UTC(y, m - 1, d));
    const day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    const fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / (7 * 86400000));
  }

  /* ---------- 汇总 ---------- */
  function dayInfo(y, m, d) {
    const lunar = solarToLunar(y, m, d);
    const term = termOn(y, m, d);
    const dp = dayPillar(y, m, d);
    const mp = monthPillar(y, m, d);
    const yp = yearPillar(y, m, d);
    const off = officer(y, m, d);
    const date = new Date(y, m - 1, d);
    return {
      y, m, d,
      weekday: date.getDay(),
      weekdayText: '星期' + WEEK[date.getDay()],
      lunar,
      term,
      nextTerm: nextTerm(y, m, d),
      gz: { year: yp.gz, month: mp.gz, day: dp.gz },
      zodiac: lunar ? lunar.zodiac : ZODIAC[((yp.sy - 4) % 12 + 12) % 12],
      constellation: constellation(m, d),
      festivals: festivals(y, m, d, lunar, term),
      officer: off,
      dayOfYear: Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1,
      isoWeek: isoWeek(y, m, d)
    };
  }

  return {
    GAN, ZHI, ZODIAC, WEEK, LMONTH, LDAY, TERMS, OFFICERS,
    MIN_YEAR: 1900, MAX_YEAR: 2100,
    solarToLunar, lunarToSolar, leapMonth, leapDays, monthDays, yearDays,
    termsOfYear, termOn, nextTerm, dayInfo,
    dayPillar, monthPillar, yearPillar, officer, constellation, festivals, isoWeek,
    utcDays, fromDays, pad2
  };
})();

if (typeof window !== 'undefined') window.Cal = Cal;
if (typeof module !== 'undefined' && module.exports) module.exports = Cal;