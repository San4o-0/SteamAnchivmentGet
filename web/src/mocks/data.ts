// Фікстури за SHARED CONTRACT. Єдине місце стану моків: handlers мутують
// `unlockedIds` на unlock, і UI одразу це відображає.
import type {
  Ach,
  GameDetail,
  LibraryEntry,
  Me,
  Roadmap,
  RarityTier,
} from "@/api/types";

const cover = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
const achIcon = (seed: string) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=1b2530`;

function tierFor(globalPercent: number): RarityTier {
  if (globalPercent < 5) return "ultra";
  if (globalPercent < 20) return "rare";
  return "common";
}

function ach(
  id: string,
  name: string,
  desc: string,
  globalPercent: number,
  unlocked: boolean,
): Ach {
  return {
    id,
    name,
    desc,
    icon: achIcon(id),
    unlocked,
    globalPercent,
    rarityTier: tierFor(globalPercent),
  };
}

export const me: Me = {
  steamId: "76561198000000000",
  name: "annoriya",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=annoriya",
  stats: {
    games: 6,
    achievements: 428,
    avgCompletion: 61,
    rarityScore: 7340,
  },
};

const achievementsByApp: Record<number, Ach[]> = {
  1091500: [
    ach("cp_boot", "Прокидання", "Завершити пролог.", 74.2, true),
    ach("cp_street", "Вуличний кід", "Досягти рівня 10.", 48.9, true),
    ach("cp_gig", "Найманець", "Виконати 20 замовлень.", 22.4, true),
    ach("cp_legend", "Легенда Найт-Сіті", "Завершити всі сюжетні лінії.", 8.1, false),
    ach("cp_max", "Максимальний рівень", "Прокачати всі атрибути до 20.", 3.7, false),
    ach("cp_secret", "Таємне закінчення", "Розблокувати приховану кінцівку.", 1.9, false),
  ],
  620: [
    ach("p2_start", "Знову тут", "Прокинутись у стазисі.", 88.0, true),
    ach("p2_coop", "Разом краще", "Пройти кооп-камеру.", 41.3, true),
    ach("p2_smooth", "Гладка робота", "Пройти главу без смертей.", 12.6, false),
    ach("p2_final", "Прощавай, GLaDOS", "Завершити гру.", 63.4, true),
    ach("p2_hidden", "Пасхалка", "Знайти прихований куточок.", 4.2, false),
  ],
  292030: [
    ach("w3_prologue", "Відьмацькі справи", "Завершити пролог у Білому Саду.", 79.1, true),
    ach("w3_gwent", "Майстер ґвинта", "Виграти 20 партій.", 18.7, false),
    ach("w3_geralt", "Шлях відьмака", "Досягти рівня 35.", 24.5, true),
    ach("w3_kaer", "Захисник Каер Морхена", "Пережити облогу.", 33.2, true),
    ach("w3_full", "Повна колекція", "Зібрати всі спорядження школи.", 6.3, false),
    ach("w3_death", "Народжений вбивати", "Пройти на найвищій складності.", 2.1, false),
  ],
  1245620: [
    ach("er_grace", "Загублена благодать", "Досягти першого місця благодаті.", 82.5, true),
    ach("er_boss1", "Полеглий Годрік", "Перемогти Годріка.", 55.8, true),
    ach("er_shard", "Господар осколка", "Здобути другий великий осколок.", 29.4, false),
    ach("er_lord", "Повелитель Ельдену", "Завершити гру.", 24.1, false),
    ach("er_all", "Легендарне спорядження", "Зібрати всі легендарні предмети.", 3.4, false),
    ach("er_malenia", "Мечниця Мікелли", "Перемогти Малєнію.", 4.9, false),
  ],
  105600: [
    ach("tr_wood", "Перше дерево", "Зрубати перше дерево.", 95.0, true),
    ach("tr_eye", "Око за око", "Перемогти Око Ктулху.", 61.0, true),
    ach("tr_hard", "Експерт", "Перемогти боса в експерт-режимі.", 14.2, false),
    ach("tr_moon", "Володар Місяця", "Перемогти Володаря Місяця.", 9.8, false),
  ],
  413150: [
    ach("sv_farm", "Новий фермер", "Прожити перший сезон.", 90.4, true),
    ach("sv_married", "Весілля", "Одружитися.", 44.6, true),
    ach("sv_master", "Майстер-фермер", "Досягти повного успіху господарства.", 7.7, false),
  ],
};

// Мутабельний набір розблокованих id — «пам'ять» моків між запитами.
export const unlockedIds = new Set<string>();
for (const list of Object.values(achievementsByApp)) {
  for (const a of list) if (a.unlocked) unlockedIds.add(a.id);
}

function withUnlocked(list: Ach[]): Ach[] {
  return list.map((a) => ({ ...a, unlocked: unlockedIds.has(a.id) }));
}

function completionOf(appId: number): number {
  const list = achievementsByApp[appId] ?? [];
  if (list.length === 0) return 0;
  const done = list.filter((a) => unlockedIds.has(a.id)).length;
  return Math.round((done / list.length) * 100);
}

// completion/achDone рахуються на льоту, тож unlock відразу видно в бібліотеці.
const libraryMeta: Omit<LibraryEntry, "completion" | "achDone">[] = [
  { appId: 1245620, name: "Elden Ring", cover: cover(1245620), hours: 142, achTotal: 6, rarity: 91, lastPlayed: "2026-06-28" },
  { appId: 1091500, name: "Cyberpunk 2077", cover: cover(1091500), hours: 88, achTotal: 6, rarity: 74, lastPlayed: "2026-06-30" },
  { appId: 292030, name: "The Witcher 3", cover: cover(292030), hours: 210, achTotal: 6, rarity: 83, lastPlayed: "2026-05-14" },
  { appId: 620, name: "Portal 2", cover: cover(620), hours: 24, achTotal: 5, rarity: 52, lastPlayed: "2026-06-11" },
  { appId: 105600, name: "Terraria", cover: cover(105600), hours: 67, achTotal: 4, rarity: 40, lastPlayed: "2026-04-02" },
  { appId: 413150, name: "Stardew Valley", cover: cover(413150), hours: 133, achTotal: 3, rarity: 33, lastPlayed: "2026-06-25" },
];

export function buildLibrary(): LibraryEntry[] {
  return libraryMeta.map((m) => ({
    ...m,
    completion: completionOf(m.appId),
    achDone: (achievementsByApp[m.appId] ?? []).filter((a) =>
      unlockedIds.has(a.id),
    ).length,
  }));
}

const difficultyByApp: Record<number, number> = {
  1245620: 5,
  1091500: 3,
  292030: 4,
  620: 2,
  105600: 3,
  413150: 2,
};

const estHoursByApp: Record<number, number> = {
  1245620: 96,
  1091500: 34,
  292030: 120,
  620: 6,
  105600: 40,
  413150: 55,
};

export function buildGame(appId: number): GameDetail | null {
  const meta = libraryMeta.find((m) => m.appId === appId);
  const list = achievementsByApp[appId];
  if (!meta || !list) return null;
  return {
    appId,
    name: meta.name,
    completion: completionOf(appId),
    estHoursTo100: estHoursByApp[appId] ?? 20,
    achievements: withUnlocked(list),
    difficulty: difficultyByApp[appId] ?? 3,
  };
}

// Roadmap: незаблоковані ачивки від найлегших, розкидані на 3 фази.
export function buildRoadmap(appId: number): Roadmap | null {
  const list = achievementsByApp[appId];
  if (!list) return null;
  const locked = withUnlocked(list)
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.globalPercent - a.globalPercent);

  const groupFor = (i: number, n: number) =>
    i < Math.ceil(n / 3) ? "start" : i < Math.ceil((2 * n) / 3) ? "mid" : "end";

  return {
    steps: locked.map((a, i) => ({
      order: i + 1,
      group: groupFor(i, locked.length) as Roadmap["steps"][number]["group"],
      ach: a,
      // рідкісніша ачивка => довший грінд
      etaMinutes: Math.round(30 + (100 - a.globalPercent) * 6),
    })),
  };
}
