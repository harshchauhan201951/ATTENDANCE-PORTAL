"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type NotificationItem={id:number;student_id:number;category:string;title:string;message:string;url:string;is_read:boolean;audio_url:string|null;metadata:Record<string,unknown>;authorized_at:string;read_at?:string};
const categoryInfo:Record<string,{icon:string;label:string}>={
  fee_pending:{icon:"📪",label:"Fee Pending"},
  fee_paid:{icon:"✅",label:"Fee Paid"},
  announcement:{icon:"📢",label:"Announcement"},
  quiz_test:{icon:"📝",label:"Quiz / Test"},
  timetable:{icon:"📅",label:"Timetable"},
  result:{icon:"🏆",label:"Result"},
  general:{icon:"🔔",label:"General Update"}
};
export default function StudentNotificationsPage(){
  const router=useRouter();
  const[items,setItems]=useState<NotificationItem[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[studentId,setStudentId]=useState<number|null>(null);
  useEffect(()=>{
    const raw=localStorage.getItem("studentId")||sessionStorage.getItem("studentId")||localStorage.getItem("student_id")||sessionStorage.getItem("student_id");
    const id=Number(raw);
    if(!id||Number.isNaN(id)){
      setError("Student login session not found.");
      setLoading(false);
      return;
    }
    setStudentId(id);
    void loadNotifications(id);
  },[]);
  async function loadNotifications(id:number){
    try{
      setLoading(true);
      const response=await fetch("/api/student/notifications?studentId="+encodeURIComponent(String(id)),{cache:"no-store"});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.error||"Unable to load notifications.");
      setItems(result.notifications||[]);
      setError("");
    }catch(err){
      setError(err instanceof Error?err.message:"Unable to load notifications.");
    }finally{
      setLoading(false);
    }
  }
  async function markRead(id:number,path:string){
    if(!studentId)return;
    try{
      await fetch("/api/student/notifications",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({studentId,notificationId:id})
      });
      setItems(v=>v.map(item=>item.id===id?{...item,is_read:true,read_at:new Date().toISOString()}:item));
      if(path)router.push(path);
    }catch{}
  }
  async function markAllRead(){
    if(!studentId)return;
    try{
      const response=await fetch("/api/student/notifications",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({studentId,markAll:true})
      });
      if(!response.ok)return;
      setItems(v=>v.map(item=>({...item,is_read:true,read_at:new Date().toISOString()})));
    }catch{}
  }
  const unread=items.filter(item=>!item.is_read).length;
  return <main style={{minHeight:"100vh",background:"#f5f7fb",padding:"18px",fontFamily:"Arial,sans-serif"}}>
    <div style={{maxWidth:850,margin:"0 auto"}}>
      <div style={{background:"#fff",borderRadius:18,padding:"18px",boxShadow:"0 4px 18px rgba(0,0,0,.07)",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:"#111827"}}>🔔 Notifications</div>
            <div style={{fontSize:14,color:"#6b7280",marginTop:4}}>{unread} unread notification{unread===1?"":"s"}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>router.push("/student/dashboard")} style={{border:0,borderRadius:10,padding:"10px 14px",fontWeight:800,cursor:"pointer",background:"#eef2ff",color:"#3730a3"}}>← Dashboard</button>
            {unread>0&&<button onClick={()=>void markAllRead()} style={{border:0,borderRadius:10,padding:"10px 14px",fontWeight:800,cursor:"pointer",background:"#047857",color:"#fff"}}>Mark All Read</button>}
          </div>
        </div>
      </div>
      {loading&&<div style={{background:"#fff",borderRadius:16,padding:30,textAlign:"center",fontWeight:700}}>Loading notifications...</div>}
      {!loading&&error&&<div style={{background:"#fff",borderRadius:16,padding:24,textAlign:"center",color:"#b91c1c",fontWeight:700}}>{error}</div>}
      {!loading&&!error&&items.length===0&&<div style={{background:"#fff",borderRadius:16,padding:35,textAlign:"center"}}>
        <div style={{fontSize:42}}>🔔</div>
        <div style={{fontSize:18,fontWeight:900,marginTop:8}}>No Notifications</div>
        <div style={{color:"#6b7280",marginTop:5}}>You are all caught up.</div>
      </div>}
      {!loading&&!error&&items.length>0&&<div style={{display:"grid",gap:12}}>
        {items.map(item=>{
          const info=categoryInfo[item.category]||categoryInfo.general;
          return <div key={item.id} onClick={()=>void markRead(item.id,item.url||"")} style={{background:"#fff",borderRadius:16,padding:"16px",border:item.is_read?"1px solid #e5e7eb":"2px solid #dbeafe",boxShadow:"0 3px 12px rgba(0,0,0,.05)",cursor:item.url?"pointer":"default"}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:44,height:44,borderRadius:12,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{info.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontWeight:900,fontSize:16,color:"#111827"}}>{item.title||info.label}</div>
                  {!item.is_read&&<span style={{fontSize:11,fontWeight:900,color:"#1d4ed8",background:"#dbeafe",padding:"4px 7px",borderRadius:999,whiteSpace:"nowrap"}}>NEW</span>}
                </div>
                <div style={{fontSize:12,fontWeight:800,color:"#6b7280",marginTop:3}}>{info.label}</div>
                <div style={{fontSize:14,color:"#374151",lineHeight:1.5,marginTop:7,whiteSpace:"pre-wrap"}}>{item.message}</div>
                {item.authorized_at&&<div style={{fontSize:11,color:"#9ca3af",marginTop:8}}>{new Date(item.authorized_at).toLocaleString("en-IN")}</div>}
              </div>
            </div>
          </div>
        })}
      </div>}
    </div>
  </main>;
}
