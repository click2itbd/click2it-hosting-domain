import{query as x,collection as i,where as b,getDocs as m,addDoc as c}from"./firebase-firestore-B2zgnHWy.js";import{e as f,r as u,d as l}from"./index-BtKQpIcl.js";async function g(a,n={}){const o=u();let s=a.startsWith("/")?a:`/${a}`;o.endsWith("/api")&&s.startsWith("/api/")&&(s=s.slice(4));const d=`${o}${s}`,t={"Content-Type":"application/json",...n.headers||{}};if(!t.Authorization&&typeof window<"u"&&f.currentUser)try{const r=await f.currentUser.getIdToken();r&&(t.Authorization=`Bearer ${r}`)}catch{}const e=await fetch(d,{...n,headers:t});if(!e.ok){const r=await e.json().catch(()=>({error:"Network error"}));throw new Error(r.error||`HTTP ${e.status}`)}return e.json()}const w=async(a,n,o)=>{const s=o.isVps||!!(o.hostname&&o.os),d=s?`🚀 Your Cloud VPS is Live & Ready! - ${o.hostname||o.serverIp||"Server"}`:`Your Service is Active! - ${o.domain||"Hosting"}`;let t="",e="";if(s){const r=o.sshCommand||`ssh root@${o.serverIp||"YOUR_IP"}`;t=`
Hello,

Great news! Your Cloud VPS server has been deployed and is now live!

Server Details:
- Hostname: ${o.hostname||"N/A"}
- Primary IP: ${o.serverIp||"N/A"}
- Operating System: ${o.os||"Linux"}
- Datacenter: ${o.serverLocation||"Dhaka / Global"}
- Root Username: root
${o.rootPassword?`- Root Password: ${o.rootPassword}`:""}
- Quick SSH Connect: ${r}

You can also view your server details and management options directly from your Client Dashboard.

Thank you for choosing Click2IT!
    `.trim(),e=`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 24px; border-radius: 8px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px;">🚀 Cloud VPS Server Activated</h2>
          <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 13px;">Your dedicated virtual server instance is ready</p>
        </div>
        <p style="color: #374151; font-size: 15px;">Hello,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Great news! Your dedicated Cloud VPS instance is online and assigned to your account. Below are your connection details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Hostname</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><strong>${o.hostname||"N/A"}</strong></td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Server IP Address</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><strong style="color: #2563eb;">${o.serverIp||"N/A"}</strong></td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Operating System</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${o.os||"Linux"}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Datacenter Location</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${o.serverLocation||"Dhaka / Global"}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Root Username</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><code>root</code> (or Administrator)</td></tr>
          ${o.rootPassword?`<tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Root Password</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${o.rootPassword}</code></td></tr>`:""}
        </table>

        <div style="background-color: #0f172a; color: #22c55e; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 16px 0;">
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 4px;"># SSH Command (Linux/macOS terminal or PowerShell):</div>
          ${r}
        </div>

        <p style="font-size: 13px; color: #6b7280;">You can log in to your <a href="https://click2it.bd/dashboard" style="color: #4f46e5; font-weight: bold;">Client Dashboard</a> to manage your services and invoices.</p>
        <p style="font-size: 14px; color: #374151; margin-top: 24px;">Thank you for choosing Click2IT!</p>
      </div>
    `}else t=`
Hello,

Great news! Your service for ${o.domain||"your recent order"} has been activated.

Here are your service details:
- Domain / Service: ${o.domain||"Active Service"}
- Server IP: ${o.serverIp||"Auto-Assigned"}
- Control Panel: ${o.controlPanelUrl||"https://cpanel.click2it.bd"}

Thank you for choosing Click2IT!
    `.trim(),e=`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%); padding: 24px; border-radius: 8px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🎉 Service Activated & Ready</h2>
          <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px;">Your hosting & domain service is now fully active</p>
        </div>
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Great news! Your service for <strong>${o.domain||"your recent order"}</strong> is now fully configured and ready for use.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Service / Domain</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${o.domain||"Hosting Package"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Server IP</td>
            <td style="padding: 10px 14px; color: #2563eb; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${o.serverIp||"Auto-Assigned"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569;">Control Panel</td>
            <td style="padding: 10px 14px; color: #0f172a;"><a href="${o.controlPanelUrl||"https://cpanel.click2it.bd"}" style="color: #2563eb; font-weight: 600; text-decoration: none;" target="_blank">${o.controlPanelUrl||"Access Control Panel"}</a></td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="https://click2it.bd/account/services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Manage in Client Dashboard</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px;">
          <p style="margin: 0 0 4px 0;">Click2IT BD &bull; Premium Hosting & Domain Solutions</p>
          <p style="margin: 0;">Need support? Contact us at info@click2itbd.com</p>
        </div>
      </div>
    `;try{const r=await g("/api/send-email",{method:"POST",body:JSON.stringify({to:n,subject:d,html:e||t.replace(/\n/g,"<br>"),orderId:a})});return await c(i(l,"emailLogs"),{orderId:a,customerEmail:n,recipient:n,subject:d,content:t,sentAt:new Date().toISOString(),timestamp:new Date().toISOString(),status:r.success?"sent":"failed"}),r.success}catch{return await c(i(l,"emailLogs"),{orderId:a,customerEmail:n,recipient:n,subject:d,content:t,sentAt:new Date().toISOString(),timestamp:new Date().toISOString(),status:"failed"}),!1}},S=async a=>{try{const n=x(i(l,"emailLogs"),b("orderId","==",a));return(await m(n)).docs.map(d=>{const t=d.data();let e=new Date;const r=t.sentAt||t.timestamp||t.createdAt;if(r)if(typeof(r==null?void 0:r.toDate)=="function")e=r.toDate();else if(r!=null&&r.seconds)e=new Date(r.seconds*1e3);else{const p=new Date(r);isNaN(p.getTime())||(e=p)}return{id:d.id,orderId:t.orderId||a,customerEmail:t.customerEmail||t.recipient||t.to||"",subject:t.subject||"Order Notification",content:t.content||t.body||(t.error?`Error: ${t.error}`:t.status==="sent"?"Email notification sent successfully to customer.":"Delivery failed."),sentAt:e.toISOString(),status:t.status||"sent"}}).sort((d,t)=>new Date(t.sentAt).getTime()-new Date(d.sentAt).getTime())}catch{return[]}},v=async({to:a,subject:n,html:o,attachments:s,category:d,orderId:t})=>{try{const e=await g("/api/send-email",{method:"POST",body:JSON.stringify({to:a,subject:n,html:o,attachments:s,category:d,orderId:t})});return{success:(e==null?void 0:e.success)??!0,message:e==null?void 0:e.message}}catch(e){return{success:!1,error:(e==null?void 0:e.message)||"Email delivery failed. Please verify SMTP settings."}}};export{w as a,S as g,v as s};
