const fs = require('fs-extra');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

// 1. Where the active data lives
const DATA_DIR = path.join(__dirname, 'assets/data');

// 2. Where we store the previous version (for Undo)
const BACKUP_DIR = path.join(__dirname, 'assets/data/backups');

// 3. Where the factory settings live
const DEFAULT_DIR = path.join(__dirname, 'defaults');

// Ensure these directories exist so the app doesn't crash
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(BACKUP_DIR);
// Note: We don't create DEFAULT_DIR automatically because you need to populate it manually.

// ==========================================
// FUNCTIONS
// ==========================================

/**
 * Reads a JSON file and returns the object.
 * Returns an empty object {} if file doesn't exist.
 */
const readData = (filename) => {
    const filePath = path.join(DATA_DIR, filename);
    try {
        if (fs.existsSync(filePath)) {
            return fs.readJsonSync(filePath);
        } else {
            // Try to auto-restore from defaults if main file is missing
            const defaultPath = path.join(DEFAULT_DIR, filename);
            if (fs.existsSync(defaultPath)) {
                console.log(`File ${filename} missing. Restoring from defaults...`);
                fs.copySync(defaultPath, filePath);
                return fs.readJsonSync(filePath);
            }
            return {};
        }
    } catch (err) {
        console.error(`Error reading ${filename}:`, err);
        return {};
    }
};

/**
 * Saves data to a JSON file.
 * AUTOMATICALLY BACKS UP the current version before saving (enabling Undo).
 */
const writeData = (filename, content) => {
    const filePath = path.join(DATA_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    try {
        // 1. Create a backup of the current state before overwriting
        if (fs.existsSync(filePath)) {
            fs.copySync(filePath, backupPath);
        }

        // 2. Write the new data
        fs.writeJsonSync(filePath, content, { spaces: 2 });
        return true;
    } catch (err) {
        console.error(`Error writing ${filename}:`, err);
        return false;
    }
};

/**
 * Reverts the file to the state stored in the 'backups' folder.
 */
const undoData = (filename) => {
    const filePath = path.join(DATA_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    try {
        if (fs.existsSync(backupPath)) {
            fs.copySync(backupPath, filePath);
            console.log(`Undid changes for ${filename}`);
            return true;
        } else {
            console.warn(`No backup found for ${filename}`);
            return false;
        }
    } catch (err) {
        console.error(`Error undoing ${filename}:`, err);
        return false;
    }
};

/**
 * Overwrites the current file with the one from the 'defaults' folder.
 */
const restoreDefault = (filename) => {
    const filePath = path.join(DATA_DIR, filename);
    const defaultPath = path.join(DEFAULT_DIR, filename);

    try {
        if (fs.existsSync(defaultPath)) {
            fs.copySync(defaultPath, filePath);
            console.log(`Restored defaults for ${filename}`);
            return true;
        } else {
            console.warn(`No default file found for ${filename}`);
            return false;
        }
    } catch (err) {
        console.error(`Error restoring ${filename}:`, err);
        return false;
    }
};

// Export functions to be used in server.js
module.exports = { 
    readData, 
    writeData, 
    undoData, 
    restoreDefault 
};