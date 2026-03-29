import {
  type DrawnCard,
  type FocusArea,
  type ProviderPayload,
  type ProviderResult,
  type ReadingResult,
  ReadingResultSchema,
  type TonePreference,
} from "@/lib/tarot/types";

export interface ReadingProvider {
  readonly name: string;
  generateReading(payload: ProviderPayload): Promise<ProviderResult>;
}

const OPENERS = {
  soft: [
    "Bugünün kartları, niyetine nazik ama net bir ışık tutuyor.",
    "Kartların akışı yumuşak bir farkındalık alanı açıyor.",
    "Aldığın enerji, sakin bir iç sesle yönünü hatırlatıyor.",
  ],
  balanced: [
    "Açılımın merkezinde netlik ve akış birlikte görünüyor.",
    "Kartların dili dengeli: hem duyguya hem karara alan açıyor.",
    "Bu açılım, niyetini somut bir yöne taşımaya hazır görünüyor.",
  ],
  direct: [
    "Kartlar gecikmeyi değil, net bir hamleyi işaret ediyor.",
    "Enerji açık: kararsızlık yerine odak gerekiyor.",
    "Açılımın mesajı güçlü; yönünü sadeleştirmen isteniyor.",
  ],
} as const;

const FOCUS_HINTS: Record<FocusArea, string[]> = {
  ask: ["belirsizliği daralt", "tek bir soruyu merkezde tut", "iç sesini sadeleştir"],
  love: ["duygusal sınır", "yakınlık ritmi", "kalpten netlik"],
  career: ["görünür adım", "zamanlama", "sorumluluk dengesi"],
  money: ["ölçülü risk", "nakit akışı farkındalığı", "değer odağı"],
  self: ["iç merkez", "enerji yenileme", "kendine karşı dürüstlük"],
  social: ["iletişim tonu", "karşılıklılık", "sosyal çevre filtresi"],
  family: ["ev içi denge", "beklenti yönetimi", "sakin ifade"],
};

const SUMMARY_ENDINGS = [
  "Küçük ama tutarlı bir adım bu döngüyü senin lehine çevirir.",
  "Bu süreçte ritmini koruman, sonuçtan daha kıymetli bir güç yaratır.",
  "Merkezinde kaldığında hem sezgin hem kararların aynı çizgide buluşur.",
  "Akışı zorlamak yerine yön vermek, şu an en güçlü yaklaşım.",
];

const REFLECTION_TEMPLATES = [
  "Bugün hangi duyguyu adlandırdığında kararın netleşir?",
  "Seni yoran döngüde hangi küçük sınırı koyman gerekiyor?",
  "Akışa güvenmek ile ertelemek arasındaki çizgiyi nerede görüyorsun?",
  "İç sesin şu an tek bir cümle kursa ne söylerdi?",
];

const GROUNDING_NOTES = [
  "Bu yorum bir yön aynasıdır; kararlarının merkezinde yine sen varsın.",
  "Kartlar olasılıkları gösterir, tempo ve tercih senin iradende kalır.",
  "Mesajı bir davet gibi düşün: kesinlik değil, farkındalık sunar.",
  "Bunu duygusal alanını toparlamak için bir referans olarak kullanabilirsin.",
];

function hashText(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickByHash<T>(items: T[], seed: string, salt: string): T {
  const idx = hashText(`${seed}:${salt}`) % items.length;
  return items[idx];
}

function toneOrDefault(tone?: TonePreference): TonePreference {
  return tone ?? "balanced";
}

function cardSignal(card: DrawnCard): string {
  const keywords = card.orientation === "upright" ? card.uprightKeywords : card.reversedKeywords;
  const emphasis = keywords.slice(0, 2).join(" · ");
  const orientationWord = card.orientation === "upright" ? "düz" : "ters";
  return `${card.nameTr} (${orientationWord}): ${emphasis}`;
}

function makeThemeTags(cards: DrawnCard[], focus: FocusArea, recentThemes: string[]): string[] {
  const base = cards
    .flatMap((card) =>
      (card.orientation === "upright" ? card.uprightKeywords : card.reversedKeywords).slice(0, 1),
    )
    .map((keyword) => keyword.toLowerCase().replace(/\s+/g, "-"));

  const focusTag = `odak-${focus}`;
  const historyTag = recentThemes[0] ? recentThemes[0].toLowerCase().replace(/\s+/g, "-") : null;

  return Array.from(new Set([focusTag, ...base, historyTag].filter(Boolean) as string[])).slice(0, 6);
}

export class MockReadingProvider implements ReadingProvider {
  readonly name = "mock-tarot-v1";

  async generateReading(payload: ProviderPayload): Promise<ProviderResult> {
    const safeFallback = this.buildFallback(payload);

    try {
      const { request, prompt } = payload;
      const tone = toneOrDefault(request.tonePreference ?? request.userContext?.tonePreference);
      const seed = `${prompt.user}::${request.cards.map((c) => `${c.slug}-${c.orientation}`).join("|")}`;

      const opener = pickByHash([...OPENERS[tone]], seed, "opener");
      const focusHints = FOCUS_HINTS[request.focusArea];
      const focusHint = pickByHash(focusHints, seed, "focus-hint");
      const summaryEnding = pickByHash(SUMMARY_ENDINGS, seed, "summary-ending");
      const reflectionQuestion = pickByHash(REFLECTION_TEMPLATES, seed, "reflection");
      const groundingNote = pickByHash(GROUNDING_NOTES, seed, "grounding");

      const cardLines = request.cards.map(cardSignal);
      const personalizedName = request.userContext?.name ? `${request.userContext.name}, ` : "";
      const intentionLine = request.intention
        ? `Niyet cümlende öne çıkan tema: “${request.intention.slice(0, 90)}”.`
        : "Niyet alanını açık bıraktığın için kartların ortak ritmi daha baskın okunuyor.";

      const recentTheme = request.userContext?.recentTopics?.[0];
      const continuityLine = recentTheme
        ? `Son dönem odağın olan “${recentTheme}” başlığıyla bu açılım arasında belirgin bir bağ var.`
        : "Bu açılım, şu anki döngünü yeni bir açıdan görmene alan tanıyor.";

      const output: ReadingResult = {
        headline: `${personalizedName}${this.focusTitle(request.focusArea)} için Akışta Netleşme`,
        summary: `${opener} ${intentionLine} ${summaryEnding}`,
        interpretation: [
          `${cardLines[0] ?? "İlk kart"} başlangıç enerjini gösteriyor ve burada ${focusHint} vurgusu güçlü.`,
          cardLines[1]
            ? `${cardLines[1]} şu anki karar alanında ritim kurmanın neden kritik olduğunu anlatıyor.`
            : "Tek kart açılımı, odağını dağıtmadan tek bir niyet çizgisinde kalman gerektiğini söylüyor.",
          cardLines[2]
            ? `${cardLines[2]} yakın süreçte duygusal alanını korurken daha net bir yön seçebileceğini işaret ediyor.`
            : "Yakın süreçte bu mesajı küçük bir eylemle somutlaştırman etkisini artırır.",
          continuityLine,
        ].join(" "),
        emotionalReflection:
          tone === "direct"
            ? "Duygusal yoğunluk yükselse de merkezinde kaldığında tablo sadeleşiyor; önce netlik, sonra hız."
            : "İç sesini bastırmadan, ama abartmadan dinlediğinde duygusal alanında belirgin bir ferahlama oluşuyor.",
        reflectionQuestion,
        groundingNote,
        themeTags: makeThemeTags(request.cards, request.focusArea, request.userContext?.recentTopics ?? []),
        personalizationSignals: {
          usedName: Boolean(request.userContext?.name),
          usedRecentThemes: Boolean(request.userContext?.recentTopics?.length),
          usedTonePreference: Boolean(request.tonePreference ?? request.userContext?.tonePreference),
        },
      };

      const parsed = ReadingResultSchema.safeParse(output);
      if (!parsed.success) {
        return { output: safeFallback, fallbackUsed: true };
      }

      return { output: parsed.data, fallbackUsed: false, rawText: JSON.stringify(parsed.data) };
    } catch {
      return { output: safeFallback, fallbackUsed: true };
    }
  }

  private focusTitle(focus: FocusArea): string {
    const map: Record<FocusArea, string> = {
      ask: "Niyetin",
      love: "İlişki Alanın",
      career: "Kariyer Yolun",
      money: "Maddi Dengen",
      self: "İç Dünyan",
      social: "Sosyal Çevren",
      family: "Aile Enerjin",
    };
    return map[focus];
  }

  private buildFallback(payload: ProviderPayload): ReadingResult {
    const focus = payload.request.focusArea;
    return {
      headline: "Akışını Sadeleştir, Yönün Netleşsin",
      summary:
        "Kartların genel mesajı, aynı anda her şeyi çözmeye çalışmak yerine tek bir niyeti merkezine alman yönünde.",
      interpretation:
        `Şu an ${focus} alanında duygusal yoğunluk ve karar ihtiyacı birlikte çalışıyor. Küçük ama tutarlı bir adım belirlemek, ` +
        "hem sezgini hem ritmini güçlendirir. Kartları kesin hüküm olarak değil, dikkatini doğru noktaya toplayan bir çerçeve olarak kullan.",
      emotionalReflection:
        "Kendine nazik kaldığında iç sesin daha anlaşılır hale gelir; netlik çoğu zaman sakinlikten doğar.",
      reflectionQuestion: "Bugün tek bir şeye odaklansan, hangi seçim seni daha hafif hissettirir?",
      groundingNote: "Bu yorum bir farkındalık alanıdır; nihai kararlar her zaman sende kalır.",
      themeTags: [`odak-${focus}`, "netlik", "akış"],
      personalizationSignals: {
        usedName: false,
        usedRecentThemes: false,
        usedTonePreference: false,
      },
    };
  }
}

export const readingProvider: ReadingProvider = new MockReadingProvider();
