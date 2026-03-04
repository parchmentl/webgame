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

  // 跨年份通用公历节日兜底
  fixedSolarHolidays: {
    '1-1': '元旦',
    '5-1': '劳动节',
    '10-1': '国庆节'
  },

  lunarFormatter: (() => {
    try {
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });
    } catch (error) {
      return null;
    }
  })(),

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
    constellations: ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座'],
    constellationCutoffDays: [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22],

    getZodiac(year) {
      return this.zodiac[(year - 4) % 12];
    },

    getConstellation(month, day) {
      if (month < 1 || month > 12 || day < 1 || day > 31) return '';
      const cutoff = this.constellationCutoffDays[month - 1];
      return day < cutoff ? this.constellations[month - 1] : this.constellations[month];
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
    return this.holidays[`${year}-${month}-${day}`] || this.fixedSolarHolidays[`${month}-${day}`] || null;
  },

  getLunarDay(year, month, day) {
    if (this.lunarFormatter) {
      try {
        const date = new Date(year, month - 1, day);
        const parts = this.lunarFormatter.formatToParts(date);
        const monthText = parts.find(part => part.type === 'month')?.value || '';
        const dayRaw = (parts.find(part => part.type === 'day')?.value || '').replace(/[日号]/g, '');
        const dayNumber = Number.parseInt(dayRaw, 10);
        return {
          month: monthText,
          day: Number.isNaN(dayNumber) ? dayRaw : String(dayNumber)
        };
      } catch (error) {
      }
    }

    const yearData = this.lunarMonths[year];
    if (!yearData) return { day: '', month: '' };
    return { day: `${day}`, month: yearData[month]?.name || '' };
  },

  getLunarDayText(year, month, day) {
    const lunar = this.getLunarDay(year, month, day);
    if (!lunar.day) return { month: '', day: '' };
    const dayTextMap = {
      1: '初一', 2: '初二', 3: '初三', 4: '初四', 5: '初五',
      6: '初六', 7: '初七', 8: '初八', 9: '初九', 10: '初十',
      11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
      16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十',
      21: '廿一', 22: '廿二', 23: '廿三', 24: '廿四', 25: '廿五',
      26: '廿六', 27: '廿七', 28: '廿八', 29: '廿九', 30: '三十'
    };
    const dayNumber = Number.parseInt(lunar.day, 10);
    const dayText = dayTextMap[dayNumber] || lunar.day;
    return { month: lunar.month, day: dayText };
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
    this.selectedDay = null;
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
      this.updateInputs();
      this.render();
    });
    document.getElementById('monthInput').addEventListener('change', (e) => {
      const [year, month] = e.target.value.split('-').map(Number);
      this.currentYear = year || this.currentYear;
      this.currentMonth = month || 1;
      this.updateInputs();
      this.render();
    });

    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const drawerOverlay = document.getElementById('drawerOverlay');
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', () => {
        this.closeDrawer();
      });
    }
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', () => {
        this.closeDrawer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDrawer();
    });
  }

  updateInputs() {
    document.getElementById('yearInput').value = this.currentYear;
    document.getElementById('monthInput').value = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
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
    this.selectedDay = day;
    this.render();
    const almanac = CalendarData.getAlmanac(this.currentYear, this.currentMonth, day);
    const holiday = CalendarData.getHoliday(this.currentYear, this.currentMonth, day);
    const lunar = CalendarData.getLunarDayText(this.currentYear, this.currentMonth, day);
    const solarTerm = CalendarData.getSolarTerm(this.currentMonth, day);
    const weekday = this.weekdays[new Date(this.currentYear, this.currentMonth - 1, day).getDay()];
    
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
    
    document.getElementById('info').textContent = info;
    this.renderDrawer({
      day,
      weekday,
      holiday,
      solarTerm,
      lunar,
      almanac
    });
    this.openDrawer();
  }

  renderDrawer(data) {
    const drawerContent = document.getElementById('drawerContent');
    if (!drawerContent) return;
    const headerLine = `${this.currentYear}年${this.currentMonth}月${data.day}日 星期${data.weekday}`;
    let html = `<div class="drawer-item">${headerLine}</div>`;

    if (data.lunar.month || data.lunar.day) {
      html += `<div class="drawer-item"><span class="drawer-label">农历：</span>${data.lunar.month}${data.lunar.day}</div>`;
    }
    if (data.holiday) {
      html += `<div class="drawer-item"><span class="drawer-label">节日：</span>${data.holiday}</div>`;
    }
    if (data.solarTerm) {
      html += `<div class="drawer-item"><span class="drawer-label">节气：</span>${data.solarTerm}</div>`;
    }
    html += `<div class="drawer-item"><span class="drawer-label">生肖：</span>${data.almanac.zodiac}</div>`;
    html += `<div class="drawer-item"><span class="drawer-label">星座：</span>${data.almanac.constellation}</div>`;
    html += `<div class="drawer-item"><span class="drawer-label">宜：</span>${data.almanac.yi.join('、')}</div>`;
    html += `<div class="drawer-item"><span class="drawer-label">忌：</span>${data.almanac.ji.join('、')}</div>`;

    drawerContent.innerHTML = html;
  }

  openDrawer() {
    const drawer = document.getElementById('almanacDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.style.transform = 'translateX(0)';
    drawer.setAttribute('aria-hidden', 'false');
  }

  closeDrawer() {
    const drawer = document.getElementById('almanacDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.style.transform = '';
    drawer.setAttribute('aria-hidden', 'true');
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
      let dayClass = 'day-cell';
      if (isToday) dayClass += ' today';
      if (holiday) dayClass += ' holiday';
      if (day === this.selectedDay) dayClass += ' selected';
      
      let dayHtml = `<div class="${dayClass}" data-day="${day}">${day}`;
      
      // 显示优先级：节日 > 节气 > 农历
      if (holiday) {
        dayHtml += `<span class="holiday">${holiday}</span>`;
      } else if (solarTerm) {
        dayHtml += `<span class="solar-term">${solarTerm}</span>`;
      } else if (lunar.month || lunar.day) {
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
    this.bindDayCellEvents();
    this.updateInfo();
  }

  bindDayCellEvents() {
    const cells = document.querySelectorAll('.calendar-grid .day-cell[data-day]');
    cells.forEach((cell) => {
      cell.addEventListener('click', () => {
        const day = Number.parseInt(cell.dataset.day || '', 10);
        if (!Number.isNaN(day)) this.selectDate(day);
      });
    });
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
