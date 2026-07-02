// Фікстури за SHARED CONTRACT. Єдине місце стану моків: handlers мутують
// `unlockedIds` на unlock, і UI одразу це відображає.
import type {
  Ach,
  GameDetail,
  LeaderboardEntry,
  LibraryEntry,
  Me,
  Notification,
  Roadmap,
  RarityTier,
  Settings,
  Stats,
} from "@/api/types";

const cover = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
const achIcon = (seed: string) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=1b2530`;

// Пороги шести тірів лута за globalPercent (див. RARITY_SPEC).
function tierFor(globalPercent: number): RarityTier {
  if (globalPercent < 1) return "mythic";
  if (globalPercent < 5) return "legendary";
  if (globalPercent < 10) return "epic";
  if (globalPercent < 20) return "rare";
  if (globalPercent < 50) return "uncommon";
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
    ach("p2_hidden", "Пасхалка", "Знайти прихований куточок.", 0.4, true),
  ],
  292030: [
    ach("w3_prologue", "Відьмацькі справи", "Завершити пролог у Білому Саду.", 79.1, true),
    ach("w3_gwent", "Майстер ґвинта", "Виграти 20 партій.", 18.7, true),
    ach("w3_geralt", "Шлях відьмака", "Досягти рівня 35.", 24.5, true),
    ach("w3_kaer", "Захисник Каер Морхена", "Пережити облогу.", 33.2, true),
    ach("w3_full", "Повна колекція", "Зібрати всі спорядження школи.", 6.3, false),
    ach("w3_death", "Народжений вбивати", "Пройти на найвищій складності.", 0.7, false),
  ],
  1245620: [
    ach("er_grace", "Загублена благодать", "Досягти першого місця благодаті.", 82.5, true),
    ach("er_boss1", "Полеглий Годрік", "Перемогти Годріка.", 55.8, true),
    ach("er_shard", "Господар осколка", "Здобути другий великий осколок.", 29.4, false),
    ach("er_lord", "Повелитель Ельдену", "Завершити гру.", 24.1, false),
    ach("er_all", "Легендарне спорядження", "Зібрати всі легендарні предмети.", 3.4, false),
    ach("er_malenia", "Мечниця Мікелли", "Перемогти Малєнію.", 4.9, true),
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
    ach("sv_master", "Майстер-фермер", "Досягти повного успіху господарства.", 7.7, true),
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

// --- Feature expansion mocks ---

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

// Stats рахуються на льоту з тих самих ачивок — unlock одразу відбивається.
export function buildStats(): Stats {
  const lib = buildLibrary();
  const flat: { appId: number; gameName: string; ach: Ach }[] = [];
  for (const meta of libraryMeta) {
    for (const a of withUnlocked(achievementsByApp[meta.appId] ?? [])) {
      flat.push({ appId: meta.appId, gameName: meta.name, ach: a });
    }
  }
  const unlocked = flat.filter((x) => x.ach.unlocked);

  const rarity = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0,
  };
  for (const x of unlocked) rarity[x.ach.rarityTier] += 1;

  const perfectGames = lib.filter((g) => g.completion === 100).length;
  const avgCompletion = lib.length
    ? Math.round(lib.reduce((s, g) => s + g.completion, 0) / lib.length)
    : 0;
  const rarityScore = unlocked.reduce(
    (s, x) => s + Math.round((100 - x.ach.globalPercent) * 10),
    0,
  );

  const bucketDefs: { label: string; test: (c: number) => boolean }[] = [
    { label: "0–25%", test: (c) => c >= 0 && c < 25 },
    { label: "25–50%", test: (c) => c >= 25 && c < 50 },
    { label: "50–75%", test: (c) => c >= 50 && c < 75 },
    { label: "75–99%", test: (c) => c >= 75 && c < 100 },
    { label: "100%", test: (c) => c === 100 },
  ];
  const completionBuckets = bucketDefs.map((b) => ({
    label: b.label,
    count: lib.filter((g) => b.test(g.completion)).length,
  }));

  const topRareUnlocks = [...unlocked]
    .sort((a, b) => a.ach.globalPercent - b.ach.globalPercent)
    .slice(0, 6)
    .map((x) => ({ gameName: x.gameName, appId: x.appId, ach: x.ach }));

  const topGames = [...lib]
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 6)
    .map((g) => ({
      appId: g.appId,
      name: g.name,
      cover: g.cover,
      completion: g.completion,
      achDone: g.achDone,
      achTotal: g.achTotal,
    }));

  return {
    totals: {
      games: lib.length,
      achievements: unlocked.length,
      perfectGames,
      avgCompletion,
      rarityScore,
    },
    rarity,
    completionBuckets,
    topRareUnlocks,
    topGames,
  };
}

// Налаштування — мутабельний стан моків (PUT зливає й повертає).
export let settings: Settings = {
  agentUrl: "http://127.0.0.1:57343",
  language: "uk",
  theme: "dark",
  accent: "violet",
  background: "cosmos",
  privateProfile: false,
  autoRoadmap: true,
};

export function updateSettings(patch: Partial<Settings>): Settings {
  settings = { ...settings, ...patch };
  return settings;
}

// Ліга — ранжовано за rarityScore desc, рівно один isMe (поточний користувач).
export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, steamId: "76561198000000101", name: "NovaBreaker", avatar: avatar("NovaBreaker"), rarityScore: 12480, achievements: 812, perfectGames: 41, isMe: false },
  { rank: 2, steamId: "76561198000000102", name: "GhostByte", avatar: avatar("GhostByte"), rarityScore: 10930, achievements: 744, perfectGames: 36, isMe: false },
  { rank: 3, steamId: "76561198000000103", name: "Vesper", avatar: avatar("Vesper"), rarityScore: 9210, achievements: 690, perfectGames: 29, isMe: false },
  { rank: 4, steamId: me.steamId, name: me.name, avatar: me.avatar, rarityScore: 7340, achievements: 428, perfectGames: 18, isMe: true },
  { rank: 5, steamId: "76561198000000105", name: "Katana", avatar: avatar("Katana"), rarityScore: 6980, achievements: 402, perfectGames: 16, isMe: false },
  { rank: 6, steamId: "76561198000000106", name: "PixelWolf", avatar: avatar("PixelWolf"), rarityScore: 6110, achievements: 377, perfectGames: 14, isMe: false },
  { rank: 7, steamId: "76561198000000107", name: "Solstice", avatar: avatar("Solstice"), rarityScore: 5240, achievements: 331, perfectGames: 11, isMe: false },
  { rank: 8, steamId: "76561198000000108", name: "Zenith", avatar: avatar("Zenith"), rarityScore: 4300, achievements: 288, perfectGames: 9, isMe: false },
  { rank: 9, steamId: "76561198000000109", name: "Frost", avatar: avatar("Frost"), rarityScore: 3120, achievements: 214, perfectGames: 6, isMe: false },
  { rank: 10, steamId: "76561198000000110", name: "Ember", avatar: avatar("Ember"), rarityScore: 1980, achievements: 156, perfectGames: 3, isMe: false },
];

// Сповіщення — найновіші першими, частина непрочитаних. Мутабельний масив.
export const notifications: Notification[] = [
  { id: "n0", type: "almost", title: "До ачивки один крок", body: "«Ґвент-мастер» — найлегша з решти у The Witcher 3: її мають 22.4% гравців.", gameName: "The Witcher 3", appId: 292030, read: false, createdAt: "2026-07-02T11:05:00Z" },
  { id: "n1", type: "rare", title: "Легендарний дроп!", body: "«Мечниця Мікелли» — лише 4.9% гравців її мають.", gameName: "Elden Ring", appId: 1245620, read: false, createdAt: "2026-07-02T09:12:00Z" },
  { id: "n1b", type: "almost", title: "Рідкісний дроп поруч ✦", body: "У Hollow Knight на тебе чекає «Порожнє Серце» — лише 2.1% гравців мають її.", gameName: "Hollow Knight", appId: 367520, read: false, createdAt: "2026-07-02T08:00:00Z" },
  { id: "n2", type: "unlock", title: "Ачивку розблоковано", body: "«Полеглий Годрік» додано до твоєї колекції.", gameName: "Elden Ring", appId: 1245620, read: false, createdAt: "2026-07-01T18:40:00Z" },
  { id: "n2b", type: "milestone", title: "Рубіж: 3000+ ачивок 🏆", body: "У колекції вже 3 480 вибитих ачивок. Наступна позначка — 3 500.", read: false, createdAt: "2026-07-01T12:00:00Z" },
  { id: "n3", type: "roadmap", title: "Новий маршрут готовий", body: "Складено план на 100% для Cyberpunk 2077.", gameName: "Cyberpunk 2077", appId: 1091500, read: false, createdAt: "2026-06-30T14:05:00Z" },
  { id: "n4", type: "system", title: "Агент оновлено", body: "Локальний агент оновлено до версії 1.4.0.", read: true, createdAt: "2026-06-29T08:00:00Z" },
  { id: "n5", type: "unlock", title: "Ачивку розблоковано", body: "«Одруження» у Stardew Valley — вітаємо!", gameName: "Stardew Valley", appId: 413150, read: true, createdAt: "2026-06-27T21:15:00Z" },
  { id: "n6", type: "rare", title: "Рідкісна ачивка", body: "«Майстер ґвинта» — лише 18.7% гравців.", gameName: "The Witcher 3", appId: 292030, read: true, createdAt: "2026-06-25T12:30:00Z" },
  { id: "n7", type: "system", title: "Ласкаво просимо до Achivo", body: "Підключи агент, щоб розблоковувати ачивки локально.", read: true, createdAt: "2026-06-24T10:00:00Z" },
];
