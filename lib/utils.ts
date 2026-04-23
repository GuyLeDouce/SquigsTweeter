export function shortenText(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function getCtaLabel(ctaMode: string) {
  if (ctaMode === "discord") {
    return "Discord";
  }

  if (ctaMode === "website") {
    return "Website";
  }

  return "None";
}
