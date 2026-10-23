"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { getActiveFestivalCelebrations, indiaTodayKey } from "../lib/festival-celebrations";

const messages: Record<string, string[]> = {
  diwali: [
    "रेसर अकादमी परिवार की ओर से आपको और आपके परिवार को दीपावली की हार्दिक शुभकामनाएँ। माँ लक्ष्मी और भगवान गणेश की कृपा से सुख, शांति और समृद्धि बनी रहे।",
    "दीयों की रोशनी आपके जीवन में नई आशाएँ और खुशियाँ लेकर आए। आपका घर प्रेम, स्वास्थ्य और सफलता से जगमगाता रहे। शुभ दीपावली!",
    "इस दीपावली पर हर नई शुरुआत मंगलमय हो और आपके सपनों को नई उड़ान मिले। आपको और आपके परिवार को ढेर सारा स्नेह।",
    "प्रकाश का यह पर्व आपके जीवन से अँधेरा दूर करे और हर दिन खुशियों से भर दे। दीपावली की बहुत-बहुत शुभकामनाएँ!",
  ],
  holi: [
    "रेसर अकादमी परिवार की ओर से आपको और आपके परिवार को होली की हार्दिक शुभकामनाएँ। रंगों का यह त्योहार आपके जीवन में आनंद और नई ऊर्जा लाए।",
    "गुलाल के रंगों के साथ आपके जीवन में दोस्ती, हँसी और मीठी यादें खिलती रहें। सुरक्षित और खुशियों भरी होली मनाएँ!",
    "होली का हर रंग आपके सपनों को और सुंदर बनाए। आपके घर में प्रेम, स्वास्थ्य और खुशहाली बनी रहे।",
    "बुराई पर अच्छाई की जीत और रंगों की उमंग आपके हर दिन को खास बनाए। होली की ढेरों शुभकामनाएँ!",
  ],
  navratri: [
    "माता रानी की कृपा आप और आपके परिवार पर सदा बनी रहे। नवरात्रि की हार्दिक शुभकामनाएँ—आपके जीवन में शक्ति, सुख और सफलता आए।",
    "नौ दिनों की भक्ति और उत्साह आपके मन में नई उमंग जगाए। माँ दुर्गा आपको साहस, स्वास्थ्य और उज्ज्वल भविष्य का आशीर्वाद दें।",
    "रेसर अकादमी परिवार की ओर से शुभ नवरात्रि! माता रानी के आशीर्वाद से हर कदम पर खुशियाँ और सफलता मिले।",
    "विजयादशमी का संदेश आपके जीवन में नई शुरुआत और अच्छाई की जीत लेकर आए। आपको और आपके परिवार को शुभकामनाएँ!",
  ],
  "new-year": [
    "रेसर अकादमी परिवार की ओर से आपको नववर्ष की हार्दिक शुभकामनाएँ। नया साल नई सीख, अच्छे स्वास्थ्य और शानदार सफलताओं से भरा हो।",
    "नए साल का हर दिन नई उम्मीद और मुस्कान लेकर आए। आपके सभी सपने पूरे हों और परिवार में खुशहाली बनी रहे।",
    "बीते साल की अच्छी यादें साथ लेकर नए साल में आत्मविश्वास से आगे बढ़ें। आपका वर्ष मंगलमय हो!",
    "नया वर्ष आपके लिए दोस्ती, ज्ञान और सफलता के नए अवसर लेकर आए। ढेर सारा स्नेह और शुभकामनाएँ!",
  ],
  general: [
    "इस शुभ अवसर पर आपको और आपके परिवार को रेसर अकादमी की ओर से हार्दिक शुभकामनाएँ। आपके घर में सुख, शांति और खुशहाली बनी रहे।",
    "यह पावन दिन आपके जीवन में नई प्रेरणा, अच्छे स्वास्थ्य और सफलता लेकर आए। सभी को शुभकामनाएँ!",
    "परिवार और प्रियजनों के साथ यह अवसर प्रेम और खुशियों से मनाएँ। आपका हर आने वाला दिन मंगलमय हो।",
    "आपकी मेहनत, सीख और सपनों को नई दिशा मिले। इस खास अवसर पर ढेर सारा स्नेह और शुभकामनाएँ!",
  ],
};

export default function FestivalCelebrationSlides({ audience }: { audience: "student" | "teacher" }) {
  const [today, setToday] = useState(() => indiaTodayKey());
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const events = getActiveFestivalCelebrations(previewDate ?? today);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("festivalPreview");
    if (process.env.NODE_ENV !== "development" || !preview) return;
    setPreviewDate(preview === "navratri" ? "2026-10-10" : preview === "diwali" ? "2026-11-03" : "2026-10-25");
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(indiaTodayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSlide(0);
    if (!events.length) return;
    const slidesPerEvent = messages.general.length;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % (events.length * slidesPerEvent)), 7000);
    return () => window.clearInterval(timer);
  }, [today, events.length]);

  if (!events.length) return null;

  const slidesPerEvent = messages.general.length;
  const eventIndex = Math.floor(slide / slidesPerEvent) % events.length;
  const event = events[eventIndex];
  const isVijayadashami = event.kind === "navratri" && event.dayNumber === 10;
  const festivalStyle = isVijayadashami ? "vijayadashami" : event.kind;
  const eventMessages = messages[event.kind] || messages.general;
  const atmosphereSymbols = isVijayadashami
    ? ["✦", "✨", "✧", "🌟", "✨"]
    : event.kind === "navratri"
      ? ["", "", "", "", ""]
      : event.kind === "diwali"
        ? ["🪔", "✨", "🪙", "🪔", "✦"]
        : event.kind === "holi"
          ? ["●", "●", "●", "●", "●"]
          : ["✦", "✨", "🌟", "✧", "✨"];
  const navratriBlessings = [
    "माँ शैलपुत्री आपको दृढ़ता और नए आरंभ का आशीर्वाद दें।",
    "माँ ब्रह्मचारिणी आपके जीवन में ज्ञान, संयम और सफलता भरें।",
    "माँ चंद्रघंटा आपके परिवार को साहस, शांति और सुरक्षा दें।",
    "माँ कूष्मांडा आपके घर में स्वास्थ्य, ऊर्जा और खुशियाँ लाएँ।",
    "माँ स्कंदमाता बच्चों को बुद्धि, प्रेम और उज्ज्वल भविष्य दें।",
    "माँ कात्यायनी आपके संकल्पों को शक्ति और सफलता दें।",
    "माँ कालरात्रि हर भय और कठिनाई से आपकी रक्षा करें।",
    "माँ महागौरी आपके जीवन में सुख, शांति और पवित्रता भरें।",
    "माँ सिद्धिदात्री आपकी मेहनत सफल करें और मनोकामनाएँ पूरी करें।",
    "विजयादशमी पर अच्छाई की जीत हो और आपके हर प्रयास में विजय मिले।",
  ];
  const message = event.kind === "navratri" && event.dayNumber
    ? `${navratriBlessings[event.dayNumber - 1]} ${eventMessages[slide % eventMessages.length]}`
    : eventMessages[slide % eventMessages.length];
  const status = event.daysUntilStart > 0
    ? `${event.kind === "navratri" ? `नवरात्रि का दिन ${event.dayNumber}` : event.title} · ${event.daysUntilStart} दिन शेष`
    : event.daysAfterEnd > 0
      ? `${event.title} · उत्सव के बाद की शुभकामनाएँ`
      : event.kind === "navratri"
        ? `आज नवरात्रि का दिन ${event.dayNumber} · ${event.title}`
        : `आज · ${event.title}`;

  return (
    <>
      <div className={`festival-atmosphere festival-atmosphere--${festivalStyle}`} aria-hidden="true">
        {Array.from({ length: event.kind === "navratri" && !isVijayadashami ? 17 : 12 }, (_, index) => <span
          key={index}
          style={{
            left: `${5 + ((index * 47) % 90)}%`,
            top: `${(index * 23) % 96}vh`,
            animationDelay: `${-((index * 2.17) % 17)}s`,
            animationDuration: `${15 + ((index * 7) % 8)}s`,
            "--particle-hue": `${(index * 47) % 360}`,
          } as CSSProperties}
        >{event.kind === "navratri" && !isVijayadashami ? "" : atmosphereSymbols[index % atmosphereSymbols.length]}</span>)}
        {isVijayadashami && <div className="festival-arrow-rain">{Array.from({ length: 5 }, (_, index) =>
          <span key={index} style={{ top: `${10 + index * 17}%`, animationDelay: `${index * 1.1}s` }}>➤</span>
        )}</div>}
      </div>
      <section className={`festival-slide festival-slide--${festivalStyle}`} aria-label={`${event.title} की शुभकामनाएँ`}>
        {event.kind === "navratri" && !isVijayadashami
          ? <span className="festival-art"><Image src="/navratri-mata-rani.png" alt="माँ दुर्गा" width={185} height={140} priority /></span>
          : <div className={`festival-artwork festival-artwork--${festivalStyle}`} aria-hidden="true">
              <span className="festival-artwork-main">{isVijayadashami ? "🏹" : event.emoji}</span>
              <span className="festival-artwork-detail">{isVijayadashami ? "🔥" : event.kind === "diwali" ? "✨" : event.kind === "holi" ? "🌈" : "✦"}</span>
              {isVijayadashami && <span className="festival-artwork-flame">🪔</span>}
            </div>}
        <div className="festival-copy" key={`${event.title}-${slide}`}>
          <span className="festival-eyebrow">{audience === "teacher" ? "रेसर अकादमी · शिक्षक परिवार" : "रेसर अकादमी · विद्यार्थी परिवार"} · {status}</span>
          <h2>{event.title} की हार्दिक शुभकामनाएँ</h2>
          <span className="festival-date">{event.dateRange}</span>
          <p>{message}</p>
        </div>
        {events.length > 1 && <div className="festival-dots" aria-label="उत्सव स्लाइड्स">
          {events.map((item, index) => <span key={`${item.startDate}-${item.title}`} className={index === eventIndex ? "active" : ""} />)}
        </div>}
      <style jsx global>{`
        .festival-atmosphere{position:fixed;z-index:3;inset:0;overflow:hidden;pointer-events:none;contain:strict}
        .festival-atmosphere>span{--particle-hue:45;position:absolute;display:block;color:#fff5bb;font-size:16px;opacity:.5;filter:drop-shadow(0 1px 5px rgba(44,20,60,.24));animation:atmosphere-drift 19s linear infinite;will-change:transform,opacity}
        .festival-atmosphere--navratri>span{width:9px;height:13px;border-radius:75% 18% 75% 18%;background:linear-gradient(145deg,hsl(var(--particle-hue) 100% 87%),hsl(var(--particle-hue) 88% 58%));box-shadow:0 1px 4px rgba(75,31,71,.22);font-size:0}
        .festival-atmosphere--holi span{width:8px;height:8px;border-radius:50%;background:hsl(var(--particle-hue) 92% 65%);box-shadow:0 0 12px hsl(var(--particle-hue) 100% 70% / .48);font-size:0}
        .festival-arrow-rain{position:absolute;inset:0;overflow:hidden}
        .festival-arrow-rain span{position:absolute;left:-12%;color:#ffdf8c;font-size:24px;text-shadow:0 0 12px #ff8b38;animation:arrow-flight 3.8s cubic-bezier(.3,.1,.7,.9) infinite}
        .festival-slide{position:relative;isolation:isolate;display:grid;grid-template-columns:clamp(70px,19vw,100px) minmax(0,1fr);align-items:center;gap:12px;overflow:hidden;width:100%;min-height:136px;margin:0 0 11px;padding:12px 15px 22px;border:1px solid rgba(255,255,255,.72);border-radius:18px;color:#fff;background:radial-gradient(ellipse at 92% 0,rgba(255,236,162,.26),transparent 36%),linear-gradient(125deg,#4b164f,#a51f59 52%,#df603d);box-shadow:0 9px 22px rgba(49,22,73,.2),inset 0 1px rgba(255,255,255,.34)}
        .festival-slide:before{position:absolute;z-index:-1;inset:0;content:"";opacity:.38;background-image:radial-gradient(rgba(255,245,196,.8) 1px,transparent 1.6px),radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.6px);background-size:35px 35px,53px 53px;background-position:0 0,17px 19px;mask-image:linear-gradient(90deg,transparent,#000)}
        .festival-copy,.festival-dots{position:relative;z-index:1}
        .festival-art{position:relative;display:block;align-self:center;width:100%;aspect-ratio:1.15;overflow:visible;filter:drop-shadow(0 7px 14px rgba(35,11,39,.32));}
        .festival-art :global(img){width:100%;height:100%;object-fit:contain;object-position:center;mask-image:radial-gradient(ellipse at center,#000 55%,transparent 100%);}
        .festival-artwork{position:relative;display:grid;place-items:center;align-self:center;width:100%;aspect-ratio:1;filter:drop-shadow(0 8px 12px rgba(38,12,40,.3));}
        .festival-artwork-main{font-size:clamp(46px,11vw,68px);line-height:1;animation:festival-float 4s ease-in-out infinite}
        .festival-artwork-detail{position:absolute;top:8%;right:0;font-size:clamp(20px,5vw,29px);animation:festival-glint 3s ease-in-out infinite}
        .festival-artwork-flame{position:absolute;bottom:10%;left:5%;font-size:22px;animation:festival-glint 3.4s ease-in-out infinite}
        .festival-slide--diwali{background:radial-gradient(ellipse at 92% 0,rgba(255,242,158,.32),transparent 38%),linear-gradient(125deg,#54200c,#a94b10 52%,#db8c17)}
        .festival-slide--holi{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.25),transparent 38%),linear-gradient(125deg,#372582,#a1248b 52%,#de4c63)}
        .festival-slide--vijayadashami{background:radial-gradient(ellipse at 100% 0,rgba(255,232,154,.3),transparent 38%),linear-gradient(125deg,#54232f,#a52d27 52%,#ed7b20)}
        .festival-slide--new-year{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.24),transparent 38%),linear-gradient(125deg,#123a78,#3454af 52%,#6d49ae)}
        .festival-copy{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:4px;animation:festival-in .4s ease both}
        .festival-eyebrow{max-width:100%;color:#fff1be;font-size:9px;font-weight:900;letter-spacing:.38px;line-height:1.4;overflow-wrap:anywhere}
        .festival-copy h2{margin:0;color:#fff!important;font-size:clamp(16px,2vw,20px);font-weight:950;line-height:1.2;text-wrap:balance;text-shadow:0 2px 10px rgba(48,13,55,.34)}
        .festival-date{display:inline-flex;align-items:center;min-height:21px;padding:2px 9px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.13);color:#fff9e9;font-size:10px;font-weight:850}
        .festival-copy p{max-width:76ch;margin:0;color:#fff;font-size:11.5px;font-weight:650;line-height:1.36;overflow-wrap:anywhere;text-shadow:0 1px 4px rgba(36,15,49,.16)}
        .festival-dots{position:absolute;right:14px;bottom:9px;left:14px;display:flex;justify-content:center;gap:5px}
        .festival-dots span{width:6px;height:6px;border-radius:9px;background:#fff;opacity:.38;transition:all .25s ease}
        .festival-dots span.active{width:18px;background:#ffe49a;opacity:1}
        @keyframes festival-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes festival-glow{0%,100%{transform:translateY(0) rotate(-3deg);box-shadow:0 0 0 5px rgba(255,255,255,.06),0 0 14px rgba(255,227,137,.18)}50%{transform:translateY(-3px) rotate(3deg);box-shadow:0 0 0 7px rgba(255,255,255,.09),0 0 25px rgba(255,227,137,.48)}}
        @keyframes festival-float{0%,100%{transform:translateY(2px) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
        @keyframes festival-glint{0%,100%{opacity:.7;transform:scale(.9) rotate(-7deg)}50%{opacity:1;transform:scale(1.08) rotate(7deg)}}
        @keyframes atmosphere-drift{0%{opacity:.14;transform:translate3d(0,-8vh,0) rotate(0deg)}15%{opacity:.62}76%{opacity:.54}100%{opacity:.08;transform:translate3d(5vw,112vh,0) rotate(340deg)}}
        @keyframes arrow-flight{0%{transform:translate3d(-5vw,0,0) rotate(-18deg);opacity:0}12%{opacity:.86}84%{opacity:.78}100%{transform:translate3d(120vw,-34vh,0) rotate(-18deg);opacity:0}}
        @media(max-width:520px){.festival-slide{grid-template-columns:clamp(64px,18vw,82px) minmax(0,1fr);align-items:center;gap:9px;min-height:128px;padding:11px 11px 21px;border-radius:17px}.festival-artwork-main{font-size:clamp(42px,12vw,57px)}.festival-artwork-detail{font-size:21px}.festival-artwork-flame{font-size:18px}.festival-copy{gap:3px}.festival-eyebrow{font-size:8px;letter-spacing:.15px;line-height:1.35}.festival-copy h2{font-size:15px;line-height:1.2}.festival-copy p{font-size:10.5px;line-height:1.32}.festival-date{min-height:19px;padding:1px 8px;font-size:9px}}
        @media(prefers-reduced-motion:reduce){.festival-artwork-main,.festival-artwork-detail,.festival-artwork-flame,.festival-copy,.festival-atmosphere span{animation:none;opacity:.75}}
      `}</style>
      </section>
    </>
  );
}
