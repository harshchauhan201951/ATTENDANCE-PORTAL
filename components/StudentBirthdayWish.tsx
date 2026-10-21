"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

function indiaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

const wishes = [
  "जन्मदिन की ढेरों शुभकामनाएँ! ईश्वर और सभी देवी-देवताओं का आशीर्वाद सदा आप पर बना रहे।",
  "आपका नया साल खुशियों, अच्छे स्वास्थ्य, नई सीख और शानदार सफलताओं से भर जाए।",
  "आपके सपने पूरे हों, मुस्कान हमेशा बनी रहे और हर दिन कुछ नया करने की प्रेरणा मिले।",
  "आपके माता-पिता और परिवार का प्यार और आशीर्वाद हर कदम पर आपके साथ रहे।",
  "आज का दिन आपकी तरह खास है—इसे खूब हँसी, प्यार और मीठी यादों के साथ मनाइए!",
  "रेसर अकादमी परिवार की ओर से आपके उज्ज्वल भविष्य और खुशहाल जीवन के लिए ढेर सारा प्यार।",
];

export default function StudentBirthdayWish({
  studentName,
  dateOfBirth,
  profileImage,
  preview = false,
}: {
  studentName: string;
  dateOfBirth: string | null;
  profileImage?: string | null;
  preview?: boolean;
}) {
  const [slide, setSlide] = useState(0);
  const [portalReady, setPortalReady] = useState(false);
  const [india, setIndia] = useState(() => indiaDateParts(new Date()));
  const dob = String(dateOfBirth || "").slice(0, 10).split("-").map(Number);
  const hasDob = dob.length === 3 && dob.every(Number.isFinite) && dob[1] >= 1 && dob[1] <= 12 && dob[2] >= 1 && dob[2] <= 31;
  const birthdayToday = hasDob && dob[1] === Number(india.month) && dob[2] === Number(india.day);
  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % wishes.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const refreshIndiaDate = () => {
      const next = indiaDateParts(new Date());
      setIndia((current) => current.year === next.year && current.month === next.month && current.day === next.day ? current : next);
    };
    const timer = window.setInterval(refreshIndiaDate, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => setPortalReady(true), []);

  if (!preview && !birthdayToday) return null;

  const age = hasDob ? Math.max(0, Number(india.year) - dob[0]) : 12;
  const birthDateLabel = hasDob
    ? new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(Date.UTC(dob[0], dob[1] - 1, dob[2], 12)))
    : "";
  const displayName = studentName.trim() || "प्यारे विद्यार्थी";

  return (
    <>
      {portalReady && createPortal(<div className="birthday-celebration-overlay" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={`balloon-${index}`} className={`party-balloon balloon-${index % 4}`} style={{ left: `${7 + ((index * 37) % 87)}%`, animationDelay: `${index * 1.1}s` }} />)}
        {Array.from({ length: 18 }, (_, index) => <span key={`glitter-${index}`} className="party-glitter" style={{ left: `${(index * 47 + 11) % 98}%`, top: `${(index * 31 + 9) % 94}%`, animationDelay: `${(index % 7) * 0.19}s` }} />)}
        {Array.from({ length: 9 }, (_, index) => <span key={`burst-${index}`} className="party-burst" style={{ left: `${7 + ((index * 31) % 87)}%`, top: `${10 + ((index * 19) % 55)}%`, "--burst-delay": `${index * 0.15}s` } as CSSProperties & { "--burst-delay": string }}>
          {Array.from({ length: 16 }, (_, ray) => <i key={ray} className="party-fragment" style={{ "--burst-angle": `${ray * 22.5}deg`, width: ray % 4 === 0 ? "12px" : "8px", height: ray % 4 === 0 ? "19px" : "13px", animationDelay: `${index * 0.15 + ray * 0.012}s` } as CSSProperties & { "--burst-angle": string }} />)}
        </span>)}
      </div>, document.body)}
      <div className="birthday-scene">
      <div className="birthday-valance" aria-hidden="true" />
      <div className="birthday-curtain birthday-curtain-left" aria-hidden="true" />
      <div className="birthday-curtain birthday-curtain-right" aria-hidden="true" />
      <section className="birthday-card" aria-label="जन्मदिन की शुभकामनाएँ" aria-live="polite">
      <span className="birthday-spark birthday-spark-one" aria-hidden="true">✦</span>
      <span className="birthday-spark birthday-spark-two" aria-hidden="true">✧</span>
      <span className="birthday-spark birthday-spark-three" aria-hidden="true">✦</span>
      <div className="birthday-student-photo" aria-label={`${displayName} की प्रोफ़ाइल तस्वीर`}>
        {profileImage ? <img src={profileImage} alt="" /> : <span>{displayName.slice(0, 1).toLocaleUpperCase("hi-IN")}</span>}
      </div>
      <div className="birthday-content">
        <div className="birthday-kicker"><span>🎉 जन्मदिन की हार्दिक शुभकामनाएँ</span></div>
        <h2>{displayName} जी, आज का दिन आपके नाम!</h2>
        <div className="birthday-facts">
          {birthDateLabel && <div className="birthday-date"><span aria-hidden="true">🎂</span> जन्मदिन: <strong>{birthDateLabel}</strong></div>}
          <div className="birthday-age"><span className="birthday-age-icon">✧</span> आज <strong>{age} वर्ष</strong> पूरे</div>
          <div className="birthday-art birthday-art-inline" aria-hidden="true">
            <div className="birthday-halo" />
            <div className="birthday-cake-wrap">
              <div className="birthday-flame" />
              <div className="birthday-candle" />
              <div className="birthday-cake-top">✦ · ✦ · ✦</div>
              <div className="birthday-cake-layer birthday-cake-layer-top"><span>●　●　●</span></div>
              <div className="birthday-cake-layer birthday-cake-layer-bottom"><span>✧　✧　✧</span></div>
              <div className="birthday-cake-plate" />
            </div>
          </div>
        </div>
        <div className="birthday-message" key={slide}>
          <span className="birthday-quote" aria-hidden="true">“</span>
          <p>{wishes[slide]}</p>
        </div>
        <div className="birthday-footer">
          <div className="birthday-signoff"><span>बहुत सारा प्यार</span><i /> रेसर अकादमी परिवार</div>
          <div className="birthday-progress" aria-label={`संदेश ${slide + 1} / ${wishes.length}`}>
            {wishes.map((_, index) => <span key={index} className={index === slide ? "active" : ""} />)}
          </div>
        </div>
      </div>
      </section>
      </div>
      <style jsx>{`
        .birthday-scene{position:relative;z-index:1;isolation:isolate;padding-top:14px;margin-bottom:12px}.birthday-valance{position:absolute;z-index:4;top:0;left:10px;right:10px;height:20px;pointer-events:none;border-radius:50% 50% 45% 45% / 0 0 100% 100%;background:radial-gradient(circle at 4% 45%,#fff3cf 0 2px,transparent 3px),radial-gradient(circle at 12% 36%,#fff 0 2px,transparent 3px),radial-gradient(circle at 21% 58%,#ffe8b4 0 2px,transparent 3px),radial-gradient(circle at 30% 76%,#fff 0 2px,transparent 3px),radial-gradient(circle at 40% 88%,#fff3cf 0 2px,transparent 3px),radial-gradient(circle at 50% 92%,#fff 0 2px,transparent 3px),radial-gradient(circle at 60% 88%,#ffe8b4 0 2px,transparent 3px),radial-gradient(circle at 70% 76%,#fff 0 2px,transparent 3px),radial-gradient(circle at 80% 58%,#fff3cf 0 2px,transparent 3px),radial-gradient(circle at 90% 36%,#fff 0 2px,transparent 3px),radial-gradient(circle at 96% 45%,#ffe8b4 0 2px,transparent 3px),linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,231,182,.27));box-shadow:0 3px 10px rgba(255,229,171,.2)}.birthday-valance:after{position:absolute;inset:0;border-bottom:1px solid rgba(255,238,197,.65);border-radius:0 0 50% 50%;content:""}.birthday-curtain{position:absolute;z-index:5;top:14px;bottom:7px;width:24px;pointer-events:none;opacity:1;border:1px solid rgba(255,238,205,.75);border-radius:8px 8px 50% 20%;background:repeating-linear-gradient(90deg,#fff3 0 3px,#ff83ca 3px 7px,#b191ff 7px 11px,#72d3ff 11px 15px,#ffd372 15px 19px,#fff1 19px 23px);filter:drop-shadow(0 0 10px rgba(255,180,224,.72));animation:curtain-shimmer 3.4s ease-in-out infinite}.birthday-curtain:before{position:absolute;top:-2px;left:0;width:20px;height:18px;border-radius:50%;background:radial-gradient(circle at 50% 50%,#ffe88a 0 2px,transparent 3px),radial-gradient(circle at 50% 18%,#ffb8d7 0 4px,transparent 5px),radial-gradient(circle at 18% 50%,#9ae9ff 0 4px,transparent 5px),radial-gradient(circle at 82% 50%,#c8a9ff 0 4px,transparent 5px),radial-gradient(circle at 50% 82%,#ffadca 0 4px,transparent 5px);filter:drop-shadow(0 0 5px rgba(255,223,139,.7));content:""}.birthday-curtain:after{position:absolute;bottom:-4px;left:9px;width:6px;height:18px;border-radius:50%;background:linear-gradient(180deg,#ffe58e,#ff87c2 55%,#b49aff);box-shadow:0 0 7px rgba(255,221,139,.65);content:""}.birthday-curtain-left{left:-7px}.birthday-curtain-right{right:-7px;transform:scaleX(-1)}
        .birthday-card{position:relative;isolation:isolate;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center;gap:14px;overflow:hidden;margin:0;padding:16px 22px;min-height:0;border:1px solid rgba(255,255,255,.55);border-radius:22px;color:#fff;background:radial-gradient(ellipse at 87% 50%,rgba(138,109,255,.2),transparent 28%),linear-gradient(120deg,#121738 0%,#24234f 56%,#3d285e 100%);box-shadow:0 12px 30px rgba(27,24,71,.18)}
        .birthday-spark{position:absolute;z-index:1;color:#ffe7ad;text-shadow:0 0 12px rgba(255,222,140,.75);pointer-events:none}.birthday-spark-one{top:15px;left:18px}.birthday-spark-two{top:20px;right:215px}.birthday-spark-three{bottom:18px;left:42%}
        .birthday-card:before{position:absolute;z-index:-1;inset:0;content:"";opacity:.42;background-image:radial-gradient(#fbd88c 1px,transparent 1.5px),radial-gradient(rgba(255,255,255,.8) 1px,transparent 1.5px);background-position:0 0,22px 19px;background-size:48px 48px,61px 61px;mask-image:linear-gradient(90deg,transparent,#000 50%,#000)}
        .birthday-card:after{position:absolute;z-index:-1;top:-120px;right:160px;width:310px;height:520px;border:1px solid rgba(245,204,124,.15);border-radius:50%;content:"";transform:rotate(28deg)}
        .birthday-student-photo{position:relative;z-index:2;grid-column:1;width:58px;height:58px;overflow:hidden;display:grid;place-items:center;border:2px solid #ffdf91;border-radius:50%;background:linear-gradient(145deg,#fff1c9,#f4ba54);box-shadow:0 0 0 5px rgba(255,223,145,.12),0 8px 20px rgba(0,0,0,.25);color:#382451;font-size:21px;font-weight:950}.birthday-student-photo img{width:100%;height:100%;object-fit:cover;object-position:center;border-radius:50%}
        .birthday-content{position:relative;z-index:2;grid-column:2;min-width:0;max-width:760px}.birthday-kicker{display:flex;align-items:center;gap:10px;color:#f8d994;font-size:10px;font-weight:950;letter-spacing:1.1px;text-transform:uppercase}.birthday-preview{padding:4px 8px;border:1px solid rgba(255,224,151,.34);border-radius:999px;background:rgba(255,255,255,.09);font-size:9px;letter-spacing:.4px;text-transform:none}
        .birthday-content h2{max-width:740px;margin:6px 0 7px;color:#fff9ed;font-size:clamp(22px,2.5vw,32px);font-weight:950;line-height:1.13;letter-spacing:-.55px;text-wrap:balance}.birthday-facts{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.birthday-date,.birthday-age{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid rgba(250,213,140,.3);border-radius:999px;background:rgba(255,255,255,.08);color:#ffedc3;font-size:10px;font-weight:750;white-space:nowrap}.birthday-date strong,.birthday-age strong{color:#ffe08c;font-size:11px}.birthday-age{background:linear-gradient(110deg,rgba(255,226,162,.16),rgba(255,255,255,.06))}.birthday-age-icon{color:#ffd66f;font-size:15px}
        .birthday-message{position:relative;display:flex;align-items:flex-start;gap:7px;max-width:720px;min-height:0;margin-top:8px;padding:7px 11px;border-left:2px solid #f1c96f;border-radius:0 10px 10px 0;background:linear-gradient(100deg,rgba(255,255,255,.12),rgba(255,255,255,.045));animation:wish-in .65s cubic-bezier(.2,.8,.2,1) both}.birthday-quote{color:#f3cd7d;font-family:Georgia,serif;font-size:23px;font-weight:900;line-height:1}.birthday-message p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;margin:1px 0;color:#fff;font-size:clamp(11.55px,1.2075vw,14.7px);font-weight:650;line-height:1.45}.birthday-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}.birthday-signoff{display:flex;align-items:center;gap:7px;color:#e1ddf8;font-size:10px;font-weight:800}.birthday-signoff i{width:20px;height:1px;background:#e5be6c}.birthday-progress{display:flex;align-items:center;gap:5px;flex:none}.birthday-progress span{width:5px;height:5px;border-radius:9px;background:#fff;opacity:.34;transition:all .4s ease}.birthday-progress span.active{width:19px;background:#f5d17c;opacity:1;box-shadow:0 0 10px rgba(245,209,124,.6)}
        .birthday-art-inline{position:relative;flex:0 0 72px;width:72px;height:55px;min-height:55px;overflow:visible;transform:none}.birthday-art-inline .birthday-cake-wrap{position:absolute;top:0;left:0;margin:0;transform-origin:top left;animation:cake-float-inline 3.8s ease-in-out infinite}.birthday-art-inline .birthday-halo{position:absolute;left:-16px;top:-25px;display:block;width:104px;height:104px;border:1px solid rgba(247,211,131,.32);border-radius:50%;box-shadow:0 0 0 7px rgba(247,211,131,.035),0 0 28px rgba(229,113,201,.1),inset 0 0 24px rgba(255,255,255,.025);animation:halo-pulse 4s ease-in-out infinite}.birthday-art-inline .birthday-halo:before,.birthday-art-inline .birthday-halo:after{position:absolute;inset:8px;border:1px dashed rgba(255,255,255,.18);border-radius:50%;content:""}.birthday-art-inline .birthday-halo:after{inset:-10px;border-style:solid;border-color:rgba(255,255,255,.08)}.birthday-art-inline .birthday-float,.birthday-art-inline .birthday-art-caption{display:none}
        .birthday-cake-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 16px 17px rgba(5,4,29,.35));animation:cake-float 4s ease-in-out infinite}.birthday-candle{width:9px;height:31px;margin-top:18px;border-radius:4px 4px 1px 1px;background:repeating-linear-gradient(135deg,#fff 0 5px,#e783a9 5px 10px);box-shadow:0 0 0 1px rgba(255,255,255,.6)}.birthday-flame{position:absolute;top:0;width:13px;height:19px;border-radius:90% 15% 70% 45%;background:linear-gradient(180deg,#fff6b1,#ffad47 70%,#f46b45);transform:rotate(12deg);filter:drop-shadow(0 0 10px #ffc663);animation:flame-dance 1s ease-in-out infinite alternate}.birthday-cake-top{z-index:2;width:142px;margin-bottom:-4px;padding:6px 0 4px;border-radius:50% 50% 10% 10%;background:linear-gradient(180deg,#fff3e7,#f3b9c7);color:#aa547b;text-align:center;font-size:11px;letter-spacing:4px}.birthday-cake-layer{position:relative;z-index:1;display:grid;place-items:center;border:1px solid rgba(255,255,255,.7);box-shadow:inset 0 4px 0 rgba(255,255,255,.48)}.birthday-cake-layer-top{width:150px;height:42px;border-radius:9px 9px 13px 13px;background:linear-gradient(110deg,#f5a7c2,#ed739e 56%,#f7b7c6);color:#fff;font-size:10px}.birthday-cake-layer-bottom{width:177px;height:46px;margin-top:3px;border-radius:10px 10px 15px 15px;background:linear-gradient(110deg,#ffd982,#f2b950 55%,#ffe5a1);color:#9f632e;font-size:11px}.birthday-cake-plate{width:205px;height:12px;margin-top:3px;border:1px solid rgba(255,255,255,.75);border-radius:50%;background:linear-gradient(90deg,#c3b1ff,#fff,#c3b1ff);box-shadow:0 4px 12px rgba(0,0,0,.18)}.birthday-float{position:absolute;z-index:2;font-size:25px;filter:drop-shadow(0 6px 8px rgba(0,0,0,.2));animation:decoration-float 3.5s ease-in-out infinite}.birthday-float-left{top:21px;left:7px;animation-delay:-.8s}.birthday-float-right{top:28px;right:5px;font-size:23px;animation-delay:-1.6s}.birthday-float-bottom{right:17px;bottom:16px;font-size:24px;animation-delay:-.4s}.birthday-art-caption{position:absolute;bottom:1px;color:#f4d994;font-size:9px;font-weight:950;letter-spacing:3px}
        @keyframes wish-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes cake-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-7px) rotate(1deg)}}@keyframes cake-float-inline{0%,100%{transform:translateY(0) scale(.34) rotate(-1deg)}50%{transform:translateY(-4px) scale(.34) rotate(1deg)}}@keyframes decoration-float{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-10px) rotate(6deg)}}@keyframes flame-dance{from{transform:rotate(7deg) scale(.92)}to{transform:rotate(-7deg) scale(1.07)}}@keyframes halo-pulse{0%,100%{transform:scale(.98);opacity:.78}50%{transform:scale(1.035);opacity:1}}@keyframes curtain-shimmer{0%,100%{filter:drop-shadow(0 0 6px rgba(255,180,224,.45));opacity:.9}50%{filter:drop-shadow(0 0 11px rgba(255,225,150,.78));opacity:1}}
        @media(max-width:760px){.birthday-card{grid-template-columns:70px minmax(0,1fr);gap:8px;padding:12px 14px;border-radius:18px}.birthday-student-photo{width:66px;height:66px;font-size:23px}.birthday-content h2{font-size:clamp(20px,4.4vw,27px);line-height:1.12;letter-spacing:-.3px}.birthday-kicker{font-size:8px;letter-spacing:.7px}.birthday-message{padding:6px 8px;margin-top:7px}.birthday-message p{font-size:11.55px;line-height:1.4}.birthday-signoff{font-size:9px;flex-wrap:wrap}.birthday-footer{margin-top:6px}}
        @media(max-width:480px){.birthday-card{grid-template-columns:54px minmax(0,1fr);gap:6px;padding:10px 9px;margin-bottom:8px;min-height:0;border-radius:16px}.birthday-student-photo{width:52px;height:52px;border-width:1px;box-shadow:0 0 0 3px rgba(255,223,145,.12),0 5px 12px rgba(0,0,0,.2);font-size:19px}.birthday-content h2{font-size:17px;margin:5px 0 6px}.birthday-date,.birthday-age{gap:3px;padding:4px 6px;font-size:8px}.birthday-date strong,.birthday-age strong{font-size:9px}.birthday-art-inline{flex-basis:80px;width:80px;height:62px;min-height:62px}.birthday-art-inline .birthday-cake-wrap{animation-name:cake-float-inline-small}.birthday-message{gap:4px;min-height:0;margin-top:6px;padding:5px 6px}.birthday-message p{font-size:9.45px;line-height:1.38}.birthday-quote{font-size:19px}.birthday-kicker{flex-wrap:wrap;font-size:7px;gap:5px}.birthday-signoff{gap:4px;font-size:7px}.birthday-signoff i{width:12px}.birthday-footer{gap:4px;margin-top:5px}.birthday-progress{gap:3px}.birthday-progress span{width:4px;height:4px}.birthday-progress span.active{width:13px}}
        @media(max-width:480px){.birthday-card{grid-template-columns:54px minmax(0,1fr);gap:6px;padding:10px 9px;margin-bottom:8px;min-height:0;border-radius:16px}.birthday-student-photo{width:52px;height:52px;border-width:1px;box-shadow:0 0 0 3px rgba(255,223,145,.12),0 5px 12px rgba(0,0,0,.2);font-size:19px}.birthday-content h2{font-size:17px;margin:5px 0 6px}.birthday-date,.birthday-age{gap:2px;padding:3px 5px;font-size:7px}.birthday-date strong,.birthday-age strong{font-size:8px}.birthday-art-inline{flex-basis:68px;width:68px;height:52px;min-height:52px}.birthday-art-inline .birthday-cake-wrap{animation-name:cake-float-inline-small}.birthday-art-inline .birthday-halo{left:-14px;top:-23px;width:96px;height:96px}.birthday-message{gap:4px;min-height:0;margin-top:6px;padding:5px 6px}.birthday-message p{font-size:9.45px;line-height:1.38}.birthday-quote{font-size:19px}.birthday-kicker{flex-wrap:wrap;font-size:7px;gap:5px}.birthday-signoff{gap:4px;font-size:7px}.birthday-signoff i{width:12px}.birthday-footer{gap:4px;margin-top:5px}.birthday-progress{gap:3px}.birthday-progress span{width:4px;height:4px}.birthday-progress span.active{width:13px}}
        @keyframes cake-float-inline-small{0%,100%{transform:translateY(0) scale(.31) rotate(-1deg)}50%{transform:translateY(-4px) scale(.31) rotate(1deg)}}
        @media(prefers-reduced-motion:reduce){.birthday-cake-wrap,.birthday-float,.birthday-halo,.birthday-flame,.birthday-celebration-overlay,.party-balloon,.party-glitter{animation:none}.birthday-message{animation:none}}
      `}</style>
      <style jsx>{`
        .birthday-scene{overflow:visible;margin-inline:-12px}
        .birthday-card{z-index:1;margin-inline:12px}
        .birthday-valance{display:none}
        .birthday-curtain{top:-8px;bottom:0;width:28px;z-index:2;border:1px solid rgba(255,239,215,.72);border-radius:12px 12px 8px 8px;clip-path:polygon(0 0,100% 0,94% 12%,74% 23%,88% 34%,65% 47%,86% 60%,72% 73%,100% 100%,0 100%);background:repeating-linear-gradient(90deg,#b82f78 0 4px,#f4a0b4 4px 7px,#126d68 7px 11px,#16a47c 11px 15px,#3943a8 15px 19px,#f2be5c 19px 22px,#7a4197 22px 25px);box-shadow:inset -5px 0 8px rgba(255,235,245,.23),inset 5px 0 8px rgba(0,20,14,.32),0 5px 14px rgba(8,59,48,.3);filter:drop-shadow(0 0 6px rgba(187,96,210,.48));animation:curtain-shimmer 4s ease-in-out infinite}
        .birthday-curtain:before{top:0;left:3px;width:calc(100% - 6px);height:clamp(34px,7vw,62px);border-radius:50% 50% 38% 38%;background:radial-gradient(circle at 9% 26%,#fff4de 0 4px,transparent 5px),radial-gradient(circle at 23% 58%,#f4b2c6 0 5px,transparent 6px),radial-gradient(circle at 39% 20%,#f2dca2 0 4px,transparent 5px),radial-gradient(circle at 55% 65%,#fff 0 4px,transparent 5px),radial-gradient(circle at 72% 30%,#e9b1ca 0 5px,transparent 6px),radial-gradient(circle at 90% 57%,#f5dda4 0 4px,transparent 5px),radial-gradient(circle at 18% 88%,#fff 0 3px,transparent 4px),radial-gradient(circle at 83% 92%,#f1b8c9 0 4px,transparent 5px);filter:drop-shadow(0 1px 4px rgba(255,238,192,.55))}
        .birthday-curtain:after{top:45%;bottom:auto;left:15%;width:18px;height:10px;border:1px solid rgba(255,244,207,.8);border-radius:50%;background:linear-gradient(90deg,#f3ce63,#fb91be,#a78bfa);box-shadow:0 0 7px rgba(255,234,181,.8);transform:rotate(-12deg)}
        .birthday-curtain-left{left:-6px}
        .birthday-curtain-right{right:-6px;transform:scaleX(-1)}
        @media(max-width:480px){.birthday-card{margin-inline:12px}.birthday-curtain{width:28px}.birthday-curtain:before{height:38px}}
      `}</style>
    </>
  );
}
