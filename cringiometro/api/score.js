// Vercel serverless function: chiede a Claude il punteggio di cringe.
// Richiede la variabile d'ambiente ANTHROPIC_API_KEY.
const PROMPT = `Sei il "Cringiometro": stimi quanto un post LinkedIn verrebbe percepito come cringe dalla community di r/LinkedInCringeIT (il subreddit italiano che raccoglie i post LinkedIn più imbarazzanti).

Pattern che quel sub prende di mira più spesso:
- storielle motivazionali palesemente inventate (il tassista saggio, il figlio di 5 anni che insegna leadership, il candidato assunto perché ha ringraziato la signora delle pulizie)
- lezioni di business tratte da eventi privati (matrimonio, lutto, parto, malattia, vacanze)
- humblebrag e "sono felice e orgoglioso di annunciare" gonfiato
- broetry: una frase per riga per creare suspense finta
- hustle culture, sveglia alle 5, glorificazione del lavoro gratis/stage non pagati, "chi si lamenta non ha fame"
- engagement bait ("Agree?", "Cosa ne pensate? 👇", "Commenta SI")
- emoji a raffica 🚀🔥💪, hashtag spam, inglesismi gratuiti ("mindset", "game changer")
- testo palesemente generato da AI, tono da guru, frasi fatte
- selfie emotivi / vulnerabilità usata come vetrina, recruiter o CEO paternalisti

Se sono allegate immagini, fanno parte del post: valutale insieme al testo (selfie emotivi, foto col badge o sul palco, screenshot di complimenti ricevuti, foto da ospedale/matrimonio usate per parlare di lavoro, grafiche AI, citazioni motivazionali su sfondo stock) e citale nelle reasons quando pesano.

Un post sobrio, informativo, specifico e onesto deve avere un punteggio basso. Non essere gentile né cattivo per partito preso: sii calibrato.

Rispondi SOLO con JSON valido, in italiano, con questa forma:
{"score": intero 0-100, "verdict": "2-3 parole secche (es. 'Puro cringe', 'Quasi umano', 'Pulito')", "tags": ["max 3 etichette brevi dei pattern trovati"], "reasons": [{"title": "pattern in 2-4 parole", "detail": "una frase concreta che cita o indica il punto del post"}]}
Al massimo 4 reasons. Se il post è pulito, spiega in 1-2 reasons perché funziona.

POST:
"""
`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "missing ANTHROPIC_API_KEY" });

  const { post = "", images = [] } = req.body || {};
  const text = String(post).slice(0, 6000);
  const imgs = (Array.isArray(images) ? images : []).slice(0, 4)
    .filter(i => i && typeof i.data === "string" && /^image\/(jpeg|png|gif|webp)$/.test(i.media_type))
    .map(i => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } }));
  if (!text.trim() && !imgs.length) return res.status(400).json({ error: "empty" });

  const note = imgs.length ? `\n"""\n(Al post sono allegate ${imgs.length} immagini.)` : '\n"""';
  const content = [...imgs, { type: "text", text: PROMPT + (text || "(nessun testo, solo immagini)") + note }];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.CRINGE_MODEL || "claude-haiku-5-5", max_tokens: 800, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) return res.status(502).json({ error: "upstream " + r.status });
    const data = await r.json();
    const out = (data.content || []).map(c => c.text || "").join("");
    const json = JSON.parse((out.match(/\{[\s\S]*\}/) || ["{}"])[0]);
    if (typeof json.score !== "number") return res.status(502).json({ error: "bad output" });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: "failed" });
  }
}

