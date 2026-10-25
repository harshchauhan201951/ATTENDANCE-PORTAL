"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { downloadPdfFile } from "../../../lib/download-pdf";
import { buildMonthlyResultPdf } from "../../../lib/monthly-result-pdf";
import type { MonthlyResultSnapshot } from "../../../lib/monthly-result";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function dateText(v:string){ if(!v) return "-"; const d=new Date(`${String(v).slice(0,10)}T00:00:00`); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-IN"); }
export default function StudentMonthlyResultPage(){
 const [snapshot,setSnapshot]=useState<MonthlyResultSnapshot|null>(null);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [error,setError]=useState("");const [pdfMessage,setPdfMessage]=useState("");
  useEffect(()=>{void load();const timer=setInterval(()=>{void load();},30000);return()=>clearInterval(timer);},[]);
  async function load(){setLoading(true);setError("");try{const id=Number(localStorage.getItem("studentId")||localStorage.getItem("attendance_student_id")||localStorage.getItem("student_id")||"0");if(!id)throw new Error("Student session not found. Please login again.");const res=await fetch("/api/monthly-results/publish?list=1");const listData=await res.json();if(!res.ok||!listData.success)throw new Error(listData.error||"Monthly result load failed.");const periods=listData.periods||[];const period=periods.find((p:any)=>Boolean(p.is_released)||(p.scheduled_release_at&&Date.now()>=new Date(p.scheduled_release_at).getTime()));if(!period){setMessage("Monthly result has not been released yet.");return;}const resultRes=await fetch("/api/monthly-results/publish?monthKey="+encodeURIComponent(period.month_key)+"&studentId="+encodeURIComponent(String(id)));const resultData=await resultRes.json();if(!resultRes.ok||!resultData.success)throw new Error(resultData.error||"Student result load failed.");const row=resultData.results?.[0];if(!row?.snapshot){setMessage("Your result is not available yet.");return;}const {data: studentInfo,error: studentInfoError}=await supabase.from("students").select("admission_date").eq("id",id).maybeSingle();if(studentInfoError)throw studentInfoError;setSnapshot(filterMonthlySnapshotByAdmission(row.snapshot as MonthlyResultSnapshot,studentInfo?.admission_date));}catch(e){setError(e instanceof Error?e.message:"Result load failed.");}finally{setLoading(false);}}
 function download(){if(!snapshot)return;try{downloadPdfFile(buildMonthlyResultPdf(snapshot),`RACER_ACADEMY_${snapshot.student.name.replace(/[^a-z0-9]+/gi,"_")}_${snapshot.monthKey}_MONTHLY_RESULT.pdf`);setPdfMessage("Your full result PDF has been downloaded.");}catch{setPdfMessage("PDF download could not start. Please try again.");}}
 return (
  <main className="monthly-result-page">
   <div className="monthly-result-heading">
    <div><div style={{color:"#0b58a5",fontSize:10,fontWeight:900,letterSpacing:1}}>STUDENT MODULE</div><h1>Monthly Final Result</h1><p>Official result and performance breakdown</p></div>
   </div>
   {snapshot && <div className="monthly-result-period"><span>Latest released period</span><strong>{snapshot.monthLabel}</strong></div>}
   {loading ? <div className="monthly-result-card" role="status" style={{padding:18,marginTop:12}}>Loading your latest result…</div>
    : error ? <div className="monthly-result-card" role="alert" style={{padding:18,marginTop:12}}><strong>Result could not be loaded</strong><p style={{color:"#687b90",fontSize:12}}>{error}</p><button type="button" className="monthly-result-download" onClick={()=>void load()}>Try again</button></div>
    : !snapshot ? <div className="monthly-result-card" style={{padding:18,marginTop:12}}><strong>{message || "Your result is not available yet."}</strong><p style={{color:"#687b90",fontSize:12,lineHeight:1.5}}>This page updates automatically when the academy releases your monthly result.</p></div>
    : <>
      <section className="monthly-result-score">
       <div style={{fontSize:10,fontWeight:900,letterSpacing:1,opacity:.82}}>MONTHLY FINAL RESULT</div>
       <h2 style={{margin:"14px 0 4px",fontSize:20}}>{snapshot.student.name}</h2>
       <div style={{fontSize:12,opacity:.86}}>{snapshot.monthLabel} · Class {snapshot.student.className || "—"}</div>
       <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12,marginTop:18,flexWrap:"wrap"}}>
        <div><small style={{fontSize:9,fontWeight:800,letterSpacing:.7}}>GRAND TOTAL</small><strong style={{display:"block",fontSize:22}}>{snapshot.totals.grandObtained} / {snapshot.totals.grandTotal}</strong></div>
        <div style={{textAlign:"right"}}><strong style={{display:"block",fontSize:30,lineHeight:1}}>{snapshot.totals.percentage.toFixed(1)}%</strong><small style={{fontSize:10,fontWeight:800}}>{snapshot.totals.status}</small></div>
       </div>
      </section>
      <section className="monthly-result-card monthly-result-student-details">
       <div className="monthly-result-section-heading"><div><span>STUDENT INFORMATION</span><h2>Result profile</h2></div><strong>ID</strong></div>
       <div className="monthly-result-mahatest-grid">
        <div><small>Father / guardian</small><strong>{snapshot.student.fatherName||"Not provided"}</strong></div>
        <div><small>Roll number</small><strong>{snapshot.student.rollNo||"Not assigned"}</strong></div>
        <div><small>Academic session</small><strong>{snapshot.student.academicSession||"—"}</strong></div>
        <div><small>Medium</small><strong>{snapshot.student.medium||"—"}</strong></div>
       </div>
      </section>
      <section className="monthly-result-breakdown" aria-label="Performance breakdown">
       <article><strong>Quizzes</strong><span>{snapshot.totals.quizObtained} / {snapshot.totals.quizTotal}</span><small>{snapshot.quizzes.length} assessments</small></article>
       <article><strong>Saturday Weekly Tests</strong><span>{snapshot.totals.weeklyObtained} / {snapshot.totals.weeklyTotal}</span><small>{snapshot.weeklyTests.length} tests</small></article>
       <article><strong>MahaTest</strong><span>{snapshot.totals.mahaObtained} / {snapshot.totals.mahaTotal}</span><small>{snapshot.mahaTest.durationMinutes} min · monthly assessment</small></article>
      </section>
      <section className="monthly-result-card monthly-result-assessments">
       <div className="monthly-result-section-heading"><div><span>ASSESSMENT DETAILS</span><h2>Quiz performance</h2></div><strong>{snapshot.quizzes.length}</strong></div>
       {snapshot.quizzes.length ? <div className="monthly-result-record-list">{snapshot.quizzes.map((quiz,index)=><article key={`${quiz.quizId}-${index}`}><div className="monthly-result-record-mark">Q</div><div className="monthly-result-record-copy"><strong>{quiz.title}</strong><span>{quiz.subject||"Subject not specified"} · Scheduled {dateText(quiz.date)}{quiz.attemptedDate?` · Attempted ${dateText(quiz.attemptedDate)}`:""}</span></div><div className="monthly-result-record-score"><strong>{quiz.obtained}/{quiz.total}</strong><span>{quiz.percentage.toFixed(1)}%</span></div></article>)}</div> : <p className="monthly-result-empty">No submitted quizzes were included in this result.</p>}
      </section>
      <section className="monthly-result-card monthly-result-assessments">
       <div className="monthly-result-section-heading"><div><span>WEEKLY ASSESSMENTS</span><h2>Saturday tests</h2></div><strong>{snapshot.weeklyTests.length}</strong></div>
       {snapshot.weeklyTests.length ? <div className="monthly-result-record-list">{snapshot.weeklyTests.map((test,index)=><article key={`${test.id}-${index}`}><div className="monthly-result-record-mark">W</div><div className="monthly-result-record-copy"><strong>{test.name}</strong><span>{test.subject||"Subject not specified"} · {dateText(test.date)}</span></div><div className="monthly-result-record-score"><strong>{test.obtained}/{test.total}</strong><span>{test.percentage.toFixed(1)}%</span></div></article>)}</div> : <p className="monthly-result-empty">No Saturday tests were recorded for this month.</p>}
      </section>
      <section className="monthly-result-card monthly-result-mahatest"><div><span>MONTHLY ASSESSMENT</span><h2>MahaTest details</h2></div><div className="monthly-result-mahatest-grid"><div><small>Date</small><strong>{dateText(snapshot.mahaTest.date)}</strong></div><div><small>Duration</small><strong>{snapshot.mahaTest.durationMinutes} minutes</strong></div><div><small>Maximum marks</small><strong>{snapshot.mahaTest.total}</strong></div><div><small>Obtained marks</small><strong>{snapshot.mahaTest.obtained===null?"Not entered":snapshot.mahaTest.obtained}</strong></div></div>{snapshot.mahaTest.remarks&&<p>{snapshot.mahaTest.remarks}</p>}</section>
      <section className="monthly-result-card monthly-result-download-panel"><div><span>OFFICIAL STATEMENT</span><strong>Download full result PDF</strong><p>Includes student details, every quiz and weekly test, MahaTest information, marks breakdown and final status.</p>{pdfMessage&&<p role="status" className="monthly-result-pdf-status">{pdfMessage}</p>}</div><button type="button" className="monthly-result-download" onClick={download}>⬇ Download Full PDF</button></section>
     </>}
  </main>
 );
}
const card:React.CSSProperties={background:"#fff",border:"1px solid #dbe7f5",borderRadius:14,padding:18,marginTop:14,boxShadow:"0 5px 20px rgba(15,23,42,.05)"};const button:React.CSSProperties={border:0,borderRadius:9,padding:"11px 15px",background:"#0b57a3",color:"#fff",fontWeight:800,cursor:"pointer"};




