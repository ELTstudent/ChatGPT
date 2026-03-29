"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { TAROT_DECK_SEED } from "@/lib/tarot/deck-seed";
import {
  type DrawnCard,
  type FocusArea,
  type ReadingResponse,
  ReadingResponseSchema,
  type TonePreference,
} from "@/lib/tarot/types";

const FOCUS_OPTIONS: Array<{ value: FocusArea; label: string; subtitle: string }> = [
  { value: "love", label: "Aşk & İlişkiler", subtitle: "Duygusal akış, sınırlar, yakınlık" },
  { value: "career", label: "Kariyer", subtitle: "Yön, görünür adımlar, odak" },
  { value: "money", label: "Maddi Denge", subtitle: "Ritim, sürdürülebilirlik, seçim" },
  { value: "self", label: "Kendim", subtitle: "İç ses, netlik, enerji alanı" },
  { value: "social", label: "Sosyal Çevre", subtitle: "İletişim tonu ve karşılıklılık" },
  { value: "family", label: "Aile", subtitle: "Ev içi denge ve ifade" },
  { value: "ask", label: "Serbest Niyet", subtitle: "Tek bir soruya derin bakış" },
];

const TONE_OPTIONS: Array<{ value: TonePreference; label: string }> = [
  { value: "soft", label: "Yumuşak" },
  { value: "balanced", label: "Dengeli" },
  { value: "direct", label: "Net" },
];

function shuffleCards(count: number): DrawnCard[] {
  const deck = [...TAROT_DECK_SEED].sort(() => Math.random() - 0.5).slice(0, count);
  return deck.map((card, index) => ({
    ...card,
    orientation: Math.random() > 0.3 ? "upright" : "reversed",
    position: count === 1 ? "present" : (["past", "present", "near_future"][index] as DrawnCard["position"]),
  }));
}

export default function ReadingPage() {
  const [focusArea, setFocusArea] = useState<FocusArea>("self");
  const [tonePreference, setTonePreference] = useState<TonePreference>("balanced");
  const [intention, setIntention] = useState("");
  const [name, setName] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadingResponse | null>(null);

  const canGenerate = cards.length > 0 && !isLoading;

  const loadingCopy = useMemo(() => {
    const options = [
      "Kartların ritmi çözülüyor...",
      "Niyetindeki enerji katmanları okunuyor...",
      "Akıştan senin için en net cümleler seçiliyor...",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, [isLoading]);

  const handleDraw = async (count: 1 | 3) => {
    setError(null);
    setResult(null);
    setIsDrawing(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    setCards(shuffleCards(count));
    setIsDrawing(false);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusArea,
          tonePreference,
          intention,
          cards,
          cardCount: cards.length,
          userContext: {
            name: name.trim() || undefined,
            tonePreference,
            recentTopics: [focusArea],
            savedThemes: [],
            favoriteSpreadTypes: cards.length === 1 ? ["daily"] : ["three-card"],
          },
          locale: "tr-TR",
        }),
      });

      const json = await res.json();
      const parsed = ReadingResponseSchema.safeParse(json);

      if (!res.ok || !parsed.success) {
        throw new Error("Yorum alınamadı");
      }

      setResult(parsed.data);
    } catch {
      setError("Akış kısa bir an kesildi. Kartlarını koruduk; tekrar deneyebilirsin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07070c] text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-16 pt-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">Günlük Niyet</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Bugün kartların sana ne söylüyor?</h1>
          <p className="text-sm text-zinc-400">Kısa bir niyet bırak, kartını çek ve akışın merkezindeki mesajı gör.</p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <label className="mb-2 block text-xs text-zinc-400">İsmin (opsiyonel)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Duru"
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-violet-400 transition focus:ring"
          />

          <p className="mb-2 text-xs text-zinc-400">Odak alanı</p>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFocusArea(option.value)}
                className={`rounded-xl border p-2 text-left transition ${
                  focusArea === option.value
                    ? "border-violet-300/70 bg-violet-400/20"
                    : "border-white/10 bg-black/20 hover:border-white/30"
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-[11px] text-zinc-400">{option.subtitle}</div>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-xs text-zinc-400">Yorum tonu</p>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setTonePreference(tone.value)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  tonePreference === tone.value
                    ? "bg-violet-300 text-zinc-900"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>

          <label className="mb-2 mt-4 block text-xs text-zinc-400">Niyetin (opsiyonel)</label>
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="Bugün hangi konuda netlik istiyorsun?"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-violet-400 transition focus:ring"
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDraw(1)}
            className="rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium hover:border-violet-300/60"
          >
            1 Kart Çek
          </button>
          <button
            onClick={() => handleDraw(3)}
            className="rounded-2xl border border-violet-300/40 bg-violet-500/20 px-3 py-3 text-sm font-medium hover:bg-violet-500/30"
          >
            3 Kart Açılımı
          </button>
        </section>

        <AnimatePresence>
          {isDrawing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"
            >
              Kartlar karıştırılıyor, niyetinle hizalanıyor...
            </motion.div>
          )}
        </AnimatePresence>

        {cards.length > 0 && (
          <section className="grid grid-cols-3 gap-3">
            {cards.map((card) => (
              <motion.div
                key={`${card.id}-${card.position}`}
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{ transformStyle: "preserve-3d" }}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3"
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">{card.position.replace("_", " ")}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{card.nameTr}</p>
                <p className="mt-1 text-xs text-zinc-400">{card.orientation === "upright" ? "Düz" : "Ters"}</p>
              </motion.div>
            ))}
          </section>
        )}

        <button
          disabled={!canGenerate}
          onClick={handleGenerate}
          className="rounded-2xl bg-violet-300 px-4 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? loadingCopy : "Yorumu Aç"}
        </button>

        {error && <p className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <h2 className="text-xl font-semibold text-violet-100">{result.reading.headline}</h2>
              <p className="text-sm text-zinc-300">{result.reading.summary}</p>
              <div className="space-y-2 text-sm text-zinc-200">
                <p>{result.reading.interpretation}</p>
                <p className="text-zinc-300">{result.reading.emotionalReflection}</p>
              </div>
              <div className="rounded-xl border border-violet-200/20 bg-violet-500/10 p-3 text-sm text-violet-100">
                <p className="font-medium">Düşünme Sorusu</p>
                <p>{result.reading.reflectionQuestion}</p>
              </div>
              <p className="text-xs text-zinc-400">{result.reading.groundingNote}</p>
              <div className="flex flex-wrap gap-2">
                {result.reading.themeTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
