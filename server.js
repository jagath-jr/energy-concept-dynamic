require('dotenv').config(); // Load environment variables
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit'); // [NEW] Anti-spam package

// ==========================================
// 1. CONFIGURATION & PATHS
// ==========================================
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'assets', 'data');
const DEFAULTS_DIR = path.join(__dirname, 'defaults');
const BACKUP_DIR = path.join(__dirname, 'assets', 'data', 'backups');

const MAX_BACKUP_FILES = 20;

// ==========================================
// 2. MIDDLEWARE
// ==========================================

// [NEW] REQUIRED FOR VPS: Tell Express it's behind a proxy (Nginx)
// This ensures 'req.secure' works correctly for secure cookies
app.set('trust proxy', 1);

// [NEW] Rate Limiter: Max 5 emails per hour from the same IP
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, 
    message: { success: false, message: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Security Header (CSP) ---
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "connect-src 'self' https://cdn.jsdelivr.net; " + 
        "script-src 'self' 'unsafe-inline' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.emailjs.com; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
        "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
        "img-src 'self' data:;"
    );
    next();
});

// Set EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- SECURE SESSION SETUP ---

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-fallback-secret-key-98765', // Load from .env
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: isProduction, // Secure: true only works on HTTPS (Production)
        httpOnly: true,       // Prevents client-side JS from stealing the cookie
        maxAge: 3600000       // 1 hour
    }
}));

// ==========================================
// 3. FILE HANDLING & UTILS
// ==========================================

// --- General Image Upload Config ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'images', 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/\s+/g, '-').toLowerCase();
        cb(null, Date.now() + '-' + cleanName);
    }
});

// [SECURITY FIX] Filter to ensure only images are uploaded
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Security Warning: Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: imageFilter 
});

// --- Helper Functions ---
function readData(filename) {
    if (!filename.endsWith('.json')) filename += '.json';
    try {
        const filePath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath);
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Error reading ${filename}:`, err);
        return {}; 
    }
}

function writeData(filename, data) {
    if (!filename.endsWith('.json')) filename += '.json';
    
    // 1. Create Backup
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const filePath = path.join(DATA_DIR, filename);
        if (fs.existsSync(filePath)) {
            const oldData = fs.readFileSync(filePath);
            fs.writeFileSync(path.join(BACKUP_DIR, `${Date.now()}-${filename}`), oldData);
        }
    } catch (e) { console.log("Backup skipped: " + e.message); }

    // 2. Save New Data
    try {
        fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Write Error:", e);
        throw e;
    }
}

function cleanupBackups() {
    console.log('Running backup cleanup (Max 20 files)...');
    if (!fs.existsSync(BACKUP_DIR)) return;

    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return;

        const backupFiles = files
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                const timeA = parseInt(a.split('-')[0]);
                const timeB = parseInt(b.split('-')[0]);
                return timeB - timeA; 
            });

        if (backupFiles.length > MAX_BACKUP_FILES) {
            const filesToDelete = backupFiles.slice(MAX_BACKUP_FILES);
            filesToDelete.forEach(file => {
                const filePath = path.join(BACKUP_DIR, file);
                fs.unlink(filePath, () => {});
            });
            console.log(`Cleanup complete. Kept ${MAX_BACKUP_FILES} latest files.`);
        }
    });
}

// ==========================================
// 4. PUBLIC ROUTES
// ==========================================

app.use((req, res, next) => {
    res.locals.global = readData('global');
    next();
});

app.get('/', (req, res) => {
    const homeData = readData('index');
    let services = readData('services'); 
    const projects = readData('ongoing-project-data');
    if (!Array.isArray(services)) services = [];

    res.render('index', { 
        home: homeData, 
        services: services.slice(0, 5), 
        projects: projects 
    });
});

app.get('/about', (req, res) => {
    res.render('about', { content: readData('about') });
});

app.get('/services', (req, res) => {
    res.render('services', { services: readData('services') });
});

app.get('/projects', (req, res) => {
    res.render('projects', { projects: readData('ongoing-project-data') });
});

app.get('/gallery', (req, res) => {
    res.render('gallery', { gallery: readData('gallery') });
});

app.get('/careers', (req, res) => {
    res.render('careers', { jobs: readData('job-vacancies') });
});

app.get('/contact', (req, res) => {
    res.render('contacts');
});

// ==========================================
// 5. ADMIN AUTH & ROUTES
// ==========================================

app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) return res.redirect('/admin');
    res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // [SECURITY FIX] Load credentials from .env
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123'; // Only works if .env is missing

    if (username === adminUser && password === adminPass) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('admin/login', { error: 'Invalid Username or Password' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

function isAdmin(req, res, next) {
    if (req.session.isAdmin) next();
    else res.redirect('/admin/login');
}

app.get('/admin', isAdmin, (req, res) => {
    res.render('admin/dashboard');
});

// ==========================================
// 6. EDITING ROUTES
// ==========================================

app.get('/admin/edit/:file', isAdmin, (req, res) => {
    const filename = req.params.file;
    const fileMap = { 'home': 'index', 'global': 'global', 'about': 'about' };
    const actualFile = fileMap[filename] || filename;
    res.render(`admin/edit-${filename}`, { data: readData(actualFile) });
});

app.post('/admin/save/object/:file', isAdmin, upload.any(), (req, res) => {
    const filename = req.params.file;
    const fileMap = { 'home': 'index', 'global': 'global', 'about': 'about' };
    const actualFile = fileMap[filename] || filename;
    let currentData = readData(actualFile);
    let newData = req.body;

    if (req.files && req.files.length > 0) {
        // 1. Handle backward compatibility for Global/About pages (single image)
        const singleImage = req.files.find(f => f.fieldname === 'image');
        if (singleImage) {
            const fieldName = req.body.imageField || 'image';
            newData[fieldName] = 'assets/images/uploads/' + singleImage.filename;
        }

        // 2. Handle multi-slide image uploads for the Home page
        if (filename === 'home' && newData.slides) {
            req.files.forEach(file => {
                if (file.fieldname.startsWith('slide_image_')) {
                    const slideIndex = file.fieldname.split('_')[2];
                    if (newData.slides[slideIndex]) {
                        newData.slides[slideIndex].image = 'assets/images/uploads/' + file.filename;
                    }
                }
            });
        }
    }

    // 3. Retain existing slide images if no new image was uploaded for a specific slide
    if (filename === 'home' && newData.slides && currentData.slides) {
        newData.slides.forEach((slide, index) => {
            // If the incoming slide doesn't have an image set, grab the old one
            if (!slide.image && currentData.slides[index] && currentData.slides[index].image) {
                slide.image = currentData.slides[index].image;
            }
        });
    }

    const updatedData = { ...currentData, ...newData };
    
    // Maintain social links mapping
    if(filename === 'global' && req.body.socialLinks) {
        updatedData.socialLinks = req.body.socialLinks;
    }

    try {
        writeData(actualFile, updatedData);
        res.redirect('/admin');
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Error saving data.");
    }
});
// ==========================================
// 7. FULL SERVICES MANAGEMENT ROUTES
// ==========================================

app.get('/admin/list/full-services', isAdmin, (req, res) => {
    const services = readData('services');
    res.render('admin/list-full-services', { list: services });
});

app.post('/admin/services/add-category', isAdmin, upload.single('image'), (req, res) => {
    const services = readData('services');
    const newCategory = {
        id: req.body.id || 'service-' + Date.now(),
        mainService: req.body.mainService,
        mainDescription: req.body.mainDescription,
        categoryIcon: req.file ? 'assets/images/uploads/' + req.file.filename : '',
        subParts: [] 
    };
    services.push(newCategory);
    writeData('services', services);
    res.redirect('/admin/list/full-services');
});

app.post('/admin/services/delete-category/:index', isAdmin, (req, res) => {
    const services = readData('services');
    const index = parseInt(req.params.index);
    if (index >= 0 && index < services.length) {
        services.splice(index, 1);
        writeData('services', services);
    }
    res.redirect('/admin/list/full-services');
});

app.post('/admin/services/add-sub/:catIndex', isAdmin, upload.single('image'), (req, res) => {
    const services = readData('services');
    const catIndex = parseInt(req.params.catIndex);
    if (catIndex >= 0 && catIndex < services.length) {
        const newSub = {
            title: req.body.title,
            desc: req.body.desc,
            img: req.file ? 'assets/images/uploads/' + req.file.filename : 'assets/images/titleimg.png',
            alt: req.body.title
        };
        if (!services[catIndex].subParts) services[catIndex].subParts = [];
        services[catIndex].subParts.push(newSub);
        writeData('services', services);
    }
    res.redirect('/admin/list/full-services');
});

app.post('/admin/services/delete-sub/:catIndex/:subIndex', isAdmin, (req, res) => {
    const services = readData('services');
    const catIndex = parseInt(req.params.catIndex);
    const subIndex = parseInt(req.params.subIndex);
    if (catIndex >= 0 && catIndex < services.length) {
        if (services[catIndex].subParts && subIndex >= 0 && subIndex < services[catIndex].subParts.length) {
            services[catIndex].subParts.splice(subIndex, 1);
            writeData('services', services);
        }
    }
    res.redirect('/admin/list/full-services');
});

// ==========================================
// 8. GENERIC LIST MANAGEMENT
// ==========================================

app.get('/admin/list/:type', isAdmin, (req, res) => {
    const type = req.params.type;
    const fileMap = { 
        'services': 'services-data', 
        'projects': 'ongoing-project-data',
        'careers': 'job-vacancies',
        'gallery': 'gallery'
    };
    res.render(`admin/list-${type}`, { list: readData(fileMap[type]) });
});

app.post('/admin/add/:type', isAdmin, upload.single('image'), (req, res) => {
    const type = req.params.type;
    const fileMap = { 
        'services': 'services-data', 
        'projects': 'ongoing-project-data',
        'careers': 'job-vacancies',
        'gallery': 'gallery'
    };
    const actualFile = fileMap[type];
    let list = readData(actualFile);
    let newItem = req.body;
    newItem.id = Date.now().toString();

    if (req.file) {
        const imgPath = 'assets/images/uploads/' + req.file.filename;
        if(type === 'gallery') newItem.src = imgPath;
        else newItem.image = imgPath;
    }
    if(type === 'careers' && newItem.description) {
        newItem.description = newItem.description.split('\n').filter(line => line.trim() !== '');
    }
    list.push(newItem);
    writeData(actualFile, list);
    res.redirect(`/admin/list/${type}`);
});

app.post('/admin/delete/:type/:index', isAdmin, (req, res) => {
    const type = req.params.type;
    const index = parseInt(req.params.index);
    const fileMap = { 
        'services': 'services-data', 
        'projects': 'ongoing-project-data',
        'careers': 'job-vacancies',
        'gallery': 'gallery'
    };
    const actualFile = fileMap[type];
    let list = readData(actualFile);
    if (index >= 0 && index < list.length) {
        list.splice(index, 1);
        writeData(actualFile, list);
    }
    res.redirect(`/admin/list/${type}`);
});

// ==========================================
// 9. UNDO & RESTORE ROUTES
// ==========================================

app.post('/admin/undo/:file', isAdmin, (req, res) => {
    const filename = req.params.file;
    if (!fs.existsSync(BACKUP_DIR)) return res.redirect('back');
    
    try {
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.includes(filename))
            .sort()
            .reverse();

        if (backups.length > 0) {
            const latestBackup = backups[0];
            const backupPath = path.join(BACKUP_DIR, latestBackup);
            const targetFile = filename.endsWith('.json') ? filename : filename + '.json';
            const dataPath = path.join(DATA_DIR, targetFile);
            
            fs.copyFileSync(backupPath, dataPath);
            fs.unlinkSync(backupPath); 
            res.redirect('back');
        } else {
            res.redirect('back');
        }
    } catch (err) {
        console.error("Undo Error:", err);
        res.status(500).send("Error restoring backup. Check server logs.");
    }
});

app.post('/admin/restore/:file', isAdmin, (req, res) => {
    const filename = req.params.file;
    const targetFile = filename.endsWith('.json') ? filename : filename + '.json';
    const defaultPath = path.join(DEFAULTS_DIR, targetFile);
    const dataPath = path.join(DATA_DIR, targetFile);

    try {
        if (fs.existsSync(defaultPath)) {
            fs.copyFileSync(defaultPath, dataPath);
            res.redirect('back');
        } else {
            res.status(404).send(`Default file not found: ${targetFile}`);
        }
    } catch (err) {
        console.error("Restore Default Error:", err);
        res.status(500).send("Error restoring default file.");
    }
});

// ==========================================
// 10. EMAIL SENDING (Nodemailer)
// ==========================================

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// [NEW] Added 'emailLimiter' middleware to this route
app.post('/send-email', emailLimiter, (req, res) => {
    const { name, phone, email, service, message, pageSource } = req.body;
    const globalData = readData('global');
    const recipientEmail = globalData.email || process.env.EMAIL_USER; 

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail, 
        subject: `⚡ New Inquiry: ${name} via ${pageSource || 'Website'}`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #004e92 0%, #000428 100%); color: #ffffff; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                .content { padding: 30px; color: #333333; line-height: 1.6; }
                .field { margin-bottom: 20px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px; }
                .field-label { font-weight: bold; color: #004e92; font-size: 14px; text-transform: uppercase; display: block; margin-bottom: 5px; }
                .field-value { font-size: 16px; color: #555555; }
                .message-box { background-color: #f9f9f9; padding: 15px; border-left: 5px solid #28a745; border-radius: 4px; font-style: italic; }
                .footer { background-color: #eeeeee; text-align: center; padding: 20px; font-size: 12px; color: #888888; }
                .btn { display: inline-block; background-color: #28a745; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Energy Concept</h1>
                    <p>New Website Inquiry</p>
                </div>
                <div class="content">
                    <p>Hello Admin,</p>
                    <p>You have received a new message from the <strong>${pageSource || 'Website'}</strong> contact form.</p>
                    <div class="field"><span class="field-label">Name</span><span class="field-value">${name}</span></div>
                    <div class="field"><span class="field-label">Phone</span><span class="field-value"><a href="tel:${phone}" style="color: #004e92; text-decoration: none;">${phone}</a></span></div>
                    <div class="field"><span class="field-label">Email</span><span class="field-value"><a href="mailto:${email}" style="color: #004e92; text-decoration: none;">${email}</a></span></div>
                    <div class="field"><span class="field-label">Interested Service</span><span class="field-value">${service}</span></div>
                    <div class="field"><span class="field-label">Message</span><div class="field-value message-box">"${message}"</div></div>
                    <div style="text-align: center;"><a href="mailto:${email}?subject=Re: Your Inquiry to Energy Concept" class="btn">Reply via Email</a></div>
                </div>
                <div class="footer">
                    <p>This email was sent automatically from your website.</p>
                    <p>&copy; ${new Date().getFullYear()} Energy Concept. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Error sending email' });
        } else {
            console.log('Email sent: ' + info.response);
            res.json({ success: true, message: 'Email sent successfully!' });
        }
    });
});

// ==========================================
// 11. JOB APPLICATION ROUTE (Upload -> Send -> Delete)
// ==========================================

const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'data', 'resumes');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/\s+/g, '-').toLowerCase();
        cb(null, `resume-${Date.now()}-${cleanName}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and Word documents are allowed!'), false);
    }
};

const uploadResume = multer({ 
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// [NEW] Added 'emailLimiter' middleware to this route
app.post('/send-application', emailLimiter, uploadResume.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a valid PDF or Word Resume.' });
    }

    const { name, email, phone, position, message } = req.body;
    const globalData = readData('global');
    const recipientEmail = globalData.email || process.env.EMAIL_USER;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `🚀 Job Application: ${position} - ${name}`,
        attachments: [
            {
                filename: req.file.originalname,
                path: req.file.path
            }
        ],
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f2f5; margin: 0; padding: 0; }
                .container { max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
                .header-icon { font-size: 40px; margin-bottom: 10px; display: block; }
                .header h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 1px; }
                .header p { margin: 5px 0 0; opacity: 0.8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
                .content { padding: 40px; color: #444; }
                .candidate-card { background-color: #f8f9fa; border-left: 5px solid #1abc9c; padding: 20px; border-radius: 4px; margin-bottom: 25px; }
                .info-row { margin-bottom: 12px; display: flex; flex-direction: column; }
                .label { font-size: 12px; text-transform: uppercase; color: #7f8c8d; font-weight: bold; margin-bottom: 4px; }
                .value { font-size: 16px; color: #2c3e50; font-weight: 500; }
                .message-section { margin-top: 30px; }
                .message-content { background-color: #fff; border: 1px solid #e1e4e8; padding: 20px; border-radius: 8px; font-style: italic; color: #555; }
                .footer { background-color: #2c3e50; color: #ecf0f1; text-align: center; padding: 20px; font-size: 12px; }
                .attachment-notice { background-color: #e8f8f5; color: #16a085; padding: 10px; text-align: center; border-radius: 6px; font-weight: bold; margin-top: 20px; border: 1px solid #1abc9c; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><span class="header-icon">💼</span><h1>New Job Application</h1><p>Talent Acquisition Team</p></div>
                <div class="content">
                    <p>Hello HR Team,</p><p>A new candidate has applied for the position of <strong>${position}</strong>.</p>
                    <div class="candidate-card">
                        <div class="info-row"><span class="label">Candidate Name</span><span class="value">${name}</span></div>
                        <div class="info-row"><span class="label">Email Address</span><span class="value"><a href="mailto:${email}" style="color:#1abc9c; text-decoration:none;">${email}</a></span></div>
                        <div class="info-row"><span class="label">Phone Number</span><span class="value">${phone}</span></div>
                        <div class="info-row"><span class="label">Position Applied For</span><span class="value" style="color:#e74c3c;">${position}</span></div>
                    </div>
                    ${message ? `<div class="message-section"><div class="label">Cover Letter / Message</div><div class="message-content">"${message}"</div></div>` : ''}
                    <div class="attachment-notice">📎 The candidate's Resume is attached to this email.</div>
                </div>
                <div class="footer">&copy; ${new Date().getFullYear()} Energy Concept Recruitment System</div>
            </div>
        </body>
        </html>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting resume file:', unlinkErr);
            });
        }

        if (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Error sending application.' });
        } else {
            console.log('Application sent: ' + info.response);
            res.json({ success: true, message: 'Application sent successfully!' });
        }
    });
});

// ==========================================
// 12. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Panel at http://localhost:${PORT}/admin`);
    cleanupBackups();
});