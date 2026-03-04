// ===== 数据模块 =====
const CalendarData = {
  // 节气数据（近似，按月日）
  solarTerms: {
    '2-4': '立春', '2-19': '雨水',
    '3-6': '惊蛰', '3-21': '春分',
    '4-5': '清明', '4-20': '谷雨',
    '5-6': '立夏', '5-21': '小满',
    '6-6': '芒种', '6-21': '夏至',
    '7-7': '小暑', '7-23': '大暑',
    '8-8': '立秋', '8-23': '处暑',
    '9-8': '白露', '9-23': '秋分',
    '10-8': '寒露', '10-23': '霜降',
    '11-8': '立冬', '11-22': '小雪',
    '12-7': '大雪', '12-22': '冬至'
  },

  // 法定节假日（2024-2025示例）
  holidays: {
    '2024-1-1': '元旦',
    '2024-2-10': '春节', '2024-2-11': '春节', '2024-2-12': '春节',
    '2024-4-4': '清明节', '2024-4-5': '清明节',
    '2024-5-1': '劳动节', '2024-5-2': '劳动节', '2024-5-3': '劳动节',
    '2024-6-10': '端午节',
    '2024-9-15': '中秋节', '2024-9-16': '中秋节', '2024-9-17': '中秋节',
    '2024-10-1': '国庆节', '2024-10-2': '国庆节', '2024-10-3': '国庆节',
    '2024-10-4': '国庆节', '2024-10-5': '国庆节', '2024-10-6': '国庆节', '2024-10-7': '国庆节',
    '2025-1-1': '元旦',
    '2025-1-28': '春节', '2025-1-29': '春节', '2025-1-30': '春节',
    '2025-5-1': '劳动节', '2025-5-2': '劳动节', '2025-5-3': '劳动节',
    '2025-10-1': '国庆节', '2025-10-2': '国庆节', '2025-10-3': '国庆节',
    '2025-10-4': '国庆节', '2025-10-5': '国庆节', '2025-10-6': '国庆节', '2025-10-7': '国庆节'
  },

  // 完整农历数据（示例，仅部分月份）
  lunarMonths: {
    2024: {
      1: { name: '正月', days: 30, newMoon: '2024-2-10' },
      2: { name: '二月', days: 29, newMoon: '2024-3-10' },
      3: { name: '三月', days: 30, newMoon: '2024-4-9' },
      4: { name: '四月', days: 29, newMoon: '2024-5-8' },
      5: { name: '五月', days: 30, newMoon: '2024-6-6' },
      6: { name: '六月', days: 29, newMoon: '2024-7-6' },
      7: { name: '七月', days: 30, newMoon: '2024-8-4' },
      8: { name: '八月', days: 29, newMoon: '2024-9-3' },
      9: { name: '九月', days: 30, newMoon: '2024-10-2' },
      10: { name: '十月', days: 29, newMoon: '2024-11-1' },
      11: { name: '十一月', days: 30, newMoon: '2024-11-30' },
      12: { name: '十二月', days: 29, newMoon: '2024-12-30' }
    },
    2025: {
      1: { name: '正月', days: 30, newMoon: '2025-1-29' },
      2: { name: '二月', days: 30, newMoon: '2025-2-28' },
      3: { name: '三月', days: 29, newMoon: '2025-3-29' },
      4: { name: '四月', days: 30, newMoon: '2025-4-28' },
      5: { name: '五月', days: 29, newMoon: '2025-5-27' },
      6: { name: '六月', days: 30, newMoon: '2025-6-25' },
      7: { name: '七月', days: 29, newMoon: '2025-7-25' },
      8: { name: '八月', days: 30, newMoon: '2025-8-23' },
      9: { name: '九月', days: 29, newMoon: '2025-9-22' },
      10: { name: '十月', days: 30, newMoon: '2025-10-21' },
      11: { name: '十一月', days: 29, newMoon: '2025-11-20' },
      12: { name: '十二月', days: 30, newMoon: '2025-12-19' }
    }
  },

  // 黄历数据（示例）
  almanac: {
    yi: ['开业', '嫁娶', '出行', '搬家', '入宅', '动土', '祈福', '祭祀'],
    ji: ['破土', '安床', '开仓', '作灶', '纳畜', '交易', '上梁'],
    zodiac: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
    constellations: [
      { name: '水瓶座', dates: [1, 19, 20] },
      { name: '双鱼座', dates: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
      { name: '白羊座', dates: [3, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      { name: '金牛座', dates: [4, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      { name: '双子座', dates: [5, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      { name: '巨蟹座', dates: [6, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
      { name: '狮子座', dates: [7, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      { name: '处女座', dates: [8, 23, 24, 25, 26, 27, 28, 29, 30] },
      { name: '天秤座', dates: [9, 23, 24, 25, 26, 27, 28, 29, 30] },
      { name: '天蝎座', dates: [10, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      { name: '射手座', dates: [11, 23, 24, 25, 26, 27, 28, 29, 30] },
      { name: '摩羯座', dates: [12, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] }
    ],

    getZodiac(year) {
      return this.zodiac[(year - 4) % 12];
    },

    getConstellation(month, day) {
      return this.constellations.find(c => c.dates.includes(day))?.name || '';
    },

    getAlmanac(year, month, day) {
      const zodiac = this.getZodiac(year);
      const constellation = this.getConstellation(month, day);
      const yi = this.yi.slice(0, 3);
      const ji = this.ji.slice(0, 2);
      return { zodiac, constellation, yi, ji };
    }
  },

  getHoliday(year, month, day) {
    return this.holidays[`${year}-${month}-${day}`] || null;
  },

  getLunarDay(year, month, day) {
    const yearData = this.lunarMonths[year];
    if (!yearData) return { day: '', month: '' };
    
    // 简化：返回农历日期
    return { day: `${day}`, month: yearData[month]?.name || '' };
  },

  getLunarDayText(year, month, day) {
    const lunar = this.getLunarDay(year, month, day);
    if (!lunar.day) return '';
    // 特殊日期
    if (lunar.day === '1') return '初一';
    if (lunar.day === '15') return '十五';
    return lunar.day;
  },

  getGanZhi(year, month, day) {
    // 简化干支计算，仅作示例
    const offset = (year - 4) % 60;
    const gan = this.heavenlyStems[Math.floor(offset / 10) % 10];
    const zhi = this.earthlyBranches[offset % 12];
    return `${gan}${zhi}`;
  },

  getSolarTerm(month, day) {
    return this.solarTerms[`${month}-${day}`] || null;
  }
};

// ===== 日历类 =====
class Calendar {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.today = new Date();
    this.weekdays = ['日','一','二','三','四','五','六'];
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateInputs();
    this.render();
  }

  bindEvents() {
    document.getElementById('yearInput').addEventListener('change', (e) => {
      this.currentYear = parseInt(e.target.value) || this.today.getFullYear();
      this.render();
    });
    document.getElementById('monthInput').addEventListener('change', (e) => {
      this.currentMonth = parseInt(e.target.value.split('-')[1]) || 1;
      this.render();
    });
  }

  updateInputs() {
    document.getElementById('yearInput').value = this.currentYear;
    document.getElementById('monthInput').value = `${String(this.currentMonth).padStart(2, '0')}`;
  }

  goToday() {
    this.currentYear = this.today.getFullYear();
    this.currentMonth = this.today.getMonth() + 1;
    this.updateInputs();
    this.render();
  }

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }
    this.updateInputs();
    this.render();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    }
    this.updateInputs();
    this.render();
  }

  selectDate(day) {
    const almanac = CalendarData.getAlmanac(this.currentYear, this.currentMonth, day);
    const holiday = CalendarData.getHoliday(this.currentYear, this.currentMonth, day);
    const lunar = CalendarData.getLunarDayText(this.currentYear, this.currentMonth, day);
    
    let info = `${this.currentYear}年${this.currentMonth}月${day}日`;
    
    if (holiday) {
      info += ` · ${holiday}`;
    }
    
    if (lunar.month || lunar.day) {
      info += ` · 农历${lunar.month}${lunar.day}`;
    }
    
    if (almanac.zodiac) {
      info += ` · ${almanac.zodiac}年`;
    }
    
    if (almanac.constellation) {
      info += ` · ${almanac.constellation}`;
    }
    
    if (almanac.yi.length > 0) {
      info += ` · 宜：${almanac.yi.join('、')}`;
    }
    
    if (almanac.ji.length > 0) {
      info += ` · 忌：${almanac.ji.join('、')}`;
    }
    
    document.getElementById('info').innerHTML = info;
  }

  render() {
    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();
    const isCurrentMonth = this.today.getFullYear() === this.currentYear && this.today.getMonth() + 1 === this.currentMonth;
    const todayDate = this.today.getDate();

    let html = '';

    // 星期标题
    this.weekdays.forEach(day => {
      html += `<div class="header-cell">${day}</div>`;
    });

    // 上月尾部
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="day-cell other-month">${daysInPrevMonth - i}</div>`;
    }

    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === todayDate;
      const holiday = CalendarData.getHoliday(this.currentYear, this.currentMonth, day);
      const solarTerm = CalendarData.getSolarTerm(this.currentMonth, day);
      const lunar = CalendarData.getLunarDayText(this.currentYear, this.currentMonth, day);
      const ganZhi = CalendarData.getGanZhi(this.currentYear, this.currentMonth, day);
      
      let dayClass = 'day-cell';
      if (isToday) dayClass += ' today';
      if (holiday) dayClass += ' holiday';
      
      let dayHtml = `<div class="${dayClass}" onclick="calendar.selectDate(${day})">${day}`;
      
      // 显示优先级：节日 > 节气 > 农历
      if (holiday) {
        dayHtml += `<span class="holiday">${holiday}</span>`;
      } else if (solarTerm) {
        dayHtml += `<span class="solar-term">${solarTerm}</span>`;
      } else if (lunar) {
        dayHtml += `<div class="lunar-info"><span class="lunar-month">${lunar.month}</span><span class="lunar-day">${lunar.day}</span></div>`;
      }
      
      dayHtml += `</div>`;
      html += dayHtml;
    }

    // 下月开始
    const totalCells = firstDay + daysInMonth;
    const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= nextMonthDays; day++) {
      html += `<div class="day-cell other-month">${day}</div>`;
    }

    document.getElementById('calendar').innerHTML = html;
    this.updateInfo();
  }

  updateInfo() {
    document.getElementById('info').textContent = `${this.currentYear}年${this.currentMonth}月`;
  }
}

// ===== 全局函数（供HTML onclick调用） =====
let calendar;

function goToday() { calendar.goToday(); }
function prevMonth() { calendar.prevMonth(); }
function nextMonth() { calendar.nextMonth(); }

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  calendar = new Calendar();
});
