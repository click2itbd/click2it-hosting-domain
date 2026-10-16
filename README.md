1: <div align="center">
2: <img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
3: </div>
4: 
5: # Run and deploy your AI Studio app
6: 
7: This contains everything you need to run your app locally.
8: 
9: View your app in AI Studio: https://ai.studio/apps/422fbad2-d827-4e69-8599-aed85390d277
10: 
11: ## Run Locally
12: 
13: **Prerequisites:**  Node.js
14: 
15: 
16: 1. Install dependencies:
17:    `npm install`
18: 2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
19: 3. Run the app:
20:    `npm run dev`
21: 
22: ## ⚠️ Before deploying to production
23: 
24: Run the deploy safety check to ensure `VITE_DEV_BYPASS` is not enabled:
25: 
26: ```bash
27: npm run predeploy:check
28: ```
29: 
30: If `VITE_DEV_BYPASS=true` is set in `.env.local`, the build will fail. This flag bypasses admin authentication during local development and must never be active in production, otherwise the admin panel will be publicly accessible.
