# 🚀 Deploying to GitHub Pages

This guide will help you deploy your clicker game to GitHub Pages for free!

## Quick Start (Automatic Deployment)

### Step 1: Push to GitHub

```bash
# If you haven't already, create a repo on GitHub and push your code
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin master
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
4. That's it! The workflow will automatically deploy on every push to master

### Step 3: Wait for Deployment

- Go to the **Actions** tab in your repository
- You should see the "Deploy to GitHub Pages" workflow running
- Wait for it to complete (usually 1-2 minutes)
- Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## Manual Deployment (Alternative)

If you prefer to deploy manually:

### Step 1: Build the Project

```bash
npm run build
```

This creates a `dist/` folder with your production-ready game.

### Step 2: Test Locally (Optional)

```bash
npm run preview
```

Open http://localhost:4173 to test the production build locally.

### Step 3: Deploy to GitHub Pages

You can use the built-in deploy script (after editing it):

1. Edit `package.json` and replace `USERNAME/REPO` in the deploy script
2. Run: `npm run deploy`

Or deploy manually:

```bash
# Navigate to dist folder
cd dist

# Initialize git and push to gh-pages branch
git init
git add -A
git commit -m 'Deploy'
git push -f git@github.com:YOUR-USERNAME/YOUR-REPO-NAME.git main:gh-pages
```

### Step 4: Configure GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: gh-pages / (root)
3. Click **Save**

## 🎮 Play Your Game!

After deployment completes, your game will be available at:

**https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/**

## 📝 Notes

- **First deployment** might take 5-10 minutes
- **Subsequent deployments** are usually faster (1-2 minutes)
- The site **automatically rebuilds** every time you push to the master branch
- Your game data is **saved in the browser's localStorage**, so players can continue their progress
- The game works 100% client-side - no server needed!

## 🐛 Troubleshooting

### Site not loading?

1. Check the Actions tab - make sure the workflow succeeded
2. Check Settings → Pages - make sure it's enabled
3. Try accessing it in incognito mode (to bypass cache)
4. Wait a few minutes - GitHub Pages can take time to propagate

### Assets not loading?

Make sure `vite.config.js` has `base: './'` (relative paths)

### Want a custom domain?

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. Add a `CNAME` file to the `public/` folder with your domain
3. Configure DNS settings to point to GitHub Pages
4. See: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## 🔧 Development vs Production

- **Development**: `npm run dev` - runs at http://localhost:5173
- **Production**: `npm run build` then `npm run preview` - test at http://localhost:4173
- **Deploy**: Push to GitHub - automatically builds and deploys

## 📊 Analytics (Optional)

You can add Google Analytics or similar by editing `index.html` and adding the tracking code.

## 🎉 Share Your Game!

Once deployed, share your game URL with friends!

Example: `https://yourusername.github.io/clicker-game/`

## Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
