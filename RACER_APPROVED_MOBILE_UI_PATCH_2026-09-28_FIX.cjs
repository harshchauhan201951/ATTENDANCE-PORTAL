const fs=require('fs'),path=require('path');
const root=process.cwd();
const dash=path.join(root,'app','teacher','dashboard','page.tsx');
const css=path.join(root,'app','globals.css');
if(!fs.existsSync(dash)) throw new Error('Teacher dashboard file not found: '+dash);

// Restore the exact dashboard source from the backup made by the failed patch.
const backup=dash+'.bak-mobile-approved';
if(fs.existsSync(backup)) fs.copyFileSync(backup,dash);

let s=fs.readFileSync(dash,'utf8');

// The existing menuItems are readonly tuples:
// [title, path, icon, category]. Keep that structure unchanged.
if(!s.includes('const [activeTab, setActiveTab]')){
  const stateMarker='const [headerTime, setHeaderTime] = useState("");';
  if(s.includes(stateMarker)){
    s=s.replace(stateMarker,stateMarker+'\n  const [activeTab, setActiveTab] = useState<"All" | "Academic" | "Management">("All");');
  } else {
    const useEffectMarker='export default function TeacherDashboard';
    const idx=s.indexOf(useEffectMarker);
    if(idx<0) throw new Error('Could not locate dashboard component');
    s=s.replace(useEffectMarker,useEffectMarker+'\n');
  }
}

// Add filtered tuple list immediately before the component return.
if(!s.includes('const visibleItems = activeTab === "All"')){
  const marker='\n  return (';
  const i=s.indexOf(marker);
  if(i<0) throw new Error('Could not locate dashboard return()');
  s=s.slice(0,i)+'\n  const visibleItems = activeTab === "All" ? menuItems : menuItems.filter((item) => String(item[3]).toLowerCase() === activeTab.toLowerCase());\n'+s.slice(i);
}

// Render visibleItems instead of the full list. This preserves the existing tuple destructuring.
s=s.replace(/menuItems\.map\(/g,'visibleItems.map(');

// Insert the working category tabs immediately before the module grid/list.
if(!s.includes('racer-module-tabs')){
  const candidates=['<section className="racer-teacher-grid">','<div className="racer-teacher-grid">','<section className="teacher-module-grid">'];
  let target=null;
  for(const c of candidates){ if(s.includes(c)){target=c;break;} }
  if(!target) throw new Error('Could not locate teacher module grid');
  const tabs='<div className="racer-module-tabs" role="tablist" aria-label="Teacher module categories">{(["All","Academic","Management"] as const).map((tab)=><button key={tab} type="button" role="tab" aria-selected={activeTab===tab} className={activeTab===tab?"active":""} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>\n\n        ';
  s=s.replace(target,tabs+target);
}

// Add the approved mobile visual skin once.
const skin=`
/* RACER APPROVED MOBILE REFERENCE UI — 2026-09-28 FIX */
.racer-module-tabs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;padding:4px!important;margin:0 0 10px!important;border-radius:14px!important;background:#eaf3fd!important;border:1px solid #dce9f7!important}
.racer-module-tabs button{border:0!important;border-radius:11px!important;background:transparent!important;color:#3d6a9e!important;font-size:9px!important;font-weight:800!important;padding:8px 4px!important;min-height:34px!important;cursor:pointer!important}
.racer-module-tabs button.active{background:linear-gradient(180deg,#1976ed,#0b61d1)!important;color:#fff!important;box-shadow:0 3px 9px rgba(25,118,237,.22)!important}
@media(max-width:640px){.racer-teacher-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.racer-teacher-module{min-width:0!important;overflow:hidden!important;box-sizing:border-box!important}.racer-teacher-module-title{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.2!important}.racer-teacher-module-icon{flex-shrink:0!important}}
@media(max-width:380px){.racer-teacher-grid{gap:5px!important}.racer-teacher-module{padding-left:7px!important;padding-right:7px!important}.racer-teacher-module-title{font-size:8px!important}}
`;
if(fs.existsSync(css)){
  const old=fs.readFileSync(css,'utf8');
  if(!old.includes('RACER APPROVED MOBILE REFERENCE UI — 2026-09-28 FIX')) fs.appendFileSync(css,'\n'+skin);
}
fs.writeFileSync(dash,s,'utf8');
console.log('RACER APPROVED MOBILE UI PATCH FIX APPLIED');
