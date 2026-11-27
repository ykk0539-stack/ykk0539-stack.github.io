/* 사주 계산 — 만세력은 lunar-javascript(MIT, 6tail) 를 쓰고, 한국 시간 보정·십신·오행·합충은 여기서 한다.
   모든 계산은 브라우저 안에서만. 아무것도 저장하거나 보내지 않는다. */
(function (root) {
  'use strict';

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var GAN_KO = '갑을병정무기경신임계';
  var ZHI_KO = '자축인묘진사오미신유술해';
  var ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var EL = ['목', '화', '토', '금', '수'];
  var EL_HANJA = ['木', '火', '土', '金', '水'];
  var GAN_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var ZHI_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];      // 지지 속 대표 천간(본기) — 십신 계산용
  var HARMONY = { '子丑': 1, '寅亥': 1, '卯戌': 1, '辰酉': 1, '巳申': 1, '午未': 1 };
  var CLASH = { '子午': 1, '丑未': 1, '寅申': 1, '卯酉': 1, '辰戌': 1, '巳亥': 1 };
  var TRINE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];

  // 태어난 곳 경도 (진태양시 보정용)
  var PLACES = [
    ['서울·경기·인천', 127.0], ['강원 (춘천·원주)', 127.9], ['강원 동해안 (강릉·속초)', 128.9],
    ['충북 (청주)', 127.5], ['충남·대전·세종', 127.2], ['전북 (전주)', 127.1], ['전남·광주', 126.8],
    ['경북·대구', 128.6], ['경남·부산·울산', 129.0], ['제주', 126.5], ['해외·모름 (서울 기준)', 127.0]
  ];

  // 한국 서머타임 (확인된 기간만) — 이 기간 출생은 시계 시각에서 1시간을 뺀다
  var DST = [
    ['1987-05-10T02:00', '1987-10-11T03:00'],
    ['1988-05-08T02:00', '1988-10-09T03:00']
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function zIdx(z) { return ZHI.indexOf(z); }
  function gIdx(g) { return GAN.indexOf(g); }

  function pairKey(a, b, table) {
    // 표가 「子丑」처럼 지지 순서와 상관없이 들어 있어 둘 다 찾는다
    return table[a + b] || table[b + a] ? true : false;
  }

  function tenGod(dayGan, otherGan) {
    var d = gIdx(dayGan), o = gIdx(otherGan);
    var de = GAN_EL[d], oe = GAN_EL[o];
    var same = (d % 2) === (o % 2);
    var rel = (oe - de + 5) % 5;   // 0 같음, 1 내가 생함, 2 내가 극함, 3 나를 극함, 4 나를 생함
    return [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']][rel][same ? 0 : 1];
  }
  function tenGodZhi(dayGan, zhi) {
    var g = GAN[ZHI_MAIN[zIdx(zhi)]];
    // 子·午·巳·亥 는 본기 음양이 자리 음양과 반대라 본기 천간으로 계산 (대부분의 만세력과 같은 방식)
    return tenGod(dayGan, g);
  }
  var GROUP = { '비견': 0, '겁재': 0, '식신': 1, '상관': 1, '편재': 2, '정재': 2, '편관': 3, '정관': 3, '편인': 4, '정인': 4 };
  var GROUP_NAME = ['비겁', '식상', '재성', '관성', '인성'];

  function inDST(y, m, d, h, mi) {
    var t = y + '-' + pad(m) + '-' + pad(d) + 'T' + pad(h) + ':' + pad(mi);
    for (var i = 0; i < DST.length; i++) if (t >= DST[i][0] && t < DST[i][1]) return true;
    return false;
  }
  // 1954-03-21 ~ 1961-08-09 는 한국 표준시가 UTC+8:30
  function stdMeridian(y, m, d) {
    var t = y * 10000 + m * 100 + d;
    return (t >= 19540321 && t < 19610810) ? 127.5 : 135;
  }

  function shift(y, m, d, h, mi, minutes) {
    var dt = new Date(Date.UTC(y, m - 1, d, h, mi) + minutes * 60000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
  }

  /* input: {calendar:'solar'|'lunar', leap:bool, y,m,d, timeKnown:bool, h, mi, gender:'m'|'f', lng, trueSolar:bool}
     돌려주는 것: 네 기둥, 십신, 오행 수, 대운, 메모 */
  /* 양력 ↔ 음력 바꾸기 (입력 칸 아래 안내용). 없는 날짜면 null */
  function convert(cal, y, m, d, leap) {
    var L = root;
    try {
      if (cal === 'lunar') {
        var so = L.Lunar.fromYmd(y, leap ? -m : m, d).getSolar();
        var back = so.getLunar();   // 없는 날짜를 라이브러리가 넘겨 버리는지 되짚어 본다
        if (back.getYear() !== y || Math.abs(back.getMonth()) !== m || back.getDay() !== d || (back.getMonth() < 0) !== !!leap) return null;
        return { cal: 'solar', y: so.getYear(), m: so.getMonth(), d: so.getDay(), leap: false };
      }
      var lu = L.Solar.fromYmd(y, m, d).getLunar();
      return { cal: 'lunar', y: lu.getYear(), m: Math.abs(lu.getMonth()), d: lu.getDay(), leap: lu.getMonth() < 0 };
    } catch (e) { return null; }
  }

  function compute(input) {
    var L = root;   // lunar-javascript 전역 (Solar, Lunar)
    var y = input.y, m = input.m, d = input.d;
    var notes = [];
    if (input.calendar === 'lunar') {
      var lu = L.Lunar.fromYmd(y, input.leap ? -m : m, d);
      var so = lu.getSolar();
      notes.push('음력 ' + y + '년 ' + (input.leap ? '윤' : '') + m + '월 ' + d + '일 = 양력 ' + so.getYear() + '년 ' + so.getMonth() + '월 ' + so.getDay() + '일로 계산했어요.');
      y = so.getYear(); m = so.getMonth(); d = so.getDay();
    }
    var lun = L.Solar.fromYmd(y, m, d).getLunar();
    var lunarDate = { y: lun.getYear(), m: Math.abs(lun.getMonth()), d: lun.getDay(), leap: lun.getMonth() < 0 };
    var known = !!input.timeKnown;
    var h = known ? input.h : 12, mi = known ? input.mi : 0;

    // 서머타임
    var dstMin = 0;
    if (known && inDST(y, m, d, h, mi)) { dstMin = -60; notes.push('서머타임 기간이라 1시간 빼서 계산했어요.'); }
    var mer = stdMeridian(y, m, d);
    // ① 절기·연주·월주는 「실제 순간」으로 — 라이브러리 절기 시각이 중국 시간(동경 120도) 기준이라 그 시간으로 바꾼다
    var cst = shift(y, m, d, h, mi, dstMin - (mer - 120) * 4);
    // ② 일주·시주는 태어난 곳의 해 시각(진태양시)으로 — 시각을 모르면 보정하지 않는다
    var solarMin = (known && input.trueSolar !== false) ? Math.round((input.lng - mer) * 4) : 0;
    var loc = shift(y, m, d, h, mi, dstMin + solarMin);
    if (known && solarMin) notes.push('태어난 곳 기준 해 시각으로 ' + Math.abs(solarMin) + '분 ' + (solarMin < 0 ? '빼서' : '더해서') + ' 시주를 정했어요.');

    var ecA = L.Solar.fromYmdHms(cst.y, cst.m, cst.d, cst.h, cst.mi, 0).getLunar().getEightChar();
    var ecB = L.Solar.fromYmdHms(loc.y, loc.m, loc.d, loc.h, loc.mi, 0).getLunar().getEightChar();
    ecA.setSect(1); ecB.setSect(1);

    var pillars = [
      { key: 'hour', label: '시', gz: known ? ecB.getTime() : null },
      { key: 'day', label: '일', gz: ecB.getDay() },
      { key: 'month', label: '월', gz: ecA.getMonth() },
      { key: 'year', label: '연', gz: ecA.getYear() }
    ];
    var dayGan = pillars[1].gz.charAt(0);
    var count = [0, 0, 0, 0, 0];
    var groups = [0, 0, 0, 0, 0];
    pillars.forEach(function (p) {
      if (!p.gz) return;
      var g = p.gz.charAt(0), z = p.gz.charAt(1);
      p.gan = g; p.zhi = z;
      p.ganKo = GAN_KO[gIdx(g)]; p.zhiKo = ZHI_KO[zIdx(z)];
      p.ganEl = GAN_EL[gIdx(g)]; p.zhiEl = ZHI_EL[zIdx(z)];
      p.ganGod = p.key === 'day' ? '나' : tenGod(dayGan, g);
      p.zhiGod = tenGodZhi(dayGan, z);
      count[p.ganEl]++; count[p.zhiEl]++;
      if (p.key !== 'day') groups[GROUP[p.ganGod]]++;
      groups[GROUP[p.zhiGod]]++;
    });

    // 대운 (시각을 모르면 낮 12시 기준이라 시작 나이가 조금 다를 수 있음)
    var daeun = [];
    try {
      var yun = ecA.getYun(input.gender === 'm' ? 1 : 0, 2);
      var list = yun.getDaYun(10);
      list.forEach(function (dy) {
        var gz = dy.getGanZhi();
        if (!gz) return;
        daeun.push({ age: dy.getStartAge(), year: dy.getStartYear(), gz: gz,
          ko: GAN_KO[gIdx(gz.charAt(0))] + ZHI_KO[zIdx(gz.charAt(1))],
          god: tenGod(dayGan, gz.charAt(0)), zgod: tenGodZhi(dayGan, gz.charAt(1)),
          el: GAN_EL[gIdx(gz.charAt(0))], zel: ZHI_EL[zIdx(gz.charAt(1))] });
      });
    } catch (e) { /* 대운 계산이 안 되면 빼고 보여 준다 */ }

    return {
      solar: { y: y, m: m, d: d }, lunar: lunarDate, timeKnown: known, pillars: pillars, dayGan: dayGan,
      dayEl: GAN_EL[gIdx(dayGan)], dayYang: gIdx(dayGan) % 2 === 0,
      count: count, groups: groups, daeun: daeun, notes: notes,
      animal: ANIMAL[zIdx(pillars[3].zhi)], yearZhi: pillars[3].zhi, dayZhi: pillars[1].zhi
    };
  }

  function dayGanzhi(date) {
    var gz = root.Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar().getDayInGanZhi();
    return gz;
  }
  function yearGanzhi(year) {
    return root.Solar.fromYmd(year, 6, 1).getLunar().getEightChar().getYear();
  }

  /* 신년운세용: 그해 열두 달(절기 달) 기둥과 시작 날짜(한국 시간).
     1월 = 입춘부터. 라이브러리 절기 시각은 중국 시간이라 60분 더한다. */
  var JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', 'XIAO_HAN', 'LI_CHUN'];
  function yearMonths(year) {
    var yg = gIdx(yearGanzhi(year).charAt(0));
    var start = ((yg % 5) * 2 + 2) % 10;          // 寅월 천간 (갑기년 병인, 을경년 무인 …)
    var table = root.Lunar.fromYmd(year, 1, 1).getJieQiTable();
    var days = JIE.map(function (k) {
      var s = table[k];
      var t = shift(s.getYear(), s.getMonth(), s.getDay(), s.getHour(), s.getMinute(), 60);
      return { y: t.y, m: t.m, d: t.d };
    });
    var out = [];
    for (var k = 0; k < 12; k++) {
      var endDay = new Date(days[k + 1].y, days[k + 1].m - 1, days[k + 1].d - 1);
      out.push({ n: k + 1, gz: GAN[(start + k) % 10] + ZHI[(2 + k) % 12], from: days[k],
        to: { y: endDay.getFullYear(), m: endDay.getMonth() + 1, d: endDay.getDate() } });
    }
    return out;
  }
  /* 삼재: 띠 묶음별로 9년마다 3년. 돌려주는 값 0 아님 / 1 들삼재 / 2 눌삼재 / 3 날삼재 */
  var SAMJAE = { '申子辰': '寅卯辰', '亥卯未': '巳午未', '寅午戌': '申酉戌', '巳酉丑': '亥子丑' };
  function samjae(birthZhi, yearZhi) {
    for (var g in SAMJAE) if (g.indexOf(birthZhi) >= 0) { var p = SAMJAE[g].indexOf(yearZhi); return p >= 0 ? p + 1 : 0; }
    return 0;
  }

  function zhiRelation(a, b) {
    if (a === b) return 'same';
    if (pairKey(a, b, HARMONY)) return 'harmony';
    if (pairKey(a, b, CLASH)) return 'clash';
    for (var i = 0; i < TRINE.length; i++) if (TRINE[i].indexOf(a) >= 0 && TRINE[i].indexOf(b) >= 0) return 'trine';
    return 'none';
  }
  function elRelation(me, other) {   // 0 같음, 1 내가 생함, 2 내가 극함, 3 나를 극함, 4 나를 생함
    return (other - me + 5) % 5;
  }

  root.Saju = {
    GAN: GAN, ZHI: ZHI, GAN_KO: GAN_KO, ZHI_KO: ZHI_KO, ANIMAL: ANIMAL, EL: EL, EL_HANJA: EL_HANJA,
    GAN_EL: GAN_EL, ZHI_EL: ZHI_EL, PLACES: PLACES, GROUP: GROUP, GROUP_NAME: GROUP_NAME,
    compute: compute, convert: convert, tenGod: tenGod, tenGodZhi: tenGodZhi, dayGanzhi: dayGanzhi, yearGanzhi: yearGanzhi,
    zhiRelation: zhiRelation, elRelation: elRelation, gIdx: gIdx, zIdx: zIdx, yearMonths: yearMonths, samjae: samjae
  };
})(typeof window !== 'undefined' ? window : this);
