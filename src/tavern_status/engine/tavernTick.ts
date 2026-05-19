// ── 经营快进引擎 ──
import { moneyLabel } from './labels';
import { GameSave } from './saveSchema';

export interface TickResult {
  hours: number;
  guests: number;
  revenue: number;
  fameChange: number;
  interrupted: boolean;
  interruptionVisitor?: string;
  summary: string;
}

const RANGES: Record<string, Record<string, [number, number]>> = {
  无人知晓: { s: [0, 2], m: [1, 4], l: [2, 6] },
  略有耳闻: { s: [1, 3], m: [3, 7], l: [5, 10] },
  小有名气: { s: [2, 5], m: [5, 12], l: [8, 18] },
  远近闻名: { s: [4, 8], m: [8, 18], l: [12, 25] },
  声名远扬: { s: [6, 12], m: [12, 25], l: [18, 35] },
};

export function tickTavern(save: GameSave, hours: number): TickResult {
  const fame = save.reputation.tavernFame;
  const r = RANGES[fame] || RANGES['略有耳闻'];
  let [lo, hi] = hours <= 2 ? r.s : hours <= 5 ? r.m : r.l;
  if (save.world.season === '冬') {
    lo = Math.floor(lo / 2);
    hi = Math.floor(hi / 2);
  }
  if (save.world.season === '夏') {
    lo = Math.ceil(lo * 1.3);
    hi = Math.ceil(hi * 1.3);
  }
  const guests = lo + Math.floor(Math.random() * (hi - lo + 1));

  const interrupted = Math.floor(Math.random() * 100) + 1 <= 8;
  if (interrupted)
    return {
      hours,
      guests: 0,
      revenue: 0,
      fameChange: 0,
      interrupted: true,
      interruptionVisitor: '有人推开了酒馆的门——快进被打断了。',
      summary: '',
    };

  const revenue = guests * (20 + Math.floor(Math.random() * 25));
  const fc = Math.floor(Math.random() * 3) + (save.player.cookingLevel >= 5 ? 1 : 0);

  save.player.money.铜币 += revenue;
  save.ledger.totalDays += Math.max(1, Math.floor(hours / 6));
  save.ledger.totalGuests += guests;
  save.ledger.totalRevenueCopper += revenue;

  return {
    hours,
    guests,
    revenue,
    fameChange: fc,
    interrupted: false,
    summary: `═══ 经营日报 ═══\n时段约${hours}h | 客流${guests}人 | +${revenue}铜 | 声望+${fc}\n当前资产: ${moneyLabel(save.player.money.铜币)}`,
  };
}
