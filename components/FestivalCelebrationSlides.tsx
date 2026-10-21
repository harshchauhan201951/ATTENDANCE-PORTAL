"use client";

import { useEffect, useState } from "react";
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
  const [preview, setPreview] = useState(false);
  const [slide, setSlide] = useState(0);
  const events = getActiveFestivalCelebrations(preview ? "2026-10-31" : today);

  useEffect(() => {
    setPreview(process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("festivalPreview") === "1");
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
  const eventMessages = messages[event.kind] || messages.general;
  const message = eventMessages[slide % eventMessages.length];
  const status = event.daysUntilStart > 0
    ? `उत्सव शुरू होने में ${event.daysUntilStart} दिन शेष`
    : event.daysAfterEnd > 0
      ? "उत्सव के बाद की शुभकामनाएँ"
      : "उत्सव का पावन समय";

  return (
    <section className={`festival-slide festival-slide--${event.kind}`} aria-label={`${event.title} की शुभकामनाएँ`}>
      <span className="festival-lamp" aria-hidden="true">{event.emoji}</span>
      <div className="festival-copy" key={`${event.title}-${slide}`}>
        <span className="festival-eyebrow">{audience === "teacher" ? "रेसर अकादमी · शिक्षक परिवार" : "रेसर अकादमी · विद्यार्थी परिवार"} · {status}</span>
        <h2>{event.title} की हार्दिक शुभकामनाएँ</h2>
        <span className="festival-date">{event.dateRange}</span>
        <p>{message}</p>
      </div>
      {events.length > 1 && <div className="festival-dots" aria-label="उत्सव स्लाइड्स">
        {events.map((item, index) => <span key={`${item.startDate}-${item.title}`} className={index === eventIndex ? "active" : ""} />)}
      </div>}
      <style jsx>{`
        .festival-slide{position:relative;isolation:isolate;display:grid;grid-template-columns:60px minmax(0,1fr);align-items:center;gap:13px;overflow:hidden;width:100%;min-height:142px;margin:0 0 13px;padding:16px 20px 20px;border:1px solid rgba(255,255,255,.72);border-radius:20px;color:#fff;background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.22),transparent 38%),linear-gradient(125deg,#752d97,#c13c78 52%,#e58d3c);box-shadow:0 10px 24px rgba(91,39,103,.2)}
        .festival-slide:before{position:absolute;z-index:-1;inset:0;content:"";opacity:.48;background-image:radial-gradient(rgba(255,245,196,.8) 1px,transparent 1.6px),radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.6px);background-size:35px 35px,53px 53px;background-position:0 0,17px 19px;mask-image:linear-gradient(90deg,transparent,#000)}
        .festival-slide--diwali{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.2),transparent 38%),linear-gradient(125deg,#6a250e,#b95616 52%,#efad28)}
        .festival-slide--holi{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.22),transparent 38%),linear-gradient(125deg,#4732a2,#b23795 52%,#e55a68)}
        .festival-slide--navratri{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.2),transparent 38%),linear-gradient(125deg,#6f1b50,#b5254b 52%,#e47745)}
        .festival-slide--new-year{background:radial-gradient(ellipse at 100% 0,rgba(255,255,255,.2),transparent 38%),linear-gradient(125deg,#123a78,#3454af 52%,#6d49ae)}
        .festival-lamp{display:grid;place-items:center;width:56px;height:56px;border:1px solid rgba(255,255,255,.44);border-radius:17px;background:rgba(255,255,255,.16);box-shadow:0 0 0 5px rgba(255,255,255,.06);font-size:31px;animation:festival-glow 2.8s ease-in-out infinite}
        .festival-copy{display:flex;min-width:0;flex-direction:column;gap:5px;animation:festival-in .4s ease both}
        .festival-eyebrow{color:#fff1be;font-size:9px;font-weight:900;letter-spacing:.65px}
        .festival-copy h2{margin:0;color:#fff;font-size:clamp(15px,2vw,20px);font-weight:950;line-height:1.2;text-wrap:balance}
        .festival-date{color:rgba(255,255,255,.85);font-size:10px;font-weight:800}
        .festival-copy p{margin:0;color:#fff;font-size:12px;font-weight:600;line-height:1.45;overflow-wrap:anywhere}
        .festival-dots{position:absolute;right:14px;bottom:7px;left:14px;display:flex;justify-content:center;gap:5px}
        .festival-dots span{width:6px;height:6px;border-radius:9px;background:#fff;opacity:.38;transition:all .25s ease}
        .festival-dots span.active{width:18px;background:#ffe49a;opacity:1}
        @keyframes festival-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes festival-glow{0%,100%{transform:translateY(0) rotate(-3deg);box-shadow:0 0 0 5px rgba(255,255,255,.06),0 0 14px rgba(255,227,137,.18)}50%{transform:translateY(-3px) rotate(3deg);box-shadow:0 0 0 7px rgba(255,255,255,.09),0 0 25px rgba(255,227,137,.48)}}
        @media(max-width:520px){.festival-slide{grid-template-columns:44px minmax(0,1fr);gap:10px;min-height:140px;padding:13px 12px 20px;border-radius:17px}.festival-lamp{width:42px;height:42px;border-radius:13px;font-size:24px}.festival-eyebrow{font-size:8px;letter-spacing:.25px}.festival-copy h2{font-size:15px}.festival-copy p{font-size:10px;line-height:1.4}.festival-date{font-size:9px}}
        @media(prefers-reduced-motion:reduce){.festival-lamp,.festival-copy{animation:none}}
      `}</style>
    </section>
  );
}
