/* 角色与招式数据。帧数均为 60Hz 逻辑帧。 */

function mkMove(o){
  const d={
    startup:8, active:3, recovery:12,
    dmg:40, hitstun:16, blockstun:10,
    level:'mid', kd:false, hitstop:6,
    box:{x:24,y:120,w:80,h:56},
    vx:0, vxF:0, vy:0,
    kind:'strike', inv:null, armor:0,
    hits:1, interval:8, cost:0, ex:false, sdm:false,
    proj:null, wall:null, slow:0, label:''
  };
  return Object.assign(d, o);
}

const NORMALS={
  stand:{
    LP:mkMove({startup:4,active:3,recovery:7,dmg:30,hitstun:12,blockstun:9,box:{x:22,y:150,w:74,h:40}}),
    LK:mkMove({startup:5,active:3,recovery:8,dmg:35,hitstun:13,blockstun:10,box:{x:24,y:100,w:82,h:44}}),
    HP:mkMove({startup:8,active:4,recovery:16,dmg:70,hitstun:20,blockstun:14,hitstop:9,box:{x:26,y:140,w:96,h:52}}),
    HK:mkMove({startup:10,active:4,recovery:18,dmg:80,hitstun:22,blockstun:16,hitstop:9,box:{x:24,y:80,w:104,h:64}})
  },
  crouch:{
    LP:mkMove({startup:4,active:3,recovery:7,dmg:25,hitstun:12,blockstun:9,box:{x:22,y:70,w:74,h:36}}),
    LK:mkMove({startup:5,active:3,recovery:8,dmg:30,hitstun:13,blockstun:10,level:'low',box:{x:24,y:0,w:86,h:36}}),
    HP:mkMove({startup:7,active:4,recovery:15,dmg:65,hitstun:19,blockstun:13,box:{x:24,y:110,w:88,h:56}}),
    HK:mkMove({startup:9,active:4,recovery:20,dmg:75,hitstun:19,blockstun:14,level:'low',kd:true,hitstop:9,box:{x:24,y:0,w:102,h:40}})
  },
  air:{
    LP:mkMove({startup:5,active:6,recovery:4,dmg:30,hitstun:14,blockstun:10,box:{x:22,y:120,w:74,h:44}}),
    LK:mkMove({startup:6,active:6,recovery:4,dmg:35,hitstun:15,blockstun:11,box:{x:22,y:90,w:84,h:52}}),
    HP:mkMove({startup:8,active:5,recovery:6,dmg:65,hitstun:20,blockstun:14,hitstop:9,box:{x:24,y:100,w:88,h:60}}),
    HK:mkMove({startup:9,active:5,recovery:8,dmg:75,hitstun:22,blockstun:16,level:'overhead',hitstop:9,box:{x:24,y:70,w:92,h:66}})
  }
};

const COMMON={
  blow:mkMove({startup:14,active:4,recovery:18,dmg:70,hitstun:24,blockstun:14,kd:true,launch:true,hitstop:10,box:{x:26,y:90,w:104,h:72},label:'吹飞攻击'}),
  rollFrames:26
};

const CHARS=[
  {
    id:'yan', name:'焰', tag:'YAN · 烈火拳士', style:'突进 · 火焰',
    desc:'近身压制，波动与升龙兼备',
    palette:{pants:'#3a1a2c',cloth:'#c0402c',accent:'#ffb347',skin:'#f2c9a0',hair:'#251320',aura:'#ff7a3c',light:'#ffd7a0'},
    speed:{walk:4.4,back:3.5,dash:9.2,jumpV:20,jumpX:5.9},
    throwDmg:110,
    moves:{
      c6hp:mkMove({startup:9,active:4,recovery:16,dmg:55,hitstun:20,blockstun:13,level:'overhead',hitstop:9,box:{x:24,y:120,w:86,h:92},label:'炎崩拳'}),
      c3hk:mkMove({startup:8,active:4,recovery:15,dmg:60,hitstun:18,blockstun:12,level:'low',kd:true,box:{x:24,y:0,w:96,h:38},label:'扫焰腿'}),
      '236P':mkMove({startup:14,active:2,recovery:22,dmg:70,hitstun:18,blockstun:12,kind:'proj',label:'焰波',
        proj:{speed:6,w:44,h:40,y:96,dmg:70,hitstun:18,blockstun:12,hitstop:7}}),
      '236PP':mkMove({startup:14,active:2,recovery:22,dmg:95,hitstun:20,blockstun:14,kind:'proj',cost:100,ex:true,label:'焰波·EX',
        proj:{speed:8,w:52,h:46,y:96,dmg:95,hitstun:20,blockstun:14,hitstop:8}}),
      '623P':mkMove({startup:4,active:6,recovery:20,dmg:90,hitstun:22,blockstun:14,kd:true,hitstop:9,inv:{s:1,e:3},vy:9,box:{x:18,y:120,w:72,h:140},label:'升焰'}),
      '623PP':mkMove({startup:4,active:8,recovery:20,dmg:120,hitstun:24,blockstun:16,kd:true,hitstop:10,inv:{s:1,e:6},vy:11,cost:100,ex:true,box:{x:18,y:120,w:78,h:150},label:'升焰·EX'}),
      '214K':mkMove({startup:12,active:6,recovery:16,dmg:75,hitstun:20,blockstun:13,kd:true,hitstop:9,vx:8,vxF:12,box:{x:18,y:70,w:86,h:80},label:'旋风脚'}),
      '214KK':mkMove({startup:10,active:8,recovery:16,dmg:100,hitstun:22,blockstun:15,kd:true,hitstop:10,vx:9,vxF:14,cost:100,ex:true,box:{x:18,y:70,w:92,h:84},label:'旋风脚·EX'}),
      '236236P':mkMove({startup:10,active:8,recovery:30,dmg:52,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:100,kd:true,box:{x:36,y:60,w:340,h:210},label:'炎狱炼波'}),
      '236236PP':mkMove({startup:10,active:8,recovery:30,dmg:64,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:200,sdm:true,kd:true,box:{x:36,y:50,w:400,h:230},label:'炎狱炼波·SDM'}),
      throwMove:mkMove({startup:3,active:3,recovery:20,dmg:110,hitstun:30,kd:true,hitstop:12,label:'炎投'})
    }
  },
  {
    id:'lei', name:'雷', tag:'LEI · 疾电脚', style:'速度 · 雷电',
    desc:'高速位移与突进，压制灵活',
    palette:{pants:'#142034',cloth:'#2f6fa8',accent:'#7af2ff',skin:'#e8c39f',hair:'#d9f6ff',aura:'#5fd4ff',light:'#c9f8ff'},
    speed:{walk:4.8,back:3.8,dash:10.2,jumpV:20.5,jumpX:6.2},
    throwDmg:115,
    moves:{
      c6lk:mkMove({startup:7,active:4,recovery:14,dmg:50,hitstun:17,blockstun:12,box:{x:24,y:110,w:92,h:46},label:'雷蹴'}),
      c6hp:mkMove({startup:10,active:3,recovery:18,dmg:60,hitstun:20,blockstun:13,hitstop:9,box:{x:26,y:140,w:100,h:50},label:'雷掌'}),
      '236K':mkMove({startup:12,active:5,recovery:18,dmg:65,hitstun:18,blockstun:12,vx:9,vxF:10,box:{x:18,y:90,w:90,h:64},label:'电光突进'}),
      '236KK':mkMove({startup:10,active:6,recovery:18,dmg:90,hitstun:20,blockstun:14,vx:10,vxF:12,cost:100,ex:true,box:{x:18,y:90,w:96,h:70},label:'电光突进·EX'}),
      '623K':mkMove({startup:4,active:6,recovery:22,dmg:88,hitstun:22,blockstun:14,kd:true,hitstop:9,inv:{s:1,e:4},vy:10,box:{x:18,y:110,w:74,h:150},label:'雷牙'}),
      '623KK':mkMove({startup:4,active:8,recovery:22,dmg:115,hitstun:24,blockstun:16,kd:true,hitstop:10,inv:{s:1,e:7},vy:12,cost:100,ex:true,box:{x:18,y:110,w:80,h:160},label:'雷牙·EX'}),
      '214P':mkMove({startup:2,active:1,recovery:16,dmg:0,inv:{s:1,e:14},kind:'shift',box:{x:20,y:110,w:60,h:150},label:'瞬身'}),
      '214PP':mkMove({startup:2,active:1,recovery:12,dmg:0,inv:{s:1,e:18},kind:'shift',cost:100,ex:true,box:{x:20,y:110,w:60,h:150},label:'瞬身·EX'}),
      'air214K':mkMove({startup:8,active:8,recovery:10,dmg:70,hitstun:20,blockstun:13,kd:true,hitstop:9,kind:'dive',vy:14,box:{x:16,y:40,w:78,h:96},label:'雷坠'}),
      'air214KK':mkMove({startup:7,active:9,recovery:10,dmg:95,hitstun:22,blockstun:15,kd:true,hitstop:10,kind:'dive',vy:16,cost:100,ex:true,box:{x:16,y:40,w:84,h:100},label:'雷坠·EX'}),
      '236236K':mkMove({startup:10,active:8,recovery:30,dmg:48,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:100,kd:true,box:{x:32,y:60,w:330,h:210},label:'迅雷连牙'}),
      '236236KK':mkMove({startup:10,active:8,recovery:30,dmg:60,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:200,sdm:true,kd:true,box:{x:32,y:50,w:390,h:230},label:'迅雷连牙·SDM'}),
      throwMove:mkMove({startup:3,active:3,recovery:20,dmg:115,hitstun:30,kd:true,hitstop:12,label:'雷投'})
    }
  },
  {
    id:'rock', name:'岩', tag:'ROCK · 不动岩', style:'重量 · 反击',
    desc:'霸体冲撞与当身，一击翻盘',
    palette:{pants:'#2c2a26',cloth:'#5a4a33',accent:'#e0b070',skin:'#c99a70',hair:'#3a2a1e',aura:'#ffcf7a',light:'#ffe8bb'},
    speed:{walk:3.7,back:3.1,dash:8.2,jumpV:19.2,jumpX:5.2},
    throwDmg:130,
    moves:{
      c6hp:mkMove({startup:12,active:4,recovery:22,dmg:75,hitstun:22,blockstun:15,hitstop:10,box:{x:26,y:130,w:104,h:64},label:'岩碎拳'}),
      '2HP':mkMove({startup:8,active:5,recovery:18,dmg:70,hitstun:22,blockstun:14,kd:true,hitstop:9,vy:7,box:{x:22,y:150,w:70,h:110},label:'裂岩上勾'}),
      '46P':mkMove({startup:14,active:4,recovery:20,dmg:100,hitstun:24,blockstun:16,kd:true,hitstop:10,armor:1,vx:9,vxF:14,box:{x:22,y:60,w:100,h:110},label:'岩冲'}),
      '46PP':mkMove({startup:12,active:5,recovery:20,dmg:130,hitstun:26,blockstun:18,kd:true,hitstop:11,armor:2,vx:10,vxF:16,cost:100,ex:true,box:{x:22,y:60,w:106,h:116},label:'岩冲·EX'}),
      '63214P':mkMove({startup:5,active:2,recovery:26,dmg:150,hitstun:30,kd:true,hitstop:12,kind:'cmdthrow',label:'崩山投'}),
      '63214PP':mkMove({startup:5,active:2,recovery:26,dmg:150,hitstun:30,kd:true,hitstop:12,kind:'cmdthrow',cost:100,ex:true,label:'崩山投'}),
      '214P':mkMove({startup:1,active:14,recovery:18,dmg:0,kind:'stance',counter:90,box:{x:16,y:100,w:64,h:120},label:'当身'}),
      '214PP':mkMove({startup:1,active:14,recovery:18,dmg:0,kind:'stance',counter:140,cost:100,ex:true,box:{x:16,y:100,w:64,h:120},label:'当身·EX'}),
      '236236P':mkMove({startup:12,active:6,recovery:30,dmg:50,hitstun:22,blockstun:16,kind:'super',hits:5,interval:6,hitstop:8,freeze:30,cost:100,kd:true,box:{x:30,y:60,w:320,h:220},label:'震岳葬'}),
      '236236PP':mkMove({startup:12,active:6,recovery:30,dmg:60,hitstun:22,blockstun:16,kind:'super',hits:5,interval:6,hitstop:8,freeze:30,cost:200,sdm:true,kd:true,box:{x:30,y:50,w:380,h:240},label:'震岳葬·SDM'}),
      throwMove:mkMove({startup:3,active:3,recovery:20,dmg:130,hitstun:30,kd:true,hitstop:12,label:'岩投'})
    }
  },
  {
    id:'shuang', name:'霜', tag:'SHUANG · 冰之舞', style:'牵制 · 冰霜',
    desc:'冰锥与冰墙，控制战场节奏',
    palette:{pants:'#1c2a3e',cloth:'#cfe6f5',accent:'#9fe6ff',skin:'#f0d6c2',hair:'#eaf6ff',aura:'#8fe0ff',light:'#e8fbff'},
    speed:{walk:4.1,back:3.6,dash:8.6,jumpV:20,jumpX:5.6},
    throwDmg:115,
    moves:{
      c6lp:mkMove({startup:6,active:3,recovery:12,dmg:35,hitstun:14,blockstun:10,box:{x:22,y:150,w:78,h:42},label:'霜指'}),
      c4hk:mkMove({startup:12,active:4,recovery:20,dmg:70,hitstun:20,blockstun:14,level:'overhead',hitstop:9,box:{x:24,y:120,w:92,h:96},label:'冰霞落'}),
      '2LK':mkMove({startup:7,active:6,recovery:18,dmg:45,hitstun:16,blockstun:11,level:'low',kd:true,box:{x:24,y:0,w:120,h:20},label:'滑铲'}),
      '236P':mkMove({startup:13,active:2,recovery:20,dmg:60,hitstun:18,blockstun:12,kind:'proj',label:'冰锥',
        slow:180,proj:{speed:5.2,w:38,h:34,y:100,dmg:60,hitstun:18,blockstun:12,hitstop:7,slow:180}}),
      '236PP':mkMove({startup:12,active:2,recovery:20,dmg:85,hitstun:20,blockstun:14,kind:'proj',cost:100,ex:true,label:'冰锥·EX',
        slow:180,proj:{speed:6.6,w:44,h:40,y:100,dmg:85,hitstun:20,blockstun:14,hitstop:8,slow:180}}),
      '214P':mkMove({startup:8,active:2,recovery:22,dmg:0,kind:'wall',wall:{life:180,w:26,h:170},cost:0,label:'冰墙'}),
      '214PP':mkMove({startup:8,active:2,recovery:22,dmg:0,kind:'wall',wall:{life:180,w:34,h:200},cost:100,ex:true,label:'冰墙·EX'}),
      '214K':mkMove({startup:10,active:6,recovery:14,dmg:65,hitstun:20,blockstun:13,kd:true,hitstop:9,vx:7,vxF:10,box:{x:18,y:80,w:90,h:70},label:'寒霜旋'}),
      '214KK':mkMove({startup:9,active:7,recovery:14,dmg:90,hitstun:22,blockstun:15,kd:true,hitstop:10,vx:8,vxF:12,cost:100,ex:true,box:{x:18,y:80,w:96,h:74},label:'寒霜旋·EX'}),
      'air214K':mkMove({startup:8,active:8,recovery:10,dmg:55,hitstun:18,blockstun:12,kd:true,kind:'dive',vy:9,vx:3,vxF:8,box:{x:16,y:60,w:86,h:70},label:'滑翔'}),
      'air214KK':mkMove({startup:7,active:9,recovery:10,dmg:80,hitstun:20,blockstun:14,kd:true,kind:'dive',vy:11,vx:3.4,vxF:9,cost:100,ex:true,box:{x:16,y:60,w:92,h:76},label:'滑翔·EX'}),
      '236236P':mkMove({startup:10,active:8,recovery:30,dmg:56,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:100,kd:true,box:{x:34,y:50,w:350,h:220},label:'极寒冰域'}),
      '236236PP':mkMove({startup:10,active:8,recovery:30,dmg:64,hitstun:20,blockstun:16,kind:'super',hits:5,interval:6,hitstop:7,freeze:30,cost:200,sdm:true,kd:true,box:{x:34,y:40,w:400,h:240},label:'极寒冰域·SDM'}),
      throwMove:mkMove({startup:3,active:3,recovery:20,dmg:115,hitstun:30,kd:true,hitstop:12,label:'霜投'})
    }
  }
];

const STAGES=[
  {id:'street',name:'霓虹街市',sub:'NEO STREET',sky:['#120a2c','#2a1050','#4a1a5c'],glow:'#ff5fd2',accent:'#57e6ff'},
  {id:'temple',name:'古寺月台',sub:'MOON TEMPLE',sky:['#071423','#0e2438','#1d3a4c'],glow:'#ffe8a8',accent:'#8fe0ff'},
  {id:'factory',name:'熔岩工厂',sub:'LAVA FACTORY',sky:['#1a0705','#34100a','#5a1a0c'],glow:'#ff7a3c',accent:'#ffb347'}
];
