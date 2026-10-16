# 🚀 cPanel Git™ Version Control Deployment Guide

If your cPanel deployment says **"The deployment that you triggered on [Date] is queued..."** or stays stuck in the queue for a long time, here is why and how to fix it in 30 seconds!

---

## ❓ Why Does cPanel Git Deployment Get Queued or Hang?

When you click **"Deploy HEAD Commit"** in cPanel Git™ Version Control, cPanel runs `.cpanel.yml` in a background runner process.

cPanel deployment gets stuck or queued indefinitely if:
1. **`dist/` is missing in Git**: cPanel tries to run `npm install` or `npm run build` in the background. On shared cPanel hosting, building heavy Vite/Node.js apps runs out of memory (OOM) or hits time limits, causing the process to freeze in queue!
2. **Foreground `npm install` running**: Long-running `npm install` blocks cPanel's deployment queue lock.
3. **No `.htaccess` file**: Apache gives 404 on frontend routes like `/domain`, `/admin`, `/whatsapp-crm`, or `/hosting/cart`.

---

## ✅ How We Fixed It For You (Pre-Built Deployment)

We pre-compiled both **`dist/`** (frontend SPA) and **`backend/dist/`** (Node.js API) directly into the repository!

Now, when you push to Git or click "Deploy HEAD Commit" in cPanel:
* cPanel does **NOT** need to run `npm run build` or `npm install`.
* It simply copies `dist/` directly into `public_html/` in **2 seconds flat**!
* Deployment queue completes instantly!

---

## 🛠️ Step-by-Step Instructions for cPanel Setup

### Option A: Using cPanel Git™ Version Control (Automated)
1. In cPanel, navigate to **Git™ Version Control**.
2. Create or clone your repository (e.g. `https://github.com/your-org/hosting-portal`).
3. Go to the **Manage** tab for your repository.
4. Click **Deploy HEAD Commit**.
5. The `.cpanel.yml` file will automatically run `deploy.sh` and deploy:
   * Frontend static SPA to `~/public_html/`
   * Node.js API server to `~/backend_app/`

---

### Option B: Node.js App (cPanel Application Manager / Phusion Passenger)
If you run the full-stack Express API on cPanel:
1. Go to **Setup Node.js App** in cPanel.
2. Click **Create Application**.
3. Set parameters:
   * **Node.js version**: `18.x` or `20.x`
   * **Application mode**: `Production`
   * **Application root**: `backend_app` (or workspace root)
   * **Application URL**: `yourdomain.com/api` (or domain)
   * **Application startup file**: `server.js` or `dist/server.js`
4. Click **Create** & **Run JS build**.
5. Click **Restart Application**.

---

## 📄 Key Pre-Built Files Included in Repository
* **`.cpanel.yml`**: Deployment instruction file read by cPanel Git.
* **`deploy.sh`**: Instant 2-second deployment script.
* **`.htaccess` & `public/.htaccess`**: Apache rewrite rules for React Single Page App routing & proxying `/api/*` requests.
* **`dist/`**: Pre-built frontend bundle.
* **`backend/dist/`**: Pre-compiled backend Node.js API bundle.
* **`upload.php`**: Auxiliary PHP file uploader for cPanel setups.
