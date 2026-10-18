import{query as g,collection as i,where as m,getDocs as b,addDoc as p}from"./firebase-firestore.js";import{c,d as l,r as x}from"./index.js";async function f(n,r={}){const o=x();let s=n.startsWith("/")?n:`/${n}`;o.endsWith("/api")&&s.startsWith("/api/")&&(s=s.slice(4));const a=`${o}${s}`,e={"Content-Type":"application/json",...r.headers||{}};if(!e.Authorization&&typeof window<"u"&&c.currentUser)try{const d=await c.currentUser.getIdToken();d&&(e.Authorization=`Bearer ${d}`)}catch{}const t=await fetch(a,{...r,headers:e});if(!t.ok){const d=await t.json().catch(()=>({error:"Network error"}));throw new Error(d.error||`HTTP ${t.status}`)}return t.json()}const h=async(n,r,o)=>{const s=o.isVps||!!(o.hostname&&o.os),a=s?`🚀 Your Cloud VPS is Live & Ready! - ${o.hostname||o.serverIp||"Server"}`:`Your Service is Active! - ${o.domain||"Hosting"}`;let e="";if(s){const t=o.sshCommand||`ssh root@${o.serverIp||"YOUR_IP"}`;e=`
Hello,

Great news! Your Cloud VPS server has been deployed and is now live!

Server Details:
- Hostname: ${o.hostname||"N/A"}
- Primary IP: ${o.serverIp||"N/A"}
- Operating System: ${o.os||"Linux"}
- Datacenter: ${o.serverLocation||"Dhaka / Global"}
- Root Username: root
${o.rootPassword?`- Root Password: ${o.rootPassword}`:""}
- Quick SSH Connect: ${t}

You can also view your server details and management options directly from your Client Dashboard.

Thank you for choosing Click2IT!
    `.trim(),`${o.hostname||"N/A"}${o.serverIp||"N/A"}${o.os||"Linux"}${o.serverLocation||"Dhaka / Global"}`,o.rootPassword&&`${o.rootPassword}`,`${t}`}else e=`
Hello,

Great news! Your service for ${o.domain||"your recent order"} has been activated.

Here are your service details:
- Server IP: ${o.serverIp||"N/A"}
- Control Panel: ${o.controlPanelUrl||"N/A"}

Thank you for choosing us!
    `.trim(),e.replace(/\n/g,"<br>");try{const t=await f("/api/send-email",{method:"POST",body:JSON.stringify({to:r,subject:a,html:e.replace(/\n/g,"<br>")})});return await p(i(l,"emailLogs"),{orderId:n,customerEmail:r,subject:a,content:e,sentAt:new Date().toISOString(),status:t.success?"sent":"failed"}),t.success}catch(t){return console.error("Failed to send email:",t),await p(i(l,"emailLogs"),{orderId:n,customerEmail:r,subject:a,content:e,sentAt:new Date().toISOString(),status:"failed"}),!1}},w=async n=>{try{const r=g(i(l,"emailLogs"),m("orderId","==",n));return(await b(r)).docs.map(a=>({id:a.id,...a.data()})).sort((a,e)=>new Date(e.sentAt).getTime()-new Date(a.sentAt).getTime())}catch(r){return console.error("Failed to fetch email logs:",r),[]}},S=async({to:n,subject:r,html:o,attachments:s,category:a,orderId:e})=>{try{const t=await f("/api/send-email",{method:"POST",body:JSON.stringify({to:n,subject:r,html:o,attachments:s,category:a,orderId:e})});return{success:(t==null?void 0:t.success)??!0,message:t==null?void 0:t.message}}catch(t){return console.error("Failed to send email:",t),{success:!1,error:(t==null?void 0:t.message)||"Email delivery failed. Please verify SMTP settings."}}};export{S as a,w as g,h as s};
