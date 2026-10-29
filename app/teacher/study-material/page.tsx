"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Material = {
  id: number;
  title: string;
  description: string | null;
  class_name: string;
  file_name: string;
  file_size: number;
  content_type: string;
  created_at: string;
  downloadUrl: string | null;
};

type ApiData = { success: boolean; error?: string; classes?: string[]; materials?: Material[]; classMembers?: Array<{ name: string; class_name: string }>; setupRequired?: boolean };

function readableSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TeacherStudyMaterialPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classMembers, setClassMembers] = useState<Array<{ name: string; class_name: string }>>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadMaterials = useCallback(async (id: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/study-material?teacherId=${id}`, { cache: "no-store" });
      const data = await response.json() as ApiData;
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load study material.");
      const classOptions = data.classes || [];
      setClasses(classOptions);
      setClassMembers(data.classMembers || []);
      setSetupRequired(Boolean(data.setupRequired));
      setSelectedClass((current) => current && classOptions.includes(current) ? current : "");
      setMaterials(data.materials || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load study material.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = Number(sessionStorage.getItem("attendance_teacher_id") || localStorage.getItem("attendance_teacher_id") || sessionStorage.getItem("teacher_id") || localStorage.getItem("teacher_id"));
    if (!Number.isInteger(id) || id <= 0) {
      setError("Teacher session was not found. Please sign in again.");
      setLoading(false);
      return;
    }
    setTeacherId(id);
    void loadMaterials(id);
  }, [loadMaterials]);

  const visibleMaterials = useMemo(
    () => selectedClass ? materials.filter((item) => item.class_name === selectedClass) : materials,
    [materials, selectedClass]
  );
  const visibleMembers = useMemo(
    () => selectedClass ? classMembers.filter((student) => student.class_name === selectedClass) : classMembers,
    [classMembers, selectedClass]
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    setFile(next);
    setError("");
    if (next && next.size > 20 * 1024 * 1024) {
      setFile(null);
      event.target.value = "";
      setError("File must be 20 MB or smaller.");
    }
  };

  const uploadMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherId || !selectedClass || !title.trim() || !file) {
      setError("Choose a class, add a title and select a file.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("teacherId", String(teacherId));
      form.set("className", selectedClass);
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("file", file);
      const response = await fetch("/api/study-material", { method: "POST", body: form });
      const data = await response.json() as ApiData;
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed.");
      setTitle("");
      setDescription("");
      setFile(null);
      const input = document.getElementById("study-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice(`Material added to Class ${selectedClass}.`);
      await loadMaterials(teacherId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (material: Material) => {
    if (!teacherId) return;
    setBusyId(material.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/study-material", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, materialId: material.id }),
      });
      const data = await response.json() as ApiData;
      if (!response.ok || !data.success) throw new Error(data.error || "Could not remove this material.");
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setNotice("Study material removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this material.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="study-page">
      <div className="study-shell">
        <header className="study-topbar">
          <button className="study-back" onClick={() => router.push("/teacher/dashboard")} type="button">← Dashboard</button>
          <div className="study-brand"><span className="study-brand-icon">R</span><span><b>RACER ACADEMY</b><small>TEACHER ACADEMIC DESK</small></span></div>
        </header>

        <section className="study-hero">
          <div className="study-hero-copy">
            <div className="study-eyebrow"><span /> CLASS LIBRARY · TEACHER PORTAL</div>
            <h1>Study Samagri</h1>
            <p>Upload notes and learning files for a class. Students see only material shared with their own class.</p>
          </div>
          <div className="study-hero-mark" aria-hidden="true"><span>✦</span><b>SS</b><small>LEARN · GROW</small></div>
          <div className="study-hero-orbit" />
        </section>

        <section className="study-stats" aria-label="Library summary">
          <div><span className="study-stat-icon">▦</span><small>AVAILABLE CLASSES</small><strong>{classes.length}</strong></div>
          <div><span className="study-stat-icon">▤</span><small>ALL MATERIALS</small><strong>{materials.length}</strong></div>
          <div><span className="study-stat-icon">♙</span><small>ACTIVE STUDENTS</small><strong>{visibleMembers.length}</strong></div>
        </section>

        <div className="study-content-grid">
          {setupRequired && <div className="study-setup-note"><b>One-time database setup needed</b><span>Run <code>database/migrations/20261029_study_materials.sql</code> in the connected Supabase SQL editor to turn on uploads and class libraries. The class roster is already loaded below.</span></div>}

          <section className="study-panel study-upload-panel">
            <div className="study-panel-heading"><span className="study-panel-icon">＋</span><div><h2>Add to class library</h2><p>Choose a class and share one file.</p></div></div>
            {classes.length === 0 && !loading ? <div className="study-empty-inline">No active student classes are available for this account.</div> : (
              <form className="study-form" onSubmit={uploadMaterial}>
                <label>Class<select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} required><option value="">Select Class</option>{classes.map((className) => <option key={className} value={className}>Class {className}</option>)}</select></label>
                <label>Material title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Fractions · Chapter 4 Notes" maxLength={120} required /></label>
                <label>Short note <span className="study-optional">OPTIONAL</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell students what this file covers" rows={3} maxLength={500} /></label>
                <label className="study-file-label">File <span className="study-optional">PDF · DOC · PPT · IMAGE · UP TO 20 MB</span><input id="study-material-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png" onChange={onFileChange} required /><span className="study-file-hint">{file ? `Selected: ${file.name} · ${readableSize(file.size)}` : "Choose a PDF or class resource from your device"}</span></label>
                <button className="study-upload-button" type="submit" disabled={saving || loading || setupRequired || !selectedClass || classes.length === 0}>{saving ? <><span className="study-spinner" /> Uploading…</> : <>Upload to Class {selectedClass || "—"} <span>↗</span></>}</button>
              </form>
            )}
          </section>

          <section className="study-panel study-library-panel">
            <div className="study-library-heading"><div><div className="study-library-kicker">YOUR LIBRARY</div><h2>Class materials</h2></div><label className="study-class-filter"><span>SHOWING</span><select aria-label="Filter study material by class" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}><option value="">All classes</option>{classes.map((className) => <option key={className} value={className}>Class {className}</option>)}</select></label></div>
            <div className="study-roster"><div className="study-roster-head"><span>CLASS ROSTER</span><b>{selectedClass ? `CLASS ${selectedClass}` : "ALL CLASSES"}</b><small>{visibleMembers.length} active students</small></div><div className="study-roster-list">{visibleMembers.length ? visibleMembers.map((student, index) => <span className="study-student-chip" key={`${student.class_name}-${student.name}-${index}`}><i>{student.name.slice(0, 1).toUpperCase()}</i>{student.name}<small>{student.class_name}</small></span>) : <span className="study-roster-empty">No active students in this class yet.</span>}</div></div>
            {notice && <div className="study-notice">✓ {notice}</div>}
            {error && <div className="study-error">{error}</div>}
            {loading ? <div className="study-loading"><span className="study-spinner" /> Loading class library…</div> : visibleMaterials.length === 0 ? <div className="study-empty"><span>▤</span><h3>No materials here yet</h3><p>Upload the first resource for {selectedClass ? `Class ${selectedClass}` : "your classes"} and it will appear here.</p></div> : (
              <div className="study-material-list">{visibleMaterials.map((material) => <article className="study-material-card" key={material.id}>
                <div className={`study-file-icon ${material.content_type === "application/pdf" ? "is-pdf" : ""}`}>{material.content_type === "application/pdf" ? "PDF" : "DOC"}</div>
                <div className="study-material-copy"><div className="study-material-tags"><span>CLASS {material.class_name}</span><span>{new Date(material.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div><h3>{material.title}</h3>{material.description && <p>{material.description}</p>}<small>{material.file_name} · {readableSize(material.file_size)}</small></div>
                <div className="study-material-actions">{material.downloadUrl && <a href={material.downloadUrl} target="_blank" rel="noreferrer" className="study-open-link">Open file ↗</a>}<button type="button" className="study-delete-button" onClick={() => void deleteMaterial(material)} disabled={busyId === material.id}>{busyId === material.id ? "Removing…" : "Remove"}</button></div>
              </article>)}</div>
            )}
          </section>
        </div>
        <footer className="study-footer"><span>RACER ACADEMY</span><i /> One class. One library. Every lesson in reach.</footer>
      </div>
      <style jsx global>{`
        .study-page{min-height:100vh;padding:24px;background:radial-gradient(ellipse at 8% 0%,rgba(70,117,220,.17),transparent 34%),radial-gradient(ellipse at 93% 18%,rgba(32,184,151,.12),transparent 27%),#f4f7fc;color:#132541;font-family:Arial,Helvetica,sans-serif}
        .study-setup-note{display:grid;gap:5px;margin:0 0 13px;padding:12px 15px;border:1px solid #f0dca4;border-radius:13px;background:#fff9e9;color:#84641d;font-size:10px;line-height:1.55}.study-setup-note b{font-size:11px}.study-setup-note code{color:#654a10;font-weight:850}
        .study-shell{max-width:1420px;margin:0 auto}.study-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.study-back{border:1px solid #dce5f0;border-radius:12px;padding:10px 14px;background:#fff;color:#36516f;font-size:12px;font-weight:800;cursor:pointer}.study-brand{display:flex;align-items:center;gap:10px;color:#183456}.study-brand-icon{display:grid;place-items:center;width:37px;height:37px;border-radius:12px;background:linear-gradient(145deg,#1675d1,#183968);color:#fff;font-size:18px;font-weight:950}.study-brand b,.study-brand small{display:block}.study-brand b{font-size:10px;letter-spacing:.16em}.study-brand small{margin-top:3px;color:#8091a8;font-size:7px;font-weight:900;letter-spacing:.15em}
        .study-hero{position:relative;display:flex;align-items:center;justify-content:space-between;overflow:hidden;min-height:220px;padding:34px 42px;border:1px solid #223d62;border-radius:26px;background:linear-gradient(112deg,#102846 0%,#174a70 59%,#176b76 100%);color:#fff;box-shadow:0 18px 38px rgba(18,48,83,.16)}.study-hero:after{position:absolute;inset:0;background:linear-gradient(110deg,transparent 0 61%,rgba(255,255,255,.07) 61.2%,transparent 61.6%),radial-gradient(ellipse at 84% 0%,rgba(153,229,211,.18),transparent 40%);content:"";pointer-events:none}.study-hero-copy{position:relative;z-index:1;max-width:660px}.study-eyebrow{display:flex;align-items:center;gap:9px;color:#a3dece;font-size:9px;font-weight:950;letter-spacing:.18em}.study-eyebrow span{width:7px;height:7px;border-radius:50%;background:#47d8a4;box-shadow:0 0 0 5px rgba(71,216,164,.13)}.study-hero h1{margin:14px 0 0;font-size:clamp(32px,4.3vw,49px);font-weight:950;letter-spacing:-.045em;line-height:1}.study-hero p{max-width:540px;margin:12px 0 0;color:#cfdeeb;font-size:13px;line-height:1.7}.study-hero-mark{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:138px;height:138px;border:1px solid rgba(210,245,235,.35);border-radius:39px;background:linear-gradient(145deg,rgba(255,255,255,.19),rgba(255,255,255,.045));box-shadow:inset 0 1px rgba(255,255,255,.2),0 15px 32px rgba(0,0,0,.12);transform:rotate(6deg)}.study-hero-mark span{color:#b5efcf;font-size:18px}.study-hero-mark b{font-size:32px;letter-spacing:.1em}.study-hero-mark small{margin-top:4px;color:#bcdbde;font-size:6px;font-weight:900;letter-spacing:.16em}.study-hero-orbit{position:absolute;right:11%;top:-148px;width:400px;height:400px;border:1px solid rgba(207,247,239,.13);border-radius:50%}
        .study-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:15px 0}.study-stats>div{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;align-items:center;column-gap:11px;padding:14px 16px;border:1px solid #e4ebf3;border-radius:17px;background:#fff;box-shadow:0 7px 18px rgba(25,54,91,.035)}.study-stat-icon{grid-row:1/3;display:grid;place-items:center;width:37px;height:37px;border-radius:12px;background:#eaf5f4;color:#188b78;font-size:17px;font-weight:900}.study-stats small{color:#8292a6;font-size:8px;font-weight:950;letter-spacing:.12em}.study-stats strong{margin-top:3px;color:#1e3657;font-size:20px;line-height:1;font-variant-numeric:tabular-nums}
        .study-content-grid{display:grid;grid-template-columns:minmax(290px,.74fr) minmax(0,1.5fr);align-items:start;gap:15px}.study-panel{min-width:0;border:1px solid #e2e9f2;border-radius:21px;background:#fff;box-shadow:0 9px 25px rgba(22,50,85,.045)}.study-upload-panel{padding:21px}.study-panel-heading{display:flex;align-items:center;gap:11px;padding-bottom:17px;border-bottom:1px solid #eef2f7}.study-panel-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:13px;background:#e7f5f1;color:#178b73;font-size:21px;font-weight:800}.study-panel-heading h2,.study-library-heading h2{margin:0;color:#203955;font-size:15px;font-weight:950}.study-panel-heading p{margin:4px 0 0;color:#8190a3;font-size:10px}.study-form{display:grid;gap:13px;padding-top:16px}.study-form label{display:grid;gap:6px;color:#4a617d;font-size:10px;font-weight:900;letter-spacing:.035em}.study-form input:not([type=file]),.study-form select,.study-form textarea,.study-class-filter select{width:100%;min-width:0;border:1px solid #dfe7f0;border-radius:11px;padding:11px 12px;background:#fbfcfe;color:#243c59;font:600 12px Arial,Helvetica,sans-serif;outline:none}.study-form input:focus,.study-form select:focus,.study-form textarea:focus,.study-class-filter select:focus{border-color:#65b6a3;box-shadow:0 0 0 3px rgba(34,164,137,.1)}.study-form textarea{resize:vertical}.study-optional{justify-self:end;margin-left:auto;color:#9aa6b5;font-size:7px;font-weight:900;letter-spacing:.12em}.study-form label:has(textarea){grid-template-columns:1fr auto}.study-form label:has(textarea) textarea{grid-column:1/-1}.study-file-label{padding:12px;border:1px dashed #b9cdd9;border-radius:13px;background:#f7fbfb}.study-file-label input{width:100%;color:#5e7084;font-size:10px}.study-file-hint{color:#71849a;font-size:9px;line-height:1.5;overflow-wrap:anywhere}.study-upload-button{display:flex;align-items:center;justify-content:center;gap:10px;min-height:45px;margin-top:2px;border:0;border-radius:12px;background:linear-gradient(100deg,#127d77,#20a98a);color:#fff;font-size:11px;font-weight:950;box-shadow:0 7px 15px rgba(24,144,124,.18);cursor:pointer}.study-upload-button:disabled{opacity:.6;cursor:default}.study-upload-button span:last-child{font-size:16px}.study-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:studySpin .7s linear infinite}@keyframes studySpin{to{transform:rotate(360deg)}}
        .study-library-panel{padding:21px}.study-library-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid #eef2f7}.study-library-kicker{margin-bottom:5px;color:#239582;font-size:8px;font-weight:950;letter-spacing:.16em}.study-library-heading h2{font-size:18px}.study-class-filter{display:grid;gap:4px;min-width:142px;color:#8391a3;font-size:7px;font-weight:950;letter-spacing:.1em}.study-class-filter select{padding:8px 10px;font-size:10px}.study-notice,.study-error{margin:13px 0 0;padding:10px 12px;border-radius:10px;font-size:10px;font-weight:750}.study-notice{border:1px solid #ccecdf;background:#effaf5;color:#15815c}.study-error{border:1px solid #f2d1d1;background:#fff6f5;color:#a63b37}.study-loading,.study-empty{display:grid;place-items:center;min-height:210px;color:#7b8ca1;font-size:11px}.study-empty span{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:#eef7f5;color:#24937d;font-size:23px}.study-empty h3{margin:11px 0 0;color:#38516e;font-size:13px}.study-empty p{max-width:270px;margin:6px 0 0;color:#8390a1;font-size:10px;line-height:1.5;text-align:center}.study-empty-inline{margin-top:15px;padding:18px;border-radius:12px;background:#f8fafc;color:#7b8ca1;font-size:11px;line-height:1.5}.study-material-list{display:grid;gap:9px;padding-top:13px}.study-material-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;padding:13px;border:1px solid #e8edf3;border-radius:15px;background:linear-gradient(110deg,#fff,#fbfdfd)}.study-file-icon{display:grid;place-items:center;width:39px;height:43px;border:1px solid #d9e8df;border-radius:11px;background:#edf8f1;color:#208963;font-size:8px;font-weight:950;letter-spacing:.04em}.study-file-icon.is-pdf{border-color:#f3d4d1;background:#fff0ee;color:#d04d43}.study-material-copy{min-width:0}.study-material-tags{display:flex;flex-wrap:wrap;gap:7px;color:#8392a5;font-size:7px;font-weight:950;letter-spacing:.11em}.study-material-tags span:first-child{color:#238c78}.study-material-copy h3{margin:5px 0 0;color:#253c59;font-size:12px;font-weight:950;overflow-wrap:anywhere}.study-material-copy p{margin:4px 0 0;color:#728399;font-size:9px;line-height:1.5}.study-material-copy small{display:block;margin-top:5px;color:#8c9aab;font-size:8px;overflow-wrap:anywhere}.study-material-actions{display:grid;justify-items:end;gap:7px}.study-open-link{color:#147f73;font-size:9px;font-weight:950;text-decoration:none}.study-open-link:hover{text-decoration:underline}.study-delete-button{border:0;background:transparent;color:#a47777;font-size:8px;font-weight:800;cursor:pointer}.study-delete-button:disabled{opacity:.5}.study-footer{display:flex;align-items:center;justify-content:center;gap:9px;margin:20px 0 4px;color:#8b99aa;font-size:8px;font-weight:700;letter-spacing:.04em}.study-footer span{color:#55708d;font-weight:950;letter-spacing:.12em}.study-footer i{width:4px;height:4px;border-radius:50%;background:#4ba992}
        .study-roster{margin-top:13px;padding:12px;border:1px solid #e6edf2;border-radius:13px;background:#f8fbfc}.study-roster-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.study-roster-head>span{color:#198b78;font-size:7px;font-weight:950;letter-spacing:.12em}.study-roster-head b{color:#3d5571;font-size:8px}.study-roster-head small{margin-left:auto;color:#8b98a8;font-size:8px}.study-roster-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.study-student-chip{display:flex;align-items:center;gap:5px;padding:4px 7px 4px 4px;border:1px solid #e6edf2;border-radius:999px;background:#fff;color:#53677f;font-size:8px;font-weight:750}.study-student-chip i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#e8f4f1;color:#188773;font-size:8px;font-style:normal;font-weight:950}.study-student-chip small{color:#98a4b2;font-size:7px}.study-roster-empty{color:#8996a6;font-size:9px}
        @media(max-width:900px){.study-content-grid{grid-template-columns:1fr}.study-upload-panel{order:0}.study-library-panel{order:1}}
        @media(max-width:600px){.study-page{padding:14px 11px 22px}.study-topbar{margin-bottom:13px}.study-back{padding:9px 11px;font-size:10px}.study-brand{gap:7px}.study-brand-icon{width:32px;height:32px}.study-brand b{font-size:8px}.study-brand small{font-size:6px}.study-hero{min-height:185px;padding:23px 20px;border-radius:20px}.study-hero h1{font-size:34px}.study-hero p{max-width:260px;font-size:11px}.study-eyebrow{font-size:7px;letter-spacing:.13em}.study-hero-mark{width:82px;height:82px;position:absolute;right:17px;bottom:16px;border-radius:25px;opacity:.8}.study-hero-mark b{font-size:21px}.study-hero-mark small{font-size:5px}.study-hero-mark span{font-size:12px}.study-hero-orbit{right:-190px;top:-90px}.study-stats{gap:7px;margin:10px 0}.study-stats>div{grid-template-columns:1fr;justify-items:start;gap:6px;padding:10px;border-radius:13px}.study-stat-icon{grid-row:auto;width:29px;height:29px;font-size:14px}.study-stats small{font-size:6px;letter-spacing:.07em}.study-stats strong{font-size:16px}.study-content-grid{gap:10px}.study-panel{border-radius:17px}.study-upload-panel,.study-library-panel{padding:15px}.study-library-heading{align-items:flex-end}.study-library-heading h2{font-size:16px}.study-class-filter{min-width:115px}.study-material-card{grid-template-columns:35px minmax(0,1fr);gap:9px;padding:11px}.study-file-icon{width:34px;height:38px}.study-material-actions{grid-column:2;display:flex;justify-content:flex-start;justify-items:start;gap:13px}.study-footer{flex-wrap:wrap;font-size:7px}.study-footer span{width:100%;text-align:center}}
      `}</style>
    </main>
  );
}
