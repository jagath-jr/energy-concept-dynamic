# Energy Concept Web Application

This is the source code for the Energy Concept dynamic website. It is built using **Node.js**, **Express**, and **EJS**, with a JSON-based content management system (CMS).

## 🚀 Quick Start (Docker)
The easiest and most secure way to run this application is using Docker.

1.  **Configure Environment:**
    * Create a `.env` file in the root directory.
    * Add the required variables (see the **Configuration** section below).
2.  **Build & Run:**
    ```bash
    docker-compose up -d --build
    ```
3.  **Access:**
    * Website: `http://localhost:3000`
    * Admin Panel: `http://localhost:3000/admin`

---

## 🛠 Manual Installation
If you prefer to run it without Docker:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start Server:**
    ```bash
    npm start
    ```

---

## ⚙️ Configuration (Required)
The application requires the following environment variables in a `.env` file. 

**⚠️ SECURITY WARNING:** You MUST change the Admin and Session secrets for production.

| Variable | Description | Default (Dev Only) |
| :--- | :--- | :--- |
| `PORT` | Server Port | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `production` |
| `EMAIL_USER` | Gmail address for sending emails | *(None)* |
| `EMAIL_PASS` | Gmail App Password | *(None)* |
| `ADMIN_USER` | Username for Admin Panel | `admin` |
| `ADMIN_PASS` | Password for Admin Panel | `admin123` |
| `SESSION_SECRET` | Long random string to encrypt sessions | `dev-fallback...` |

---

## 🔐 Admin Panel Access
The website includes a CMS to edit text, images, and projects dynamically.

* **Login URL:** `/admin/login`
* **Credentials:** Configured in your `.env` file (see above).

## 📂 Project Structure
* **`/assets/data`**: Stores dynamic content (JSON files) and Resumes.
* **`/assets/images/uploads`**: Destination for images uploaded via Admin.
* **`/views`**: EJS HTML templates.
* **`/defaults`**: Backup JSON files to restore original content.

## 📝 Features
* **Dynamic CMS:** Edit Services, Projects, and Gallery via Admin Panel.
* **Security:** * **Rate Limiting:** Prevents email spam (Max 5 emails/hour per IP).
    * **Secure Sessions:** Uses HTTP-only cookies.
    * **CSP Headers:** Protects against XSS attacks.
* **Backup System:** Automatic JSON backups in `/assets/data/backups`.
* **Email Integration:** Contact forms and Job Applications via Nodemailer.

---

## ☁️ Production Deployment (VPS)
If deploying to a VPS (DigitalOcean, AWS, Linode), you **must** set the correct permissions for the upload folders so the Docker container can write to them.

**Run these commands on your VPS before starting Docker:**

```bash
# 1. Create storage folders
mkdir -p assets/data
mkdir -p assets/images/uploads

# 2. Set permissions (User ID 1000 is the 'node' user inside Docker)
chown -R 1000:1000 assets/