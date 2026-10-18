"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import { downloadPdfFile } from "../../../lib/download-pdf";
import type { MonthlyResultSnapshot } from "../../../lib/monthly-result";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function dateText(v:string){ if(!v) return "-"; const d=new Date(`${String(v).slice(0,10)}T00:00:00`); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-IN"); }
function pdfFor(s:MonthlyResultSnapshot){
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const header=(title:string)=>{doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("RACER ACADEMY",105,18,{align:"center"});doc.setFontSize(10);doc.setFont("helvetica","normal");doc.text("Monthly Academic Result",105,25,{align:"center"});doc.line(15,29,195,29);doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text(title,105,38,{align:"center"});};
  header(`${s.monthLabel} - FINAL RESULT`); let y=50;
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("STUDENT DETAILS",15,y);y+=8;doc.setFontSize(9);doc.setFont("helvetica","normal");
  [["Student Name",s.student.name],["Father / Guardian",s.student.fatherName||"-"],["Class",s.student.className||"-"],["Roll Number",s.student.rollNo||"-"],["Student ID",String(s.student.id)],["Medium",s.student.medium||"-"],["Academic Session",s.student.academicSession||"-"],["Result Month",s.monthLabel]].forEach(([a,b])=>{doc.setFont("helvetica","bold");doc.text(a,18,y);doc.setFont("helvetica","normal");doc.text(String(b),70,y);y+=6;});
  y+=5;doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("QUIZ PERFORMANCE",15,y);y+=7;doc.setFontSize(8);doc.text("Quiz",15,y);doc.text("Subject",78,y);doc.text("Date",115,y);doc.text("Marks",151,y);doc.text("%",180,y);y+=5;doc.setFont("helvetica","normal");
  for(const q of s.quizzes){doc.setFontSize(8);const titleLines=doc.splitTextToSize(String(q.title||"-"),58);const subjectLines=doc.splitTextToSize(String(q.subject||"-"),30);const rowHeight=Math.max(titleLines.length,subjectLines.length)*4+2;if(y+rowHeight>280){doc.addPage();header("Quiz Performance - Continued");y=48;}doc.text(titleLines,15,y);doc.text(subjectLines,78,y);doc.text(dateText(q.date),115,y);doc.text(`${q.obtained}/${q.total}`,151,y);doc.text(`${q.percentage.toFixed(1)}%`,180,y);y+=rowHeight;}
  if(!s.quizzes.length){doc.text("No eligible submitted quiz was included.",15,y);y+=5;}
  y+=7;doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text("SATURDAY WEEKLY TESTS",15,y);y+=7;doc.setFontSize(8);doc.text("Test",15,y);doc.text("Subject",78,y);doc.text("Date",115,y);doc.text("Marks",151,y);doc.text("%",180,y);y+=5;doc.setFont("helvetica","normal");
  for(const t of s.weeklyTests){doc.setFontSize(8);const testLines=doc.splitTextToSize(String(t.name||"-"),58);const subjectLines=doc.splitTextToSize(String(t.subject||"-"),30);const rowHeight=Math.max(testLines.length,subjectLines.length)*4+2;if(y+rowHeight>280){doc.addPage();header("Saturday Weekly Tests - Continued");y=48;}doc.text(testLines,15,y);doc.text(subjectLines,78,y);doc.text(dateText(t.date),115,y);doc.text(`${t.obtained}/${t.total}`,151,y);doc.text(`${t.percentage.toFixed(1)}%`,180,y);y+=rowHeight;}
  if(!s.weeklyTests.length){doc.text("No applicable Saturday weekly test was recorded.",15,y);y+=5;}
  y+=8;if(y>255){doc.addPage();header("MahaTest & Final Calculation");y=50;}doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text("MONTHLY MAHATEST",15,y);y+=8;doc.setFontSize(9);doc.setFont("helvetica","normal");doc.text(`Date: ${dateText(s.mahaTest.date)}`,15,y);doc.text(`Duration: ${s.mahaTest.durationMinutes} minutes`,90,y);y+=7;doc.text(`Maximum: ${s.mahaTest.total}`,15,y);doc.text(`Obtained: ${s.mahaTest.obtained===null?"Not entered":s.mahaTest.obtained}`,90,y);y+=7;if(s.mahaTest.remarks){const remarkLines=doc.splitTextToSize(`Remarks: ${s.mahaTest.remarks}`,175);doc.text(remarkLines,15,y);y+=remarkLines.length*5;}y+=7;
  doc.setFontSize(11);doc.setFont("helvetica","bold");doc.text("FINAL CALCULATION",15,y);y+=8;doc.setFontSize(10);doc.setFont("helvetica","normal");
  [["Quiz Marks",`${s.totals.quizObtained}/${s.totals.quizTotal}`],["Weekly Tests",`${s.totals.weeklyObtained}/${s.totals.weeklyTotal}`],["MahaTest",`${s.totals.mahaObtained}/${s.totals.mahaTotal}`],["GRAND TOTAL",`${s.totals.grandObtained}/${s.totals.grandTotal}`],["PERCENTAGE",`${s.totals.percentage.toFixed(2)}%`],["PASS PERCENTAGE",`${s.totals.passPercentage}%`],["FINAL STATUS",s.totals.status],...(s.position?[ ["CLASS POSITION",String(s.position)] ]:[]),...(s.award?[["AWARD",s.awardGroup?`${s.award} (${s.awardGroup})`:s.award]]:[])].forEach(([a,b])=>{if(y>277){doc.addPage();header("Final Calculation - Continued");y=50;}doc.setFont("helvetica","bold");doc.text(a,25,y);doc.setFont("helvetica","normal");doc.text(b,105,y);y+=8;});
  y+=7;doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text("OFFICIAL FINAL RESULT",105,y,{align:"center"});y+=10;doc.setFontSize(17);doc.text(s.totals.status,105,y,{align:"center"});y+=10;doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text("Teacher Remarks: Monthly performance is calculated from eligible, recorded and submitted academic work.",15,285);doc.text("RACER ACADEMY",195,292,{align:"right"});
  return doc;
}

export default function StudentMonthlyResultPage(){
 const [snapshot,setSnapshot]=useState<MonthlyResultSnapshot|null>(null);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [error,setError]=useState("");const [pdfMessage,setPdfMessage]=useState("");
  useEffect(()=>{void load();const timer=setInterval(()=>{void load();},30000);return()=>clearInterval(timer);},[]);
  async function load(){setLoading(true);setError("");try{const id=Number(localStorage.getItem("studentId")||localStorage.getItem("attendance_student_id")||localStorage.getItem("student_id")||"0");if(!id)throw new Error("Student session not found. Please login again.");const res=await fetch("/api/monthly-results/publish?list=1");const listData=await res.json();if(!res.ok||!listData.success)throw new Error(listData.error||"Monthly result load failed.");const periods=listData.periods||[];const period=periods.find((p:any)=>Boolean(p.is_released)||(p.scheduled_release_at&&Date.now()>=new Date(p.scheduled_release_at).getTime()));if(!period){setMessage("Monthly result has not been released yet.");return;}const resultRes=await fetch("/api/monthly-results/publish?monthKey="+encodeURIComponent(period.month_key)+"&studentId="+encodeURIComponent(String(id)));const resultData=await resultRes.json();if(!resultRes.ok||!resultData.success)throw new Error(resultData.error||"Student result load failed.");const row=resultData.results?.[0];if(!row?.snapshot){setMessage("Your result is not available yet.");return;}const {data: studentInfo,error: studentInfoError}=await supabase.from("students").select("admission_date").eq("id",id).maybeSingle();if(studentInfoError)throw studentInfoError;setSnapshot(filterMonthlySnapshotByAdmission(row.snapshot as MonthlyResultSnapshot,studentInfo?.admission_date));}catch(e){setError(e instanceof Error?e.message:"Result load failed.");}finally{setLoading(false);}}
 function download(){if(!snapshot)return;try{downloadPdfFile(pdfFor(snapshot),`RACER_ACADEMY_${snapshot.student.name.replace(/[^a-z0-9]+/gi,"_")}_${snapshot.monthKey}_MONTHLY_RESULT.pdf`);setPdfMessage("Your full result PDF has been downloaded.");}catch{setPdfMessage("PDF download could not start. Please try again.");}}
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
       {snapshot.quizzes.length ? <div className="monthly-result-record-list">{snapshot.quizzes.map((quiz,index)=><article key={`${quiz.quizId}-${index}`}><div className="monthly-result-record-mark">Q</div><div className="monthly-result-record-copy"><strong>{quiz.title}</strong><span>{quiz.subject||"Subject not specified"} · {dateText(quiz.date)}</span></div><div className="monthly-result-record-score"><strong>{quiz.obtained}/{quiz.total}</strong><span>{quiz.percentage.toFixed(1)}%</span></div></article>)}</div> : <p className="monthly-result-empty">No submitted quizzes were included in this result.</p>}
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




