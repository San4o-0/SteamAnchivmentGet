import { useEffect, useRef } from "react";
import { useSettings } from "@/api/hooks";
import {
  applyAccent,
  applyBackground,
  applyLang,
  applyTheme,
  isStored,
} from "@/lib/appearance";

// Синхронізує вигляд із серверними налаштуваннями (крос-девайс / перший вхід).
// Два запобіжники разом, щоб живий вибір користувача НЕ відкочувався:
//  1) РІВНО ОДИН РАЗ після входу — наступні рефетчі /api/settings не чіпають UI;
//  2) лише для налаштувань, які користувач ще НЕ міняв на цьому пристрої
//     (isStored=false). Інакше застаріле серверне значення (напр. in-memory стор
//     скинувся при рестарті) перезатирало б свіжий локальний вибір.
export function AppearanceSync() {
  const { data } = useSettings();
  const synced = useRef(false);

  useEffect(() => {
    if (!data || synced.current) return;
    synced.current = true;
    if (!isStored("theme")) applyTheme(data.theme);
    if (!isStored("accent")) applyAccent(data.accent);
    if (!isStored("lang")) applyLang(data.language);
    if (!isStored("background")) applyBackground(data.background);
  }, [data]);

  return null;
}
