import { type ProviderPayload, type ReadingRequest } from "@/lib/tarot/types";

function buildToneGuide(tone: ReadingRequest["tonePreference"] | undefined): string[] {
  switch (tone) {
    case "soft":
      return [
        "Dili yumuşak, kapsayıcı ve sakin tut.",
        "Keskin emir kiplerinden kaçın; davet eden cümleler kullan.",
      ];
    case "direct":
      return [
        "Dili net ve kısa tut; gereksiz dolgu yapma.",
        "Yorumu kararlı ver ama kesin kehanet dili kullanma.",
      ];
    default:
      return [
        "Dili dengeli tut: duygusal rezonans + pratik yön.",
        "Ne aşırı mistik ne de klinik bir ton kullan.",
      ];
  }
}

function buildFocusRule(focus: ReadingRequest["focusArea"]): string {
  const map = {
    ask: "Belirsiz soruyu tek bir net niyet başlığına indir.",
    love: "İlişki dilinde sınır, açıklık ve duygusal ritim temasını işle.",
    career: "Kariyer alanında görünür adım, zamanlama ve sorumluluk dengesine odaklan.",
    money: "Maddi konularda ölçü, risk farkındalığı ve sürdürülebilir akış vurgusu yap.",
    self: "Kişisel gelişimde iç ses, enerji yönetimi ve merkezde kalmak temasını öne çıkar.",
    social: "Sosyal ilişkilerde iletişim tonu ve karşılıklılık temasını işle.",
    family: "Aile alanında sakin ifade, beklenti yönetimi ve denge öner.",
  } as const;

  return map[focus];
}

export function buildReadingPrompt(request: ReadingRequest): ProviderPayload["prompt"] {
  const tone = request.tonePreference ?? request.userContext?.tonePreference ?? "balanced";
  const toneGuide = buildToneGuide(tone);
  const focusRule = buildFocusRule(request.focusArea);

  const cardContext = request.cards
    .map((card, index) => {
      const keywords = card.orientation === "upright" ? card.uprightKeywords : card.reversedKeywords;
      return `${index + 1}. ${card.nameTr} (${card.orientation}) -> ${keywords.slice(0, 3).join(", ")}`;
    })
    .join("\n");

  const personalization = [
    request.userContext?.name ? `Kullanıcı adı: ${request.userContext.name}` : null,
    request.userContext?.relationshipStatus
      ? `İlişki durumu (paylaşıldı): ${request.userContext.relationshipStatus}`
      : null,
    request.userContext?.recentTopics?.length
      ? `Son gündem başlıkları: ${request.userContext.recentTopics.join(", ")}`
      : null,
    request.userContext?.savedThemes?.length
      ? `Kaydedilen temalar: ${request.userContext.savedThemes.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: [
      "Sen premium bir Türkçe tarot yorum asistanısın.",
      "Ton: modern, rafine, duygusal olarak sezgili; klişe fal dili kullanma.",
      "Asla kesin kehanet, sağlık/ölüm/hamilelik/hukuk/finans yönlendirmesi üretme.",
      "Çıktı yapısı: headline, summary, interpretation, emotionalReflection, reflectionQuestion, groundingNote, themeTags.",
    ].join(" "),
    user: [
      `Odak alanı: ${request.focusArea}`,
      `Niyet: ${request.intention?.trim() || "Belirtilmedi"}`,
      `Kart sayısı: ${request.cards.length}`,
      "Kartlar:",
      cardContext,
      personalization ? `Kişisel bağlam:\n${personalization}` : "Kişisel bağlam: sınırlı",
    ].join("\n"),
    constraints: [
      "Türkçe yaz.",
      "Maksimum 6 tema etiketi üret.",
      "Yorumu kişiselleştir ama gizli bilgi biliyormuş gibi davranma.",
      "Ucuz kehanet cümlelerinden kaçın.",
      focusRule,
      ...toneGuide,
    ],
    styleHints: [
      "Kelimeler: niyet, enerji, döngü, akış, iç ses, netlik, sezgi.",
      "Kapanışta kullanıcıya ajans ver: seçim ve tempo kullanıcıda kalsın.",
      "Cümle ritmini çeşitlendir: bir kısa, bir orta, bir uzun cümle döngüsü kullan.",
    ],
  };
}
