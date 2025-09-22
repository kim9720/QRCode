// Enhanced QR Code Generator & Scanner Pro - With localStorage
// Global Variables
let qrCode;
let scanner = null;
let isScanning = false;
let lastResult = '';
let currentQRData = '';
let batchQRCodes = [];
let history = [];
let favorites = [];
let stats = { generated: 0, scanned: 0, favorites: 0 };

// Settings object
let settings = {
    theme: 'light',
    defaultSize: 256,
    defaultFg: '#000000',
    defaultBg: '#ffffff',
    autoAction: true,
    saveScans: true,
    soundFeedback: false,
    historyLimit: 100
};

// localStorage keys
const STORAGE_KEYS = {
    HISTORY: 'qr_app_history',
    FAVORITES: 'qr_app_favorites',
    SETTINGS: 'qr_app_settings',
    STATS: 'qr_app_stats'
};

// localStorage Helper Functions
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showToast('Failed to save data locally', 'error');
        return false;
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function clearLocalStorage(key = null) {
    try {
        if (key) {
            localStorage.removeItem(key);
        } else {
            // Clear all app data
            Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        }
        return true;
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
        return false;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    setupEventListeners();
    setupDragDrop();
    
    // Set initial values from loaded settings
    document.getElementById('qr-size').value = settings.defaultSize;
    document.getElementById('fg-color').value = settings.defaultFg;
    document.getElementById('bg-color').value = settings.defaultBg;
    
    // Apply saved theme
    if (settings.theme) {
        document.body.setAttribute('data-theme', settings.theme);
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.innerHTML = settings.theme === 'dark' ? 
                '<span class="theme-icon">☀️</span>' : 
                '<span class="theme-icon">🌙</span>';
        }
    }
    
    showToast('Welcome to QR Code Generator & Scanner Pro!', 'info');
});

// Data Loading Functions
function loadAllData() {
    // Load history
    const savedHistory = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    if (Array.isArray(savedHistory)) {
        history = savedHistory;
    }
    
    // Load favorites
    const savedFavorites = loadFromLocalStorage(STORAGE_KEYS.FAVORITES, []);
    if (Array.isArray(savedFavorites)) {
        favorites = savedFavorites;
    }
    
    // Load settings
    const savedSettings = loadFromLocalStorage(STORAGE_KEYS.SETTINGS, {});
    if (savedSettings && typeof savedSettings === 'object') {
        settings = { ...settings, ...savedSettings };
    }
    
    // Load stats
    const savedStats = loadFromLocalStorage(STORAGE_KEYS.STATS, {});
    if (savedStats && typeof savedStats === 'object') {
        stats = { ...stats, ...savedStats };
    }
    
    loadStats();
    console.log('Data loaded from localStorage:', { history: history.length, favorites: favorites.length, stats });
}

function saveAllData() {
    saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
    saveToLocalStorage(STORAGE_KEYS.FAVORITES, favorites);
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
    saveToLocalStorage(STORAGE_KEYS.STATS, stats);
}

// Event Listeners Setup
function setupEventListeners() {
    // Enter key generation
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.activeElement.closest('#generator')) {
            generateQR();
        }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + G: Generate QR
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            generateQR();
        }
        
        // Ctrl/Cmd + S: Start/Stop Scanner
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (isScanning) {
                stopScanning();
            } else {
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab && activeTab.id === 'scanner') {
                    startScanning();
                }
            }
        }
        
        // Ctrl/Cmd + C: Copy result (when scanner is active)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && lastResult) {
            e.preventDefault();
            copyToClipboard();
        }
    });

    // Auto-save on page unload
    window.addEventListener('beforeunload', function() {
        saveAllData();
    });

    // Periodic auto-save every 30 seconds
    setInterval(saveAllData, 30000);
}

// Drag & Drop Setup
function setupDragDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                if (this.id === 'upload-scanner') {
                    scanUploadedImage(files[0]);
                } else if (this.id === 'batch-scanner') {
                    scanBatchImages(files);
                }
            }
        });
    });
}

// Theme Management
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    
    const themeBtn = document.getElementById('theme-btn');
    themeBtn.innerHTML = newTheme === 'dark' ? 
        '<span class="theme-icon">☀️</span>' : 
        '<span class="theme-icon">🌙</span>';
    
    // Save settings immediately
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
    
    showToast(`Switched to ${newTheme} theme`, 'info');
}

// Stats Management
function loadStats() {
    if (document.getElementById('total-generated')) {
        document.getElementById('total-generated').textContent = stats.generated;
        document.getElementById('total-scanned').textContent = stats.scanned;
        document.getElementById('total-favorites').textContent = stats.favorites;
    }
}

function updateStats(type) {
    stats[type]++;
    loadStats();
    // Save stats immediately
    saveToLocalStorage(STORAGE_KEYS.STATS, stats);
}

// Tab Management
function showTabEnhanced(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Stop scanner if switching away from scanner tab
    if (tabName !== 'scanner' && isScanning) {
        stopScanning();
    }
    
    // Initialize history display when switching to history tab
    if (tabName === 'history') {
        setTimeout(() => displayHistoryEnhanced(), 100);
    }
}

// QR Type Management
function changeQRType() {
    const qrType = document.getElementById('qr-type').value;
    
    // Hide all forms
    document.querySelectorAll('.input-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Show selected form
    const targetForm = document.getElementById(qrType + '-form');
    if (targetForm) {
        targetForm.classList.add('active');
    }
}

// QR Data Extraction Functions
function getQRData(type) {
    switch (type) {
        case 'text':
            return document.getElementById('text-input')?.value.trim();
            
        case 'url':
            const url = document.getElementById('url-input')?.value.trim();
            if (!url) return null;
            return url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
            
        case 'wifi':
            const ssid = document.getElementById('wifi-ssid')?.value.trim();
            const password = document.getElementById('wifi-password')?.value || '';
            const security = document.getElementById('wifi-security')?.value || 'WPA';
            const hidden = document.getElementById('wifi-hidden')?.checked || false;
            
            if (!ssid) return null;
            return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};`;
            
        case 'email':
            const to = document.getElementById('email-to')?.value.trim();
            const subject = document.getElementById('email-subject')?.value.trim() || '';
            const body = document.getElementById('email-body')?.value.trim() || '';
            
            if (!to) return null;
            return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
        case 'phone':
            const phone = document.getElementById('phone-number')?.value.trim();
            if (!phone) return null;
            return `tel:${phone}`;
            
        case 'sms':
            const smsNumber = document.getElementById('sms-number')?.value.trim();
            const message = document.getElementById('sms-message')?.value.trim() || '';
            
            if (!smsNumber) return null;
            return `sms:${smsNumber}?body=${encodeURIComponent(message)}`;
            
        case 'vcard':
            const name = document.getElementById('vcard-name')?.value.trim();
            const org = document.getElementById('vcard-org')?.value.trim() || '';
            const vcardPhone = document.getElementById('vcard-phone')?.value.trim() || '';
            const vcardEmail = document.getElementById('vcard-email')?.value.trim() || '';
            const website = document.getElementById('vcard-website')?.value.trim() || '';
            
            if (!name) return null;
            
            return `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:${org}
TEL:${vcardPhone}
EMAIL:${vcardEmail}
URL:${website}
END:VCARD`;
            
        default:
            return null;
    }
}

// QR Generation Functions
function generateQREnhanced() {
    const qrType = document.getElementById('qr-type').value;
    const qrData = getQRData(qrType);
    
    if (!qrData) {
        shakeInput();
        return;
    }
    
    currentQRData = qrData;
    const spinner = document.getElementById('spinner');
    const qrCodeDiv = document.getElementById('qrcode');
    const downloadBtns = document.getElementById('downloadBtns');
    
    spinner.style.display = 'block';
    qrCodeDiv.innerHTML = '';
    if (downloadBtns) downloadBtns.style.display = 'none';
    
    setTimeout(() => {
        try {
            if (qrCode) {
                qrCode.clear();
            }
            
            const size = getQRSize();
            const fgColor = document.getElementById('fg-color').value;
            const bgColor = document.getElementById('bg-color').value;
            
            qrCode = new QRCode(qrCodeDiv, {
                text: qrData,
                width: size,
                height: size,
                colorDark: fgColor,
                colorLight: bgColor,
                correctLevel: QRCode.CorrectLevel.H
            });
            
            setTimeout(() => {
                spinner.style.display = 'none';
                if (downloadBtns) downloadBtns.style.display = 'flex';
                
                // Save to history with complete data for regeneration
                const additionalData = gatherFormData(qrType);
                const historyItem = {
                    type: 'generated',
                    qrType: qrType,
                    data: qrData,
                    timestamp: Date.now(),
                    additionalData: additionalData
                };
                
                saveToHistoryWithStorage(historyItem);
                updateStats('generated');
                showToast('QR code generated successfully!', 'success');
            }, 100);
            
        } catch (error) {
            spinner.style.display = 'none';
            showToast('Error generating QR code: ' + error.message, 'error');
            console.error('QR Generation Error:', error);
        }
    }, 300);
}

function gatherFormData(qrType) {
    const formData = { qrType: qrType };
    
    switch (qrType) {
        case 'text':
            formData.text = document.getElementById('text-input')?.value || '';
            break;
            
        case 'url':
            formData.url = document.getElementById('url-input')?.value || '';
            break;
            
        case 'wifi':
            formData.ssid = document.getElementById('wifi-ssid')?.value || '';
            formData.password = document.getElementById('wifi-password')?.value || '';
            formData.security = document.getElementById('wifi-security')?.value || 'WPA';
            formData.hidden = document.getElementById('wifi-hidden')?.checked || false;
            break;
            
        case 'email':
            formData.to = document.getElementById('email-to')?.value || '';
            formData.subject = document.getElementById('email-subject')?.value || '';
            formData.body = document.getElementById('email-body')?.value || '';
            break;
            
        case 'phone':
            formData.number = document.getElementById('phone-number')?.value || '';
            break;
            
        case 'sms':
            formData.number = document.getElementById('sms-number')?.value || '';
            formData.message = document.getElementById('sms-message')?.value || '';
            break;
            
        case 'vcard':
            formData.name = document.getElementById('vcard-name')?.value || '';
            formData.org = document.getElementById('vcard-org')?.value || '';
            formData.phone = document.getElementById('vcard-phone')?.value || '';
            formData.email = document.getElementById('vcard-email')?.value || '';
            formData.website = document.getElementById('vcard-website')?.value || '';
            break;
    }
    
    // Also save customization settings
    formData.size = document.getElementById('qr-size')?.value || settings.defaultSize;
    formData.fgColor = document.getElementById('fg-color')?.value || settings.defaultFg;
    formData.bgColor = document.getElementById('bg-color')?.value || settings.defaultBg;
    
    return formData;
}

function getQRSize() {
    const size = parseInt(document.getElementById('qr-size').value);
    return Math.min(Math.max(size, 100), 1024);
}

function shakeInput() {
    const activeForm = document.querySelector('.input-form.active');
    if (activeForm) {
        const firstInput = activeForm.querySelector('input, textarea, select');
        
        if (firstInput) {
            firstInput.classList.add('shake');
            setTimeout(() => firstInput.classList.remove('shake'), 500);
            firstInput.focus();
        }
    }
    
    showToast('Please fill in the required fields', 'error');
}

// Download Functions
function downloadImage(format = 'png') {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        showToast('No QR code to download', 'error');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.download = `qrcode.${format}`;
        
        if (format === 'jpg') {
            // Convert to JPG with white background
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            
            link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
        } else {
            link.href = canvas.toDataURL(`image/${format}`);
        }
        
        link.click();
        showToast(`QR code downloaded as ${format.toUpperCase()}`, 'success');
    } catch (error) {
        showToast('Error downloading QR code: ' + error.message, 'error');
        console.error('Download Error:', error);
    }
}

// Scanner Functions
function switchScannerMode(mode) {
    // Update active button
    document.querySelectorAll('.scanner-mode').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Hide all scanner sections
    document.querySelectorAll('.scanner-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(mode + '-scanner');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Stop camera if switching away
    if (mode !== 'camera' && isScanning) {
        stopScanning();
    }
}

function startScanning() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    
    updateStatus('Starting camera...', 'scanning');

    try {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        scanner = new Html5QrcodeScanner("reader", config, false);

        scanner.render(
            function(decodedText, decodedResult) {
                handleScanSuccess(decodedText, decodedResult);
            },
            function(error) {
                // Only log actual errors, not "no QR code found"
                if (!error.includes('No QR code found') && !error.includes('QR code parse error')) {
                    console.log('Scan error:', error);
                }
            }
        );

        isScanning = true;
        updateStatus('Point camera at QR code', 'scanning');
    } catch (error) {
        console.error('Scanner start error:', error);
        updateStatus('Failed to start camera', 'error');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        showToast('Could not access camera: ' + error.message, 'error');
    }
}

function stopScanning() {
    if (scanner) {
        scanner.clear().catch(console.error);
        scanner = null;
    }
    
    isScanning = false;
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    updateStatus('Scanner stopped', 'ready');
}

function handleScanSuccess(decodedText, decodedResult) {
    lastResult = decodedText;
    const resultDiv = document.getElementById('result');
    const copyBtn = document.getElementById('copy-btn');
    const actionBtn = document.getElementById('action-btn');
    
    if (resultDiv) {
        resultDiv.innerHTML = `<div class="result-text">${escapeHtml(decodedText)}</div>`;
    }
    
    if (copyBtn) copyBtn.disabled = false;
    
    updateStatus('QR code scanned successfully!', 'success');
    
    // Save to history if enabled
    if (settings.saveScans) {
        const historyItem = {
            type: 'scanned',
            data: decodedText,
            format: decodedResult.format,
            timestamp: Date.now()
        };
        
        saveToHistoryWithStorage(historyItem);
    }
    
    // Check for smart action
    if (actionBtn && (isUrl(decodedText) || isEmail(decodedText) || isPhone(decodedText))) {
        actionBtn.style.display = 'inline-block';
        actionBtn.disabled = false;
        
        if (settings.autoAction) {
            setTimeout(() => performSmartAction(), 1000);
        }
    } else if (actionBtn) {
        actionBtn.style.display = 'none';
    }
    
    updateStats('scanned');
    
    if (settings.soundFeedback) {
        playSuccessSound();
    }
}

function scanUploadedImage(file) {
    if (!file && event && event.target && event.target.files) {
        file = event.target.files[0];
    }
    
    if (!file) {
        showToast('No file selected', 'error');
        return;
    }
    
    updateStatus('Scanning uploaded image...', 'scanning');
    
    try {
        const html5QrCode = new Html5Qrcode("reader");
        
        html5QrCode.scanFile(file, true)
            .then(decodedText => {
                handleScanSuccess(decodedText, { format: 'QR_CODE' });
                html5QrCode.clear();
            })
            .catch(err => {
                updateStatus('No QR code found in image', 'error');
                const resultDiv = document.getElementById('result');
                if (resultDiv) {
                    resultDiv.innerHTML = '<div class="no-result">No QR code found in the uploaded image</div>';
                }
                html5QrCode.clear();
                console.log('Image scan error:', err);
            });
    } catch (error) {
        updateStatus('Error scanning image', 'error');
        showToast('Error scanning image: ' + error.message, 'error');
        console.error('Image scan error:', error);
    }
}

function scanBatchImages(files) {
    if (!files && event && event.target && event.target.files) {
        files = event.target.files;
    }
    
    if (!files || files.length === 0) {
        showToast('No files selected', 'error');
        return;
    }
    
    const resultsDiv = document.getElementById('batch-scan-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.className = 'batch-scan-results';
    }
    
    updateStatus(`Scanning ${files.length} images...`, 'scanning');
    
    let processedCount = 0;
    
    Array.from(files).forEach((file, index) => {
        try {
            const html5QrCode = new Html5Qrcode(`temp-reader-${index}`);
            
            html5QrCode.scanFile(file, true)
                .then(decodedText => {
                    addBatchScanResult(file.name, decodedText, true);
                    
                    if (settings.saveScans) {
                        const historyItem = {
                            type: 'scanned',
                            data: decodedText,
                            source: file.name,
                            timestamp: Date.now()
                        };
                        
                        saveToHistoryWithStorage(historyItem);
                    }
                    
                    updateStats('scanned');
                    html5QrCode.clear();
                    
                    processedCount++;
                    if (processedCount === files.length) {
                        updateStatus(`Processed ${files.length} images`, 'success');
                    }
                })
                .catch(err => {
                    addBatchScanResult(file.name, 'No QR code found', false);
                    html5QrCode.clear();
                    
                    processedCount++;
                    if (processedCount === files.length) {
                        updateStatus(`Processed ${files.length} images`, 'success');
                    }
                });
        } catch (error) {
            addBatchScanResult(file.name, 'Error processing file', false);
            processedCount++;
            if (processedCount === files.length) {
                updateStatus(`Processed ${files.length} images`, 'success');
            }
        }
    });
}

function addBatchScanResult(filename, result, success) {
    const resultsDiv = document.getElementById('batch-scan-results');
    if (!resultsDiv) return;
    
    const div = document.createElement('div');
    div.className = 'batch-scan-item';
    
    div.innerHTML = `
        <h5>${escapeHtml(filename)}</h5>
        <div class="batch-scan-result ${success ? 'success' : 'error'}">
            ${escapeHtml(result)}
        </div>
    `;
    
    resultsDiv.appendChild(div);
}

// Scanner Utility Functions
function copyToClipboard() {
    if (!lastResult) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastResult).then(function() {
            updateStatus('Copied to clipboard!', 'success');
            showToast('Result copied to clipboard', 'success');
        }).catch(function(err) {
            console.error('Clipboard error:', err);
            fallbackCopyToClipboard();
        });
    } else {
        fallbackCopyToClipboard();
    }
}

function fallbackCopyToClipboard() {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = lastResult;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            updateStatus('Copied to clipboard!', 'success');
            showToast('Result copied to clipboard', 'success');
        } else {
            showToast('Failed to copy to clipboard', 'error');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

function performSmartAction() {
    if (!lastResult) return;
    
    try {
        if (isUrl(lastResult)) {
            window.open(lastResult, '_blank', 'noopener,noreferrer');
            showToast('Opening URL in new tab', 'success');
        } else if (isEmail(lastResult)) {
            window.location.href = lastResult;
            showToast('Opening email client', 'success');
        } else if (isPhone(lastResult)) {
            window.location.href = lastResult;
            showToast('Opening phone dialer', 'success');
        }
    } catch (error) {
        showToast('Could not perform action: ' + error.message, 'error');
        console.error('Smart action error:', error);
    }
}

function isUrl(text) {
    try {
        new URL(text);
        return true;
    } catch {
        return text.startsWith('http://') || text.startsWith('https://') || text.startsWith('www.');
    }
}

function isEmail(text) {
    return text.startsWith('mailto:') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isPhone(text) {
    return text.startsWith('tel:') || /^\+?[\d\s\-\(\)]+$/.test(text);
}

function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status status-${type}`;
    }
}

// History Management with localStorage
function saveToHistoryWithStorage(item) {
    // Enhanced data structure for better history tracking
    const historyItem = {
        id: Date.now() + Math.random(), // Unique ID
        type: item.type,
        data: item.data,
        timestamp: item.timestamp || Date.now(),
        qrType: item.qrType || null,
        source: item.source || null,
        format: item.format || null,
        // Store additional data for regeneration
        additionalData: item.additionalData || null
    };
    
    // Check if item already exists (avoid duplicates based on data and type)
    const exists = history.some(h => 
        h.data === historyItem.data && 
        h.type === historyItem.type && 
        Math.abs(h.timestamp - historyItem.timestamp) < 1000 // Within 1 second
    );
    
    if (exists) return;
    
    history.unshift(historyItem);
    
    // Apply history limit
    const limit = parseInt(settings.historyLimit);
    if (limit && limit > 0 && history.length > limit) {
        history = history.slice(0, limit);
    }
    
    // Save to localStorage
    saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
    
    console.log('History saved:', historyItem);
}

// Utility Functions
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function playSuccessSound() {
    try {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        // Ignore audio errors
        console.log('Audio not supported:', error);
    }
}

// Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `<div class="toast-content">${escapeHtml(message)}</div>`;
    
    container.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
    
    // Remove on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Error Handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showToast('An error occurred. Please try again.', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An error occurred. Please try again.', 'error');
});

// Page Visibility API to pause/resume scanner
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isScanning) {
        console.log('Page hidden, scanner paused');
    } else if (!document.hidden && isScanning) {
        console.log('Page visible, scanner resumed');
    }
});

// History and Settings Functions
function filterHistory(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayHistoryEnhanced(filter);
}

function displayHistoryEnhanced(filter = 'all') {
    const historyList = document.getElementById('history-list');
    if (!historyList) {
        console.warn('History list element not found');
        return;
    }
    
    const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || '';
    
    let filteredHistory = [...history]; // Create a copy
    
    // Apply filters
    if (filter === 'generated') {
        filteredHistory = filteredHistory.filter(item => item.type === 'generated');
    } else if (filter === 'scanned') {
        filteredHistory = filteredHistory.filter(item => item.type === 'scanned');
    } else if (filter === 'favorites') {
        filteredHistory = filteredHistory.filter(item => favorites.includes(item.data));
    }
    
    // Apply search
    if (searchTerm) {
        filteredHistory = filteredHistory.filter(item => 
            (item.data && item.data.toLowerCase().includes(searchTerm)) ||
            (item.qrType && item.qrType.toLowerCase().includes(searchTerm)) ||
            (item.source && item.source.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort by timestamp (newest first)
    filteredHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    if (filteredHistory.length === 0) {
        historyList.innerHTML = '<p class="no-history">No history items found</p>';
        return;
    }
    
    historyList.innerHTML = '';
    
    filteredHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const isFavorite = favorites.includes(item.data);
        const date = new Date(item.timestamp || Date.now()).toLocaleString();
        const displayType = item.qrType || item.type || 'unknown';
        
        // Find original index for operations
        const originalIndex = history.findIndex(h => h.id === item.id || 
            (h.data === item.data && h.timestamp === item.timestamp));
        
        div.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-type">${escapeHtml(displayType)}</span>
                <span class="history-item-date">${date}</span>
                ${item.source ? `<span class="history-item-source">${escapeHtml(item.source)}</span>` : ''}
            </div>
            <div class="history-item-content" title="${escapeHtml(item.data)}">
                ${truncateText(escapeHtml(item.data || ''), 100)}
            </div>
            <div class="history-item-actions">
                ${item.type === 'generated' ? 
                    `<button onclick="regenerateFromHistoryEnhanced(${originalIndex})" title="Regenerate">🔄 Regenerate</button>` : 
                    `<button onclick="generateFromScanned('${escapeHtml(item.data)}')" title="Generate QR">📱 Generate</button>`
                }
                <button onclick="copyHistoryItem('${escapeHtml(item.data)}')" title="Copy">📋 Copy</button>
                <button onclick="toggleFavoriteWithStorage('${escapeHtml(item.data)}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" class="${isFavorite ? 'favorite-btn active' : 'favorite-btn'}">
                    ${isFavorite ? '❤️ Unfavorite' : '🤍 Favorite'}
                </button>
                <button onclick="deleteHistoryItemWithStorage(${originalIndex})" title="Delete" class="danger-btn">🗑️ Delete</button>
            </div>
        `;
        
        historyList.appendChild(div);
    });
}

function generateFromScanned(data) {
    // Switch to generator tab
    const generatorTab = document.querySelector('[onclick="showTabEnhanced(\'generator\')"]') || 
                         document.querySelector('[onclick="showTab(\'generator\')"]');
    if (generatorTab) generatorTab.click();
    
    // Set text mode and fill data
    const qrTypeSelect = document.getElementById('qr-type');
    if (qrTypeSelect) {
        qrTypeSelect.value = 'text';
        changeQRType();
    }
    
    const textInput = document.getElementById('text-input');
    if (textInput) {
        textInput.value = data;
    }
    
    // Generate after a short delay
    setTimeout(() => generateQREnhanced(), 100);
}

function searchHistory() {
    const activeFilter = document.querySelector('.filter-btn.active')?.textContent.toLowerCase() || 'all';
    displayHistoryEnhanced(activeFilter === 'all' ? 'all' : activeFilter);
}

function regenerateFromHistoryEnhanced(index) {
    const item = history[index];
    if (!item) {
        showToast('History item not found', 'error');
        return;
    }
    
    // Switch to generator tab
    const generatorTab = document.querySelector('[onclick="showTabEnhanced(\'generator\')"]') || 
                         document.querySelector('[onclick="showTab(\'generator\')"]');
    if (generatorTab) generatorTab.click();
    
    if (item.type === 'generated' && item.qrType) {
        const qrTypeSelect = document.getElementById('qr-type');
        if (qrTypeSelect) {
            qrTypeSelect.value = item.qrType;
            changeQRType();
        }
        
        // Wait for form to load then fill it
        setTimeout(() => {
            fillFormFromHistoryItem(item);
            // Generate after filling
            setTimeout(() => generateQREnhanced(), 100);
        }, 100);
    } else {
        // For scanned items or simple text, use text form
        const qrTypeSelect = document.getElementById('qr-type');
        if (qrTypeSelect) {
            qrTypeSelect.value = 'text';
            changeQRType();
        }
        
        setTimeout(() => {
            const textInput = document.getElementById('text-input');
            if (textInput) {
                textInput.value = item.data;
            }
            // Generate after filling
            setTimeout(() => generateQREnhanced(), 100);
        }, 100);
    }
}

function validateHistory() {
    // Clean up invalid history items
    history = history.filter(item => {
        return item && 
               typeof item === 'object' && 
               item.data && 
               item.type && 
               typeof item.timestamp === 'number';
    });
    
    // Add missing IDs to old items
    history.forEach(item => {
        if (!item.id) {
            item.id = item.timestamp + Math.random();
        }
    });
    
    // Save cleaned history
    saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
    
    console.log('History validated:', history.length, 'items');
}

function initializeHistorySystem() {
    validateHistory();
    loadStats();
    
    // Display history if we're on the history tab
    const historyTab = document.getElementById('history');
    if (historyTab && historyTab.classList.contains('active')) {
        displayHistoryEnhanced();
    }
}

function fillFormFromHistoryItem(item) {
    if (!item.additionalData) {
        // Fallback for old history items
        const activeForm = document.querySelector('.input-form.active');
        if (activeForm) {
            const firstInput = activeForm.querySelector('input[type="text"], input[type="email"], input[type="tel"], textarea');
            if (firstInput) {
                firstInput.value = item.data;
            }
        }
        return;
    }
    
    const data = item.additionalData;
    
    // Fill form fields based on QR type
    switch (data.qrType) {
        case 'text':
            const textInput = document.getElementById('text-input');
            if (textInput) textInput.value = data.text || '';
            break;
            
        case 'url':
            const urlInput = document.getElementById('url-input');
            if (urlInput) urlInput.value = data.url || '';
            break;
            
        case 'wifi':
            const wifiSSID = document.getElementById('wifi-ssid');
            const wifiPassword = document.getElementById('wifi-password');
            const wifiSecurity = document.getElementById('wifi-security');
            const wifiHidden = document.getElementById('wifi-hidden');
            
            if (wifiSSID) wifiSSID.value = data.ssid || '';
            if (wifiPassword) wifiPassword.value = data.password || '';
            if (wifiSecurity) wifiSecurity.value = data.security || 'WPA';
            if (wifiHidden) wifiHidden.checked = data.hidden || false;
            break;
            
        case 'email':
            const emailTo = document.getElementById('email-to');
            const emailSubject = document.getElementById('email-subject');
            const emailBody = document.getElementById('email-body');
            
            if (emailTo) emailTo.value = data.to || '';
            if (emailSubject) emailSubject.value = data.subject || '';
            if (emailBody) emailBody.value = data.body || '';
            break;
            
        case 'phone':
            const phoneNumber = document.getElementById('phone-number');
            if (phoneNumber) phoneNumber.value = data.number || '';
            break;
            
        case 'sms':
            const smsNumber = document.getElementById('sms-number');
            const smsMessage = document.getElementById('sms-message');
            
            if (smsNumber) smsNumber.value = data.number || '';
            if (smsMessage) smsMessage.value = data.message || '';
            break;
            
        case 'vcard':
            const vcardName = document.getElementById('vcard-name');
            const vcardOrg = document.getElementById('vcard-org');
            const vcardPhone = document.getElementById('vcard-phone');
            const vcardEmail = document.getElementById('vcard-email');
            const vcardWebsite = document.getElementById('vcard-website');
            
            if (vcardName) vcardName.value = data.name || '';
            if (vcardOrg) vcardOrg.value = data.org || '';
            if (vcardPhone) vcardPhone.value = data.phone || '';
            if (vcardEmail) vcardEmail.value = data.email || '';
            if (vcardWebsite) vcardWebsite.value = data.website || '';
            break;
    }
    
    // Restore customization settings
    const qrSize = document.getElementById('qr-size');
    const fgColor = document.getElementById('fg-color');
    const bgColor = document.getElementById('bg-color');
    
    if (qrSize && data.size) qrSize.value = data.size;
    if (fgColor && data.fgColor) fgColor.value = data.fgColor;
    if (bgColor && data.bgColor) bgColor.value = data.bgColor;
}

function copyHistoryItem(data) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data).then(() => {
            showToast('Copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    } else {
        // Fallback
        try {
            const textArea = document.createElement('textarea');
            textArea.value = data;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Copied to clipboard', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    }
}

function toggleFavoriteWithStorage(data) {
    const index = favorites.indexOf(data);
    if (index === -1) {
        favorites.push(data);
        updateStats('favorites');
        showToast('Added to favorites', 'success');
    } else {
        favorites.splice(index, 1);
        stats.favorites = Math.max(0, stats.favorites - 1);
        loadStats();
        saveToLocalStorage(STORAGE_KEYS.STATS, stats);
        showToast('Removed from favorites', 'info');
    }
    
    // Save favorites to localStorage
    saveToLocalStorage(STORAGE_KEYS.FAVORITES, favorites);
    
    displayHistoryEnhanced();
}

function deleteHistoryItemWithStorage(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        history.splice(index, 1);
        saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
        displayHistoryEnhanced();
        showToast('Item deleted', 'info');
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        history = [];
        saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
        displayHistoryEnhanced();
        showToast('History cleared', 'info');
    }
}

function exportHistory() {
    const data = {
        history: history,
        favorites: favorites,
        stats: stats,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = 'qr_history_export.json';
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('History exported', 'success');
}

function importHistory() {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.history && Array.isArray(data.history)) {
                if (confirm('This will merge with your existing history. Continue?')) {
                    history = [...history, ...data.history];
                    saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
                    
                    if (data.favorites && Array.isArray(data.favorites)) {
                        favorites = [...new Set([...favorites, ...data.favorites])];
                        saveToLocalStorage(STORAGE_KEYS.FAVORITES, favorites);
                    }
                    
                    if (data.stats && typeof data.stats === 'object') {
                        stats = { ...stats, ...data.stats };
                        saveToLocalStorage(STORAGE_KEYS.STATS, stats);
                        loadStats();
                    }
                    
                    displayHistoryEnhanced();
                    showToast('History imported successfully', 'success');
                }
            } else {
                showToast('Invalid file format', 'error');
            }
        } catch (error) {
            showToast('Error importing file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function exportAllData() {
    const allData = {
        history: history,
        favorites: favorites,
        settings: settings,
        stats: stats,
        exportDate: new Date().toISOString(),
        version: '2.1'
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = 'qr_app_data_export.json';
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('All data exported', 'success');
}

function clearAllDataWithStorage() {
    const confirmation = prompt('This will delete ALL your data (history, favorites, settings). Type "DELETE" to confirm:');
    
    if (confirmation === 'DELETE') {
        history = [];
        favorites = [];
        settings = {
            theme: 'light',
            defaultSize: 256,
            defaultFg: '#000000',
            defaultBg: '#ffffff',
            autoAction: true,
            saveScans: true,
            soundFeedback: false,
            historyLimit: 100
        };
        stats = { generated: 0, scanned: 0, favorites: 0 };
        
        // Clear localStorage
        clearLocalStorage();
        
        // Save fresh data
        saveAllData();
        
        loadStats();
        displayHistoryEnhanced();
        
        showToast('All data cleared', 'success');
    } else {
        showToast('Data clear cancelled', 'info');
    }
}

function addToFavorites() {
    if (!currentQRData) {
        showToast('No QR code to favorite', 'error');
        return;
    }
    
    toggleFavoriteWithStorage(currentQRData);
}

// Settings Functions
function updateSettings() {
    // Get current form values
    const themeSelect = document.getElementById('theme-select');
    const defaultSizeInput = document.getElementById('default-size');
    const defaultFgInput = document.getElementById('default-fg');
    const defaultBgInput = document.getElementById('default-bg');
    const autoActionCheck = document.getElementById('auto-action');
    const saveScansCheck = document.getElementById('save-scans');
    const soundFeedbackCheck = document.getElementById('sound-feedback');
    const historyLimitInput = document.getElementById('history-limit');
    
    if (themeSelect) settings.theme = themeSelect.value;
    if (defaultSizeInput) settings.defaultSize = parseInt(defaultSizeInput.value) || 256;
    if (defaultFgInput) settings.defaultFg = defaultFgInput.value;
    if (defaultBgInput) settings.defaultBg = defaultBgInput.value;
    if (autoActionCheck) settings.autoAction = autoActionCheck.checked;
    if (saveScansCheck) settings.saveScans = saveScansCheck.checked;
    if (soundFeedbackCheck) settings.soundFeedback = soundFeedbackCheck.checked;
    if (historyLimitInput) settings.historyLimit = parseInt(historyLimitInput.value) || 100;
    
    // Save to localStorage
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
    
    showToast('Settings saved', 'success');
}

function loadSettings() {
    // Populate settings form with current values
    const themeSelect = document.getElementById('theme-select');
    const defaultSizeInput = document.getElementById('default-size');
    const defaultFgInput = document.getElementById('default-fg');
    const defaultBgInput = document.getElementById('default-bg');
    const autoActionCheck = document.getElementById('auto-action');
    const saveScansCheck = document.getElementById('save-scans');
    const soundFeedbackCheck = document.getElementById('sound-feedback');
    const historyLimitInput = document.getElementById('history-limit');
    
    if (themeSelect) themeSelect.value = settings.theme;
    if (defaultSizeInput) defaultSizeInput.value = settings.defaultSize;
    if (defaultFgInput) defaultFgInput.value = settings.defaultFg;
    if (defaultBgInput) defaultBgInput.value = settings.defaultBg;
    if (autoActionCheck) autoActionCheck.checked = settings.autoAction;
    if (saveScansCheck) saveScansCheck.checked = settings.saveScans;
    if (soundFeedbackCheck) soundFeedbackCheck.checked = settings.soundFeedback;
    if (historyLimitInput) historyLimitInput.value = settings.historyLimit;
}

function resetSettings() {
    if (confirm('Reset all settings to default values?')) {
        settings = {
            theme: 'light',
            defaultSize: 256,
            defaultFg: '#000000',
            defaultBg: '#ffffff',
            autoAction: true,
            saveScans: true,
            soundFeedback: false,
            historyLimit: 100
        };
        
        saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
        loadSettings();
        
        // Apply theme
        document.body.setAttribute('data-theme', settings.theme);
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.innerHTML = '<span class="theme-icon">🌙</span>';
        }
        
        showToast('Settings reset to defaults', 'success');
    }
}

// Utility function for truncating text
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Override original functions with enhanced versions
    window.generateQR = generateQREnhanced;
    window.displayHistory = displayHistoryEnhanced;
    window.regenerateFromHistory = regenerateFromHistoryEnhanced;
    window.showTab = showTabEnhanced;
    window.toggleFavorite = toggleFavoriteWithStorage;
    window.deleteHistoryItem = deleteHistoryItemWithStorage;
    window.clearAllData = clearAllDataWithStorage;
    
    // Initialize the history system
    initializeHistorySystem();
    
    console.log('Enhanced QR App with localStorage initialized');
});