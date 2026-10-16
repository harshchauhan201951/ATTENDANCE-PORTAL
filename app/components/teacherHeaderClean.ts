// Teacher modules: sirf EK header rakhne ke liye.
// Layout ka header (desktop: rtd-header, mobile: shared fixed header) rehta hai;
// page ka apna duplicate header / Back-Dashboard-Logout buttons chhupa diye jaate hain.
// Kaam ke buttons (Save, Export CSV, + New ...) kabhi nahi chhupte.

const HIDE = "data-rtd-hide";

// header ke andar ye labels = sirf navigation (layout ke header me pehle se hain)
const NAV_IN_HEADER = new Set([
  "back", "backtodashboard", "dashboard", "teacherdashboard", "teacherpanel", "home",
  "logout", "signout", "settings", "quiztests", "academyprofile",
]);
// bina <header> wale pages: sirf ye clear navigation buttons
const NAV_IN_BAND = new Set(["back", "backtodashboard", "dashboard", "teacherdashboard", "logout", "signout"]);

const label = (el: Element) => (el.textContent || "").toLowerCase().replace(/[^a-z]/g, "");
const hide = (el: Element) => el.setAttribute(HIDE, "1");

function depthFrom(el: Element, root: Element) {
  let d = 0;
  for (let p = el.parentElement; p && p !== root; p = p.parentElement) d++;
  return d;
}

function hideUnlessHasFunctional(el: Element, functional: Element[]) {
  Array.from(el.children).forEach((child) => {
    if (functional.some((f) => child === f || child.contains(f))) {
      if (!functional.includes(child)) hideUnlessHasFunctional(child, functional);
    } else {
      hide(child);
    }
  });
}

export function cleanTeacherModuleHeader(root: HTMLElement) {
  const header = root.querySelector("header");
  const usable = header && depthFrom(header, root) <= 5;

  if (usable && header) {
    header.removeAttribute(HIDE);
    header.removeAttribute("data-rtd-slim");
    header.querySelectorAll(`[${HIDE}]`).forEach((e) => e.removeAttribute(HIDE));

    const controls = Array.from(header.querySelectorAll("button, a"));
    const functional = controls.filter((c) => !NAV_IN_HEADER.has(label(c)));

    if (functional.length === 0) {
      hide(header); // sirf title + navigation tha
    } else {
      header.setAttribute("data-rtd-slim", "1"); // sirf kaam ke buttons bachte hain
      hideUnlessHasFunctional(header, functional);
    }
    return;
  }

  // page me <header> tag nahi: sirf duplicate Back / Dashboard / Logout buttons hatao (upar ke hisse me)
  const rootTop = root.getBoundingClientRect().top;
  root.querySelectorAll("button, a").forEach((c) => {
    if (c.hasAttribute(HIDE)) return;
    if (c.closest('[role="dialog"], [aria-modal="true"], table, form, nav, [class*="modal"], [class*="Modal"]')) return;
    if (!NAV_IN_BAND.has(label(c))) return;
    if (c.getBoundingClientRect().top - rootTop > 360) return;
    hide(c);
    let p = c.parentElement;
    for (let i = 0; i < 3 && p && p !== root && p.tagName !== "MAIN"; i++) {
      const ownText = Array.from(p.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim());
      if (!ownText && Array.from(p.children).every((k) => k.hasAttribute(HIDE))) {
        hide(p);
        p = p.parentElement;
      } else break;
    }
  });
}
