import{query as g,collection as i,where as u,getDocs as b,addDoc as p}from"./firebase-firestore-ttcx093a.js";import{c as f,d as l,r as x}from"./index-CmNoRELo.js";async function m(a,s={}){const o=x();let d=a.startsWith("/")?a:`/${a}`;o.endsWith("/api")&&d.startsWith("/api/")&&(d=d.slice(4));const n=`${o}${d}`,t={"Content-Type":"application/json",...s.headers||{}};if(!t.Authorization&&typeof window<"u"&&f.currentUser)try{const r=await f.currentUser.getIdToken();r&&(t.Authorization=`Bearer ${r}`)}catch{}const e=await fetch(n,{...s,headers:t});if(!e.ok){const r=await e.json().catch(()=>({error:"Network error"}));throw new Error(r.error||`HTTP ${e.status}`)}return e.json()}const w=async(a,s,o)=>{const d=o.isVps||!!(o.hostname&&o.os),n=d?`🚀 Your Cloud VPS is Live & Ready! - ${o.hostname||o.serverIp||"Server"}`:`Your Service is Active! - ${o.domain||"Hosting"}`;let t="";if(d){const e=o.sshCommand||`ssh root@${o.serverIp||"YOUR_IP"}`;t=`
Hello,

Great news! Your Cloud VPS server has been deployed and is now live!

Server Details:
- Hostname: ${o.hostname||"N/A"}
- Primary IP: ${o.serverIp||"N/A"}
- Operating System: ${o.os||"Linux"}
- Datacenter: ${o.serverLocation||"Dhaka / Global"}
- Root Username: root
${o.rootPassword?`- Root Password: ${o.rootPassword}`:""}
- Quick SSH Connect: ${e}

You can also view your server details and management options directly from your Client Dashboard.

Thank you for choosing Click2IT!
    `.trim(),`${o.hostname||"N/A"}${o.serverIp||"N/A"}${o.os||"Linux"}${o.serverLocation||"Dhaka / Global"}`,o.rootPassword&&`${o.rootPassword}`,`${e}`}else t=`
Hello,

Great news! Your service for ${o.domain||"your recent order"} has been activated.

Here are your service details:
- Server IP: ${o.serverIp||"N/A"}
- Control Panel: ${o.controlPanelUrl||"N/A"}

Thank you for choosing us!
    `.trim(),t.replace(/\n/g,"<br>");try{const e=await m("/api/send-email",{method:"POST",body:JSON.stringify({to:s,subject:n,html:t.replace(/\n/g,"<br>")})});return await p(i(l,"emailLogs"),{orderId:a,customerEmail:s,subject:n,content:t,sentAt:new Date().toISOString(),status:e.success?"sent":"failed"}),e.success}catch(e){return console.error("Failed to send email:",e),await p(i(l,"emailLogs"),{orderId:a,customerEmail:s,subject:n,content:t,sentAt:new Date().toISOString(),status:"failed"}),!1}},S=async a=>{try{const s=g(i(l,"emailLogs"),u("orderId","==",a));return(await b(s)).docs.map(n=>{const t=n.data();let e=new Date;const r=t.sentAt||t.timestamp||t.createdAt;if(r)if(typeof(r==null?void 0:r.toDate)=="function")e=r.toDate();else if(r!=null&&r.seconds)e=new Date(r.seconds*1e3);else{const c=new Date(r);isNaN(c.getTime())||(e=c)}return{id:n.id,orderId:t.orderId||a,customerEmail:t.customerEmail||t.recipient||t.to||"",subject:t.subject||"Order Notification",content:t.content||t.body||(t.error?`Error: ${t.error}`:t.status==="sent"?"Email notification sent successfully to customer.":"Delivery failed."),sentAt:e.toISOString(),status:t.status||"sent"}}).sort((n,t)=>new Date(t.sentAt).getTime()-new Date(n.sentAt).getTime())}catch(s){return console.error("Failed to fetch email logs:",s),[]}},$=async({to:a,subject:s,html:o,attachments:d,category:n,orderId:t})=>{try{const e=await m("/api/send-email",{method:"POST",body:JSON.stringify({to:a,subject:s,html:o,attachments:d,category:n,orderId:t})});return{success:(e==null?void 0:e.success)??!0,message:e==null?void 0:e.message}}catch(e){return console.error("Failed to send email:",e),{success:!1,error:(e==null?void 0:e.message)||"Email delivery failed. Please verify SMTP settings."}}};export{$ as a,S as g,w as s};
