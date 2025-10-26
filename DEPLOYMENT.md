# Vercel Deployment Guide

## Prerequisites
- A GitHub account
- A Vercel account (sign up at https://vercel.com)
- Your code pushed to a GitHub repository

## Step-by-Step Deployment Instructions

### 1. Push Your Code to GitHub

If you haven't already, initialize git and push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/jayanth922/Cal-Hacks-12.0.git
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: Visit https://vercel.com/new

2. **Import Your Repository**:
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository: `jayanth922/Cal-Hacks-12.0`
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Select "Other" (we have custom configuration)
   - **Root Directory**: Leave as `./` (root)
   - **Build Command**: `npm run build` (should auto-detect from vercel.json)
   - **Output Directory**: `dist/public` (should auto-detect from vercel.json)
   - **Install Command**: `npm install` (should auto-detect from vercel.json)

4. **Add Environment Variables**:
   Click on "Environment Variables" and add:
   
   ```
   VITE_DEEPGRAM_API_KEY=ddc39c60d2b7fb4e1dc23748c1add6ad0d26c639
   ASI_API_KEY=sk_93c8689998054112b8ee0eb61f72addb66b979820660452fbffeed017c28ac86
   NODE_ENV=production
   PORT=3000
   ```
   
   ⚠️ **Important**: Add these for all environments (Production, Preview, Development)

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete (usually 1-3 minutes)
   - Once done, you'll get a URL like: `https://your-project.vercel.app`

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? Y
   - Which scope? (select your account)
   - Link to existing project? N
   - What's your project's name? Cal-Hacks-12-0
   - In which directory is your code located? ./

4. **Add Environment Variables**:
   ```bash
   vercel env add VITE_DEEPGRAM_API_KEY
   vercel env add ASI_API_KEY
   vercel env add NODE_ENV
   vercel env add PORT
   ```
   
   Enter the values when prompted.

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### 3. Verify Deployment

1. Visit your Vercel URL
2. Test the Voice Agent feature
3. Check that the Deepgram API key is working
4. Verify all routes are accessible

### 4. Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify the build command works locally: `npm run build`

### Environment Variables Not Working
- Make sure you added them for the correct environment (Production)
- Redeploy after adding environment variables
- Check that variable names match exactly (case-sensitive)

### API Routes Not Working
- Verify `vercel.json` configuration is correct
- Check that the server code is being built properly
- Look at Function Logs in Vercel dashboard

### Database Connection Issues
- If using Neon or other databases, ensure connection strings are in environment variables
- Check that database allows connections from Vercel's IP ranges

## Important Notes

⚠️ **Security**: 
- Never commit `.env` files to Git
- Always use Vercel's environment variables feature
- Rotate API keys if they've been exposed

⚠️ **Database**:
- If you're using a database, make sure it's accessible from Vercel
- Consider using Vercel Postgres or Neon for serverless deployments

⚠️ **Cold Starts**:
- Serverless functions may have cold start delays
- First request after inactivity might be slower

## Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch (Production)
- Create preview deployments for Pull Requests
- Run builds and tests before deployment

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
