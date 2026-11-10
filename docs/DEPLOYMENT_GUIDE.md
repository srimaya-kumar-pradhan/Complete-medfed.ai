# Complete-MedFed: Enterprise Cloud Deployment & Operations Guide

This guide provides the complete, step-by-step instructions for deploying the **Complete-MedFed** integrated platform to a high-availability, zero-cost, publicly accessible academic demonstration environment.

---

## 1. Target Deployment Architecture

The cloud infrastructure decouples client-facing presentation, compute-heavy deep learning inference, and relational persistence across three free-tier cloud platforms:

```mermaid
flowchart TD
    User["Clinician / Public User\n(Browser)"]
    
    subgraph Frontend_Cloud ["Cloudflare Pages (Global Edge CDN)"]
        CF["React 18 SPA + Vite\n(https://complete-medfed.pages.dev)\n• Custom Domain / SSL (HTTPS)\n• Client-Side Routing via _redirects"]
    end

    subgraph Backend_Cloud ["Hugging Face Spaces (Docker Runtime)"]
        HF["FastAPI Application Server (Port 7860)\n• 2 vCPUs • 16 GB RAM (Free Tier)\n• PyTorch CPU Optimized • Lifespan Pre-warming"]
        MLService["MLInferenceService Singleton\n• DenseNet121 Model (28.5 MB)\n• Grad-CAM Heatmap Engine\n• 14 NIH Pathology Classes"]
        HF --> MLService
    end

    subgraph Database_Cloud ["Supabase Cloud (Managed PostgreSQL)"]
        Supa[("PostgreSQL 15 Database\n• SSL Required • Connection Pooling\n• Users, Encounters, X-Ray Studies, Passports")]
    end

    User -->|HTTPS :443| CF
    CF -->|REST API Calls (Bearer JWT)| HF
    HF -->|Encrypted Pool Connection| Supa
    HF -->|Predictions & Heatmaps| CF
```

---

## 2. Cloud Allocation & Cost Architecture

The entire system is deployed on verified free-tier resources with **zero recurring infrastructure costs**:

| Component | Cloud Platform | Resource Tier | Key Constraints & Specifications |
| :--- | :--- | :--- | :--- |
| **Frontend** | Cloudflare Pages | Free Tier | Unlimited requests, 500 builds/month, global anycast CDN. |
| **Backend & ML** | Hugging Face Spaces | Free CPU Tier | 2 vCPUs, 16 GB RAM, 50 GB storage, non-root user UID 1000, Port 7860. |
| **Database** | Supabase | Free Tier | 500 MB PostgreSQL database, 2 projects, built-in connection pooler (PgBouncer). |
| **Model Hosting** | Bundled / HF Hub | Native Container | Bundled in container (28.5 MB) + optional HF Hub versioning. |
| **CI/CD** | GitHub Actions | Free Tier | 2,000 action minutes/month for automated build, test & deploy. |

> [!NOTE]
> **Free-Tier Inactivity Policies**:
> - **Hugging Face Spaces**: Sleeps after 48 hours of inactivity. The first request after sleep experiences a ~30–45 second container cold-start while FastAPI and DenseNet121 boot.
> - **Supabase**: Free projects pause after 7 consecutive days of inactivity. Simply logging into the Supabase dashboard unpauses the database instantly.

---

## 3. Account Setup Prerequisites

Before beginning, create free accounts on the following services (no credit card required):

1. **GitHub**: [github.com](https://github.com) (Source code repository).
2. **Cloudflare**: [dash.cloudflare.com](https://dash.cloudflare.com) (Frontend hosting).
3. **Hugging Face**: [huggingface.co](https://huggingface.co) (Backend container hosting).
4. **Supabase**: [supabase.com](https://supabase.com) (Managed PostgreSQL).

---

## 4. Step-by-Step Deployment Instructions

### Phase A: Configure the Supabase Database

1. **Create Project**:
   - Log in to [Supabase](https://supabase.com).
   - Click **New Project**.
   - Set Name to: `medfed-database`.
   - Set Database Password (save this securely).
   - Choose the AWS region closest to your Hugging Face Space (e.g. `US East (N. Virginia)` or `EU Central (Frankfurt)`).
   - Select the **Free Tier** and click **Create new project**.

2. **Retrieve Connection String**:
   - Navigate to **Project Settings** (gear icon) -> **Database**.
   - Scroll down to the **Connection string** section.
   - Select the **URI** tab.
   - Choose **Transaction** mode (Port `6543`) or **Session** mode (Port `5432`).
   - Copy the URI, which looks like:
     ```text
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
     ```
   - Replace `[YOUR-PASSWORD]` with your actual database password.

> [!TIP]
> The backend application automatically runs `Base.metadata.create_all(bind=engine)` and seeds initial demonstration users on startup. You do **not** need to manually execute SQL scripts.

---

### Phase B: Deploy Backend & ML Inference to Hugging Face Spaces

1. **Create a New Space**:
   - Log in to [Hugging Face](https://huggingface.co).
   - Click your profile picture -> **New Space** (or visit [huggingface.co/new-space](https://huggingface.co/new-space)).
   - **Space name**: `medfed-backend` (or similar).
   - **Space SDK**: Select **Docker** -> **Blank**.
   - **Space Hardware**: Select **CPU Basic • 2 vCPU • 16 GB • Free**.
   - **Visibility**: Select **Public** (or Private if restricted access is desired).
   - Click **Create Space**.

2. **Configure Environment Variables & Secrets**:
   - In your newly created Space, navigate to **Settings** -> **Variables and secrets**.
   - Under **Secrets** (encrypted values), add:
     - `DATABASE_URL`: Your Supabase connection string from Phase A (ensure `sslmode=require` is present).
     - `SECRET_KEY`: A 64-character random string (e.g. `openssl rand -hex 32`).
     - `JWT_SECRET`: A 64-character random string.
   - Under **Variables** (plain text values), add:
     - `ENVIRONMENT`: `production`
     - `DEBUG`: `false`
     - `PORT`: `7860`
     - `MEDFED_MODEL_PATH`: `model-artifacts/best_global_model.pth`
     - `MEDFED_DEVICE`: `cpu`
     - `CORS_ORIGINS`: `*` *(or your Cloudflare Pages domain once created)*

3. **Deploy the Code to Hugging Face**:
   - **Option 1 (Direct Git Remote)**:
     You can push the repository directly to your Hugging Face Space's Git remote:
     ```bash
     # Add the Hugging Face Space as a secondary git remote
     git remote add space https://huggingface.co/spaces/<YOUR-USERNAME>/medfed-backend
     
     # Push the main branch to Hugging Face
     git push space main:main --force
     ```
   - **Option 2 (Automated GitHub Action)**:
     Add your `HF_TOKEN` (Access Token with Write permission from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)) and `HF_SPACE_REPO` (`your-username/medfed-backend`) to your GitHub Repository Secrets. The `.github/workflows/ci-cd.yml` workflow will automatically build and deploy on every push!

4. **Verify Space Health**:
   - Watch the build logs in the Hugging Face **App** tab.
   - Once the build status turns **Running**, open the public API URL:
     `https://<your-username>-medfed-backend.hf.space/health`
   - It should return:
     ```json
     {
       "status": "healthy",
       "service": "dori-medfed-unified-api",
       "database_connected": true,
       "ml_model_loaded": true
     }
     ```
   - Note down this URL: `https://<your-username>-medfed-backend.hf.space`.

---

### Phase C: Deploy Frontend to Cloudflare Pages

1. **Create Cloudflare Pages Project**:
   - Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
   - In the sidebar, navigate to **Compute (Workers & Pages)** -> **Overview** -> **Create application** -> **Pages** -> **Connect to Git**.
   - Select your GitHub account and choose the repository `srimaya-kumar-pradhan/Complete-medfed.ai`.
   - Click **Begin setup**.

2. **Configure Build Settings**:
   - **Project name**: `complete-medfed` (or any custom name).
   - **Production branch**: `main`.
   - **Framework preset**: Select **Vite**.
   - **Root directory**: `healthcare-application/frontend`.
   - **Build command**: `npm run build`.
   - **Build output directory**: `dist`.

3. **Configure Environment Variables**:
   - Expand the **Environment variables (advanced)** section.
   - Add the following variable:
     - **Variable name**: `VITE_API_BASE_URL`
     - **Value**: `https://<your-username>-medfed-backend.hf.space` *(your Hugging Face Space URL from Phase B)*
   - Click **Save and Deploy**.

4. **Verify Frontend**:
   - Cloudflare Pages will build the frontend and output a public URL:
     `https://complete-medfed.pages.dev`
   - Test navigating to the URL.
   - Try refreshing on sub-routes like `/workstation` or `/login` — the `public/_redirects` file ensures the SPA router handles navigation without 404 errors.

---

## 5. End-to-End Verification Checklist

Run through this verification sequence to certify the deployment:

1. **System Health Check**:
   - Navigate to `https://<backend-url>/health`.
   - Confirm `"database_connected": true` and `"ml_model_loaded": true`.

2. **Model Status API**:
   - Navigate to `https://<backend-url>/api/v1/ml/status`.
   - Verify `"status": "online"` and `"weights_path": "model-artifacts/best_global_model.pth"`.

3. **User Authentication**:
   - Open your deployed frontend website (`https://<project-name>.pages.dev`).
   - Log in with the pre-seeded clinical credentials:
     - **Username**: `medical_officer@dori.gov.in`
     - **Password**: `Admin@123456`
   - Confirm successful authentication and redirection to the Medical Officer Dashboard.

4. **Medical Imaging Workstation**:
   - Open the **Chest X-Ray Workstation** tab.
   - Verify the model status badge displays: **Fed-FibAvg Global • CPU • 14 Classes**.
   - Upload a test chest X-ray image (or select a pre-loaded sample).
   - Click **Run MedFed Analysis**.
   - Verify:
     - Multi-label pathology predictions are displayed with exact percentages.
     - Grad-CAM heatmap renders with toggle buttons (`Original`, `Overlay`, `Heatmap`).
     - Electronic clinician review can be submitted and persisted to Supabase.

---

## 6. Troubleshooting Common Deployment Issues

### Issue 1: CORS Error in Browser Console (`Access-Control-Allow-Origin`)
- **Root Cause**: The backend Space has not allowlisted the Cloudflare Pages domain.
- **Resolution**:
  - In your Hugging Face Space Settings -> **Variables and secrets**, update `CORS_ORIGINS` to include your exact Cloudflare URL: `https://complete-medfed.pages.dev`.
  - Alternatively, set `CORS_ORIGINS=*` during demonstration mode.
  - Restart the Hugging Face Space.

### Issue 2: Supabase SSL Connection Error (`SSL SYSCALL error` or `no pg_hba.conf entry`)
- **Root Cause**: Missing SSL configuration in PostgreSQL connection URI.
- **Resolution**: Ensure your `DATABASE_URL` ends with `?sslmode=require`. The backend code automatically sanitizes `postgres://` to `postgresql://` and enforces SSL for remote hosts.

### Issue 3: Container Exceeds Memory or Build Timeout on Hugging Face
- **Root Cause**: Standard PyTorch wheel includes 2.5 GB of CUDA binaries.
- **Resolution**: The project Dockerfile is pre-configured with `--index-url https://download.pytorch.org/whl/cpu`, reducing wheel size to ~180 MB and memory footprint to <500 MB.

### Issue 4: 404 Not Found on Cloudflare Pages Page Refresh
- **Root Cause**: Missing SPA rewrite rule for HTML5 client-side history API.
- **Resolution**: Verified present in `healthcare-application/frontend/public/_redirects` (`/*  /index.html  200`).

---

## 7. Security & Compliance Declarations

- **Academic Demonstration Only**: This deployment is configured as a research and educational demonstration platform. Predictions are decision-support outputs and do not constitute autonomous clinical diagnoses.
- **PHI Protection**: No identifiable protected health information (PHI) is transmitted or stored. All clinical records in the demonstration database are synthetic.
- **Differential Privacy**: Model weights were trained using Opacus DP-SGD and Prime-DP parameter obfuscation across isolated hospital nodes without centralizing raw medical images.
