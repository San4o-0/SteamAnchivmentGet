// Визначення ОС для UI. Агент розблокування — лише Windows (net48 +
// steamclient.dll), тож на Linux/macOS не пропонуємо його завантажувати.

// userAgentData — сучасний і надійний; navigator.platform/userAgent — фолбек.
export function isWindows(): boolean {
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } })
    .userAgentData;
  if (uaData?.platform) return /win/i.test(uaData.platform);
  return /win/i.test(navigator.platform || navigator.userAgent || "");
}
