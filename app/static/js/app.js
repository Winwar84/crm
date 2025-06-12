// API Base URL
const API_BASE = '/api';

// Global variables
let tickets = [];
let agents = [];
let currentUser = null;

// Global current agent
let currentAgent = null;

// Auto-refresh variables
let autoRefreshInterval = null;
let currentTicketId = null;

// ===== SECURITY FUNCTIONS =====
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function sanitizeForAttribute(text) {
    if (text == null) return '';
    return String(text).replace(/[<>"'&]/g, function(match) {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        }[match];
    });
}

// ===== LOGOUT PROTECTION SYSTEM =====
let logoutProtectionEnabled = true;
let authorizedLogout = false;
let sessionProtected = true;
let logoutAttempts = 0;
let maxLogoutAttempts = 3;
let hasUnsavedChanges = false;
let isFormDirty = false;

// Prevent accidental page closure/refresh
function initLogoutProtection() {
    // Prevent accidental tab closing ONLY when there are unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (sessionProtected && !authorizedLogout && (hasUnsavedChanges || isFormDirty)) {
            e.preventDefault();
            e.returnValue = 'Hai modifiche non salvate. Sei sicuro di voler uscire?';
            return e.returnValue;
        }
        // No warning for simple navigation when no unsaved changes
    });
    
    // Prevent browser back/forward navigation logout
    window.addEventListener('popstate', function(e) {
        if (sessionProtected) {
            e.preventDefault();
            history.pushState(null, null, window.location.pathname);
            showNotification('Usa il pulsante logout per uscire dal sistema', 'warning');
        }
    });
    
    // Override any programmatic navigation that might logout
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const originalReload = window.location.reload;
    
    window.location.assign = function(url) {
        if (sessionProtected && !authorizedLogout && (url.includes('/login') || url === '/')) {
            showLogoutConfirmation();
            return;
        }
        originalAssign.call(this, url);
    };
    
    window.location.replace = function(url) {
        if (sessionProtected && !authorizedLogout && (url.includes('/login') || url === '/')) {
            showLogoutConfirmation();
            return;
        }
        originalReplace.call(this, url);
    };
    
    window.location.reload = function() {
        if (sessionProtected && !authorizedLogout) {
            showLogoutConfirmation();
            return;
        }
        originalReload.call(this);
    };
    
    // Prevent localStorage token removal except through authorized logout
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
        if ((key === 'user_token' || key === 'current_user') && sessionProtected && !authorizedLogout) {
            logoutAttempts++;
            console.warn(`🚫 Tentativo di logout non autorizzato bloccato (${logoutAttempts}/${maxLogoutAttempts})`);
            
            if (logoutAttempts >= maxLogoutAttempts) {
                showNotification('⚠️ Troppi tentativi di logout non autorizzati! Sessione protetta.', 'error');
                // Extra security: increase protection level
                sessionProtected = true;
                logoutAttempts = 0;
            } else {
                showNotification('Logout non autorizzato! Usa il pulsante logout.', 'error');
            }
            return;
        }
        originalRemoveItem.call(this, key);
    };
    
    // Protect against console manipulation
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    // Monitor suspicious console activities
    console.log = function(...args) {
        if (args.some(arg => String(arg).includes('logout') || String(arg).includes('token'))) {
            console.warn('🚫 Suspicious console activity detected');
        }
        originalConsoleLog.apply(this, args);
    };
    
    // Session heartbeat to maintain connection
    setInterval(function() {
        if (sessionProtected && localStorage.getItem('user_token')) {
            // Send heartbeat to verify session is still valid
            fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                }
            }).catch(() => {
                // If heartbeat fails, show warning but don't auto-logout
                console.warn('⚠️ Session heartbeat failed - connection issues');
            });
        }
    }, 300000); // Every 5 minutes
    
    // Track form changes for unsaved work detection
    initFormChangeTracking();
    
    console.log('🛡️ Logout Protection System activated');
}

// Track form changes to detect unsaved work
function initFormChangeTracking() {
    // Track when forms become dirty
    document.addEventListener('input', function(e) {
        if (e.target.matches('input, textarea, select')) {
            const form = e.target.closest('form');
            const input = e.target;
            
            // Skip search inputs, filters, and other non-critical forms
            if (input.id && (
                input.id.includes('search') || 
                input.id.includes('Filter') ||
                input.id.includes('filter') ||
                input.type === 'search'
            )) {
                return;
            }
            
            // Skip forms with search-related classes
            if (form && (
                form.classList.contains('search-form') ||
                form.classList.contains('filter-form') ||
                form.id.includes('search') ||
                form.id.includes('filter')
            )) {
                return;
            }
            
            // Only mark dirty for actual data entry forms
            if (form && (
                form.id.includes('Form') || 
                form.id.includes('ticket') ||
                form.id.includes('customer') ||
                form.id.includes('agent')
            )) {
                markFormDirty();
            }
        }
    });
    
    // Clear dirty state when modal closes (assuming successful save)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close') || e.target.classList.contains('modal')) {
            // Small delay to allow save operations to complete
            setTimeout(clearFormDirty, 500);
        }
    });
}

// Mark form as having unsaved changes
function markFormDirty() {
    isFormDirty = true;
    hasUnsavedChanges = true;
    console.log('📝 Form marked as dirty - unsaved changes detected');
}

// Clear unsaved changes state
function clearFormDirty() {
    isFormDirty = false;
    hasUnsavedChanges = false;
    console.log('✅ Form state cleared - changes saved');
}

// Manual functions for specific operations
function setUnsavedChanges(state) {
    hasUnsavedChanges = state;
    if (!state) isFormDirty = false;
}

// Show logout confirmation modal
function showLogoutConfirmation() {
    // Prevent multiple modals
    const existingModal = document.querySelector('.logout-confirmation-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal logout-confirmation-modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    modal.style.backdropFilter = 'blur(15px)';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; text-align: center; animation: modalSlideIn 0.3s ease-out;">
            <div class="modal-header">
                <h2 style="color: var(--neon-magenta);">
                    <i class="fas fa-shield-alt"></i> Conferma Logout
                </h2>
            </div>
            <div class="modal-body">
                <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid #ff4757; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ff4757; margin-right: 8px;"></i>
                    <strong style="color: #ff4757;">ATTENZIONE</strong>
                </div>
                <p style="color: var(--text-primary); margin-bottom: 20px;">
                    Sei sicuro di voler uscire dal sistema CRM?
                </p>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 25px;">
                    Questa azione ti disconnetterà completamente dal sistema e dovrai rifare il login.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="cancelLogout()" class="btn secondary" style="min-width: 120px;">
                        <i class="fas fa-times"></i> Annulla
                    </button>
                    <button onclick="confirmLogout()" class="btn danger" style="min-width: 120px;">
                        <i class="fas fa-sign-out-alt"></i> Conferma Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add escape key listener
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            cancelLogout();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Add click outside to cancel (but require double click for safety)
    let clickCount = 0;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            clickCount++;
            if (clickCount === 1) {
                showNotification('Clicca di nuovo fuori dal modal per annullare', 'info');
                setTimeout(() => { clickCount = 0; }, 2000);
            } else {
                cancelLogout();
                document.removeEventListener('keydown', escapeHandler);
            }
        }
    });
    
    // Focus on cancel button for accessibility
    setTimeout(() => {
        const cancelBtn = modal.querySelector('.btn.secondary');
        if (cancelBtn) cancelBtn.focus();
    }, 100);
}

// Cancel logout and remove modal
function cancelLogout() {
    const modal = document.querySelector('.logout-confirmation-modal');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
    
    // Reset logout attempts counter on cancel
    logoutAttempts = Math.max(0, logoutAttempts - 1);
    
    showNotification('Logout annullato - sessione protetta', 'info');
    console.log('✅ Logout cancelled by user');
}

// Confirm logout - authorized way
function confirmLogout() {
    // Set authorization flags
    authorizedLogout = true;
    sessionProtected = false;
    
    const modal = document.querySelector('.logout-confirmation-modal');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
    
    // Log the authorized logout
    console.log('✅ Logout authorized by user');
    showNotification('Disconnessione autorizzata in corso...', 'info');
    
    // Add a small delay for UX
    setTimeout(() => {
        performSecureLogout();
    }, 500);
}

// Secure logout function
function performSecureLogout() {
    // Clear form dirty state (logout is intentional)
    clearFormDirty();
    
    // Clear all session data
    localStorage.removeItem('user_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('currentAgent');
    
    // Clear any other app-specific data
    sessionStorage.clear();
    
    // Stop any running intervals
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Show success message briefly
    showNotification('Logout completato con successo', 'success');
    
    // Redirect after brief delay
    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Close all modals immediately on page load
    closeAllModals();
    
    checkAuthentication();
    
    // Initialize logout protection system
    initLogoutProtection();
    
    // Initialize theme system
    initThemeSystem();
    
    // Initialize cyberpunk effects
    initCyberpunkEffects();
    
    // Set up logout button event listener
    setupLogoutButton();
    
    // Stop auto-refresh when user navigates away or closes page
    window.addEventListener('beforeunload', stopMessageAutoRefresh);
    window.addEventListener('pagehide', stopMessageAutoRefresh);
    
    // Push initial state to prevent back button logout
    history.pushState(null, null, window.location.pathname);
});

// Close all modals function
function closeAllModals() {
    console.log('🔄 Closing all modals on page load...');
    
    // List of all possible modal IDs across all pages
    const modalIds = [
        'editTicketModal',
        'newTicketModal', 
        'ticketDetailsModal',
        'newCustomerModal',
        'editCustomerModal',
        'customerDetailsModal',
        'newAgentModal',
        'editAgentModal',
        'agentDetailsModal',
        'approveUserModal',
        'emailSettingsModal',
        'smtpSettingsModal',
        'imapSettingsModal',
        'testEmailModal'
    ];
    
    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            console.log(`✅ Closed modal: ${modalId}`);
        }
    });
}

// ===== THEME SYSTEM =====
function initThemeSystem() {
    // Load saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Set up theme toggle button event listener
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        updateThemeToggleButton(savedTheme);
    }
}

function setTheme(theme) {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update toggle button
    updateThemeToggleButton(theme);
    
    console.log(`Theme set to: ${theme}`);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    console.log(`🎨 Theme toggle: ${currentTheme} → ${newTheme}`);
    
    setTheme(newTheme);
    updateThemeToggleButton(newTheme);
    
    // Show notification about theme change
    showNotification(`Switched to ${newTheme} theme`, 'info');
}

function updateThemeToggleButton(theme) {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    // Update button text and icon based on current theme
    if (theme === 'light') {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        themeToggle.setAttribute('title', 'Switch to dark theme');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        themeToggle.setAttribute('title', 'Switch to light theme');
    }
}

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

// ===== CYBERPUNK EFFECTS SYSTEM =====
function initCyberpunkEffects() {
    createFloatingParticles();
    enhanceLoadingAnimations();
    addInteractiveElements();
    initSoundEffects();
    initSystemHUD();
    initCyberClock();
}

// Create floating particles background
function createFloatingParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    // Create 50 particles
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random positioning
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';
        
        particlesContainer.appendChild(particle);
    }
}

// Enhanced loading animations
function enhanceLoadingAnimations() {
    // Override original showNotification with cyberpunk style
    const originalShowNotification = window.showNotification;
    window.showNotification = function(message, type = 'info') {
        // Create enhanced notification
        const notification = document.createElement('div');
        notification.className = `notification ${type} slide-up`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="notification-icon">${getNotificationIcon(type)}</div>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add sound effect
        playNotificationSound(type);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };
}

// Get icon for notification type
function getNotificationIcon(type) {
    const icons = {
        success: '<i class="fas fa-check-circle" style="color: var(--neon-green);"></i>',
        error: '<i class="fas fa-exclamation-triangle" style="color: #ff4757;"></i>',
        info: '<i class="fas fa-info-circle" style="color: var(--neon-cyan);"></i>',
        warning: '<i class="fas fa-exclamation-circle" style="color: var(--neon-yellow);"></i>'
    };
    return icons[type] || icons.info;
}

// Add interactive elements
function addInteractiveElements() {
    // Add glow effect to important buttons
    const importantButtons = document.querySelectorAll('.btn.primary, .btn.success');
    importantButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.animation = 'buttonGlow 0.3s ease-out forwards';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.animation = '';
        });
    });
    
    // Add matrix rain effect on specific events (optional)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            toggleMatrixRain();
        }
    });
}

// Initialize sound effects (optional, can be disabled)
function initSoundEffects() {
    // Create audio context for subtle UI sounds
    window.audioEnabled = localStorage.getItem('audio_enabled') !== 'false';
    
    if (window.audioEnabled) {
        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play notification sound
function playNotificationSound(type) {
    if (!window.audioEnabled || !window.audioContext) return;
    
    const frequencies = {
        success: 800,
        error: 300,
        info: 600,
        warning: 500
    };
    
    try {
        const oscillator = window.audioContext.createOscillator();
        const gainNode = window.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(window.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequencies[type] || 600, window.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, window.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, window.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, window.audioContext.currentTime + 0.1);
        
        oscillator.start(window.audioContext.currentTime);
        oscillator.stop(window.audioContext.currentTime + 0.1);
    } catch (e) {
        // Silently fail if audio context is not available
    }
}

// Matrix rain effect (easter egg)
let matrixActive = false;
function toggleMatrixRain() {
    if (matrixActive) return;
    
    matrixActive = true;
    const matrixOverlay = document.createElement('div');
    matrixOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        pointer-events: none;
        font-family: 'Courier New', monospace;
        overflow: hidden;
    `;
    
    document.body.appendChild(matrixOverlay);
    
    // Create matrix columns
    for (let i = 0; i < 50; i++) {
        const column = document.createElement('div');
        column.style.cssText = `
            position: absolute;
            top: -100px;
            left: ${i * 2}%;
            color: var(--neon-green);
            font-size: 14px;
            line-height: 1.2;
            animation: matrixFall ${2 + Math.random() * 3}s linear infinite;
        `;
        
        // Add random characters
        let text = '';
        for (let j = 0; j < 20; j++) {
            text += String.fromCharCode(0x30A0 + Math.random() * 96) + '<br>';
        }
        column.innerHTML = text;
        
        matrixOverlay.appendChild(column);
    }
    
    // Add matrix animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes matrixFall {
            to { transform: translateY(100vh); }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 5 seconds
    setTimeout(() => {
        matrixOverlay.remove();
        style.remove();
        matrixActive = false;
    }, 5000);
}

// Enhanced modal animations
function enhanceModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.addEventListener('show', () => {
        modal.style.display = 'block';
        modal.classList.add('fade-in');
        
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.add('slide-up');
        }
    });
}

// Cyber loading screen
function showCyberLoading(text = 'PROCESSING...') {
    const loader = document.createElement('div');
    loader.id = 'cyber-loader';
    loader.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 10, 15, 0.95);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Orbitron', monospace;
        ">
            <div class="loading-spinner" style="
                width: 60px;
                height: 60px;
                border: 3px solid rgba(0, 255, 255, 0.2);
                border-top: 3px solid var(--neon-cyan);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="
                color: var(--neon-cyan);
                font-weight: 600;
                font-size: 1.2rem;
                letter-spacing: 3px;
                animation: textGlow 2s ease-in-out infinite alternate;
            ">${text}</div>
            <div style="
                width: 200px;
                height: 2px;
                background: rgba(0, 255, 255, 0.2);
                margin-top: 20px;
                border-radius: 2px;
                overflow: hidden;
            ">
                <div style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta));
                    animation: progressBar 2s ease-in-out infinite;
                "></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(loader);
    return loader;
}

function hideCyberLoading() {
    const loader = document.getElementById('cyber-loader');
    if (loader) {
        loader.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => loader.remove(), 300);
    }
}

// Add CSS for new animations
const cyberpunkStyles = document.createElement('style');
cyberpunkStyles.textContent = `
    @keyframes buttonGlow {
        to {
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.8);
            transform: translateY(-3px) scale(1.05);
        }
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    
    @keyframes textGlow {
        0% { text-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
        100% { text-shadow: 0 0 40px rgba(0, 255, 255, 1), 0 0 60px rgba(255, 0, 128, 0.5); }
    }
    
    @keyframes progressBar {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(0%); }
        100% { transform: translateX(100%); }
    }
    
    .notification-icon {
        animation: iconPulse 0.5s ease-out;
    }
    
    @keyframes iconPulse {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(cyberpunkStyles);

// ===== SYSTEM HUD FUNCTIONS =====
function initSystemHUD() {
    updateSystemStatus();
    
    // Update HUD every 30 seconds (reduced frequency to avoid spam)
    setInterval(updateSystemStatus, 30000);
}

function updateSystemStatus() {
    // System status
    const systemStatus = document.getElementById('system-status');
    if (systemStatus) {
        systemStatus.className = 'hud-indicator active';
    }
    
    // Database status (simulate connection check)
    const dbStatus = document.getElementById('db-status');
    if (dbStatus) {
        // Simulate random connection issues (rare)
        const isHealthy = Math.random() > 0.05; // 95% uptime
        dbStatus.className = isHealthy ? 'hud-indicator active' : 'hud-indicator warning';
    }
    
    // Network status
    const netStatus = document.getElementById('net-status');
    if (netStatus) {
        // Check if we can make authenticated requests
        const token = localStorage.getItem('user_token');
        if (token) {
            fetch('/api/stats', { 
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => {
                    if (response.ok) {
                        netStatus.className = 'hud-indicator active';
                    } else {
                        netStatus.className = 'hud-indicator warning';
                    }
                })
                .catch(() => {
                    netStatus.className = 'hud-indicator error';
                });
        } else {
            netStatus.className = 'hud-indicator error';
        }
    }
}

// ===== CYBER CLOCK FUNCTIONS =====
function initCyberClock() {
    updateCyberClock();
    
    // Update clock every second
    setInterval(updateCyberClock, 1000);
}

function updateCyberClock() {
    const timeDisplay = document.getElementById('current-time');
    if (!timeDisplay) return;
    
    const now = new Date();
    
    // Format: HH:MM:SS
    const timeString = now.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    timeDisplay.textContent = timeString;
    
    // Add glitch effect occasionally
    if (Math.random() < 0.01) { // 1% chance
        glitchClock();
    }
}

function glitchClock() {
    const timeDisplay = document.getElementById('current-time');
    if (!timeDisplay) return;
    
    const originalText = timeDisplay.textContent;
    const glitchChars = '!@#$%^&*()[]{}|;:,.<>?';
    
    // Create glitch text
    let glitchText = '';
    for (let i = 0; i < originalText.length; i++) {
        if (originalText[i] === ':' || originalText[i] === ' ') {
            glitchText += originalText[i];
        } else {
            glitchText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
    }
    
    // Show glitch briefly
    timeDisplay.textContent = glitchText;
    timeDisplay.style.color = '#ff4757';
    
    setTimeout(() => {
        timeDisplay.textContent = originalText;
        timeDisplay.style.color = 'var(--neon-cyan)';
    }, 100);
}

// ===== ENHANCED STATS ANIMATIONS (ANTI-FLICKER) =====
function animateStatCounter(elementId, targetValue, duration = 800, skipAnimation = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Skip animation if requested or if values are very close
    const currentValue = parseInt(element.textContent) || 0;
    if (skipAnimation || Math.abs(currentValue - targetValue) <= 1) {
        element.textContent = targetValue;
        return;
    }
    
    // Use easing for smoother animation
    const startValue = currentValue;
    const startTime = performance.now();
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Override loadStats to use animated counters
const originalLoadStats = window.loadStats;
if (originalLoadStats) {
    window.loadStats = function() {
        originalLoadStats().then(() => {
            // Animate counters after loading
            // DISABLED: Skip counter animations to prevent flickering during page transitions
            // Only animate on first load, not on subsequent updates
            if (document.getElementById('open-tickets')?.textContent === '0') {
                setTimeout(() => {
                    const openTickets = parseInt(document.getElementById('open-tickets')?.textContent || '0');
                    const closedTickets = parseInt(document.getElementById('closed-tickets')?.textContent || '0');
                    const totalTickets = parseInt(document.getElementById('total-tickets')?.textContent || '0');
                    
                    // Fast, subtle animations only on first load
                    animateStatCounter('open-tickets', openTickets, 300);
                    animateStatCounter('closed-tickets', closedTickets, 300);
                    animateStatCounter('total-tickets', totalTickets, 300);
                }, 100);
            }
        });
    };
}

// ===== CYBER LOADING SCREEN INTEGRATION =====
// Override common functions to show cyber loading
const originalFetchWithAuth = window.fetchWithAuth;
if (originalFetchWithAuth) {
    window.fetchWithAuth = function(url, options = {}) {
        // Show loading for longer operations
        const isLongOperation = options.method === 'POST' || options.method === 'PUT' || url.includes('/tickets');
        let loader = null;
        
        if (isLongOperation) {
            loader = showCyberLoading('PROCESSING REQUEST...');
        }
        
        return originalFetchWithAuth(url, options).finally(() => {
            if (loader) {
                setTimeout(() => hideCyberLoading(), 300);
            }
        });
    };
}

// Authentication functions
function checkAuthentication() {
    const token = localStorage.getItem('user_token');
    const userData = localStorage.getItem('current_user');
    
    // Se siamo nelle pagine di login o registrazione, non fare controlli
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        return;
    }
    
    if (!token || !userData) {
        window.location.href = '/login';
        return;
    }
    
    currentUser = JSON.parse(userData);
    
    // Verifica il token con il server
    verifyToken(token);
    
    // Inizializza l'app
    initializeApp();
}

async function verifyToken(token) {
    try {
        const response = await fetchWithAuth('/api/auth/verify');
        if (!response.ok) {
            logout();
        }
    } catch (error) {
        console.error('Errore nella verifica del token:', error);
        logout();
    }
}

// Setup logout button with protection
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        // Remove any existing click handlers
        logoutBtn.removeEventListener('click', unsafeLogout);
        
        // Add secure logout handler
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showLogoutConfirmation();
        });
        
        console.log('✅ Logout button secured');
    }
}

// Legacy logout function - now protected
function logout() {
    if (sessionProtected && !authorizedLogout) {
        console.warn('🚫 Tentativo di logout non autorizzato - reindirizzamento a conferma');
        showLogoutConfirmation();
        return;
    }
    
    // Only allow if authorized
    performSecureLogout();
}

// Unsafe logout function (for reference only)
function unsafeLogout() {
    console.warn('🚫 Unsafe logout attempt blocked');
    showLogoutConfirmation();
}

// Funzione per fare richieste autenticate
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('user_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

function initializeApp() {
    loadStats();
    loadRecentTickets();
    loadAgents();
    setupEventListeners();
    updateUserDisplay();
    
    // Load current agent from localStorage
    const savedAgent = localStorage.getItem('currentAgent');
    if (savedAgent) {
        currentAgent = JSON.parse(savedAgent);
        updateCurrentAgentDisplay();
    }
}

function updateUserDisplay() {
    if (currentUser) {
        // Aggiungi il nome utente nella navbar se esiste
        const userDisplay = document.querySelector('.user-display');
        if (userDisplay) {
            userDisplay.textContent = `Benvenuto, ${currentUser.full_name}`;
        }
        
        // Mostra link amministrazione solo per admin
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        if (currentUser.role === 'admin') {
            adminOnlyElements.forEach(element => {
                element.style.display = 'block';
            });
        }
        
        // Aggiungi pulsante logout se esiste
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }
}

// Debouncing for loadStats to prevent multiple rapid calls
let statsLoadingPromise = null;

// Load dashboard statistics
async function loadStats() {
    // If already loading, return the existing promise
    if (statsLoadingPromise) {
        return statsLoadingPromise;
    }
    
    statsLoadingPromise = loadStatsInternal();
    
    try {
        await statsLoadingPromise;
    } finally {
        statsLoadingPromise = null;
    }
}

async function loadStatsInternal() {
    try {
        // Set loading state immediately to prevent flickering
        const elements = {
            openTickets: document.getElementById('open-tickets'),
            closedTickets: document.getElementById('closed-tickets'), 
            totalTickets: document.getElementById('total-tickets'),
            totalAgents: document.getElementById('total-agents')
        };
        
        // Set subtle loading state without changing text to prevent flicker
        Object.values(elements).forEach(el => {
            if (el) {
                el.style.opacity = '0.7';
                el.style.transition = 'opacity 0.2s ease';
            }
        });
        
        const response = await fetchWithAuth(`${API_BASE}/stats`);
        const stats = await response.json();
        
        // Batch update all elements at once to prevent flickering
        const updates = [];
        if (elements.openTickets) updates.push(() => elements.openTickets.textContent = stats.open_tickets);
        if (elements.closedTickets) updates.push(() => elements.closedTickets.textContent = stats.closed_tickets);
        if (elements.totalTickets) updates.push(() => elements.totalTickets.textContent = stats.total_tickets);
        if (elements.totalAgents) updates.push(() => elements.totalAgents.textContent = stats.total_agents);
        
        // Execute all updates in a single frame
        requestAnimationFrame(() => {
            updates.forEach(update => update());
            // Reset opacity
            Object.values(elements).forEach(el => {
                if (el) el.style.opacity = '1';
            });
        });
        
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        // Reset opacity on error
        ['open-tickets', 'closed-tickets', 'total-tickets', 'total-agents'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.textContent = '0';
            }
        });
    }
}

// Load recent tickets for dashboard
async function loadRecentTickets() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets`);
        tickets = await response.json();
        
        const recentTicketsContainer = document.getElementById('recent-tickets-list');
        if (recentTicketsContainer) {
            displayRecentTickets(tickets.slice(0, 5));
        }
    } catch (error) {
        console.error('Errore nel caricamento dei ticket:', error);
        const container = document.getElementById('recent-tickets-list');
        if (container) {
            container.innerHTML = '<div class="error">Errore nel caricamento dei ticket</div>';
        }
    }
}

// Display recent tickets
function displayRecentTickets(ticketList) {
    const container = document.getElementById('recent-tickets-list');
    if (!container) return;
    
    if (ticketList.length === 0) {
        container.innerHTML = '<div class="no-data">Nessun ticket trovato</div>';
        return;
    }
    
    container.innerHTML = ticketList.map(ticket => `
        <div class="ticket-item" onclick="openTicketDetails(${ticket.id})" style="cursor: pointer;">
            <div class="ticket-title">#${ticket.id} - ${escapeHtml(ticket.title)}</div>
            <div class="ticket-meta">
                <span>${escapeHtml(ticket.customer_name)}</span>
                <span class="priority-badge priority-${sanitizeForAttribute(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
                <span>${formatDate(ticket.created_at)}</span>
            </div>
            <div class="ticket-status">
                <span class="status-badge status-${sanitizeForAttribute(ticket.status.replace(' ', '-'))}">${escapeHtml(ticket.status)}</span>
                ${ticket.assigned_to ? `<span class="assigned-to">→ ${escapeHtml(ticket.assigned_to)}</span>` : '<span class="unassigned">Non assegnato</span>'}
            </div>
        </div>
    `).join('');
}

// Load agents
async function loadAgents() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`);
        agents = await response.json();
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
    }
}

// Load customers for ticket form
async function loadCustomersForTicket() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`);
        const customers = await response.json();
        
        const select = document.getElementById('existingCustomer');
        if (select) {
            // Clear existing options except the first one
            select.innerHTML = '<option value="">-- Seleziona un cliente --</option>';
            
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.email})`;
                option.dataset.customer = JSON.stringify(customer);
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento dei clienti:', error);
    }
}


// Load current agent selector
async function loadCurrentAgentSelector() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`);
        const agents = await response.json();
        
        const select = document.getElementById('currentAgent');
        if (select) {
            // Clear existing options except the first one
            select.innerHTML = '<option value="">-- Seleziona Agente --</option>';
            
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = `${agent.name} (${agent.department})`;
                option.dataset.agent = JSON.stringify(agent);
                select.appendChild(option);
            });
            
            // Restore selected agent if exists
            if (currentAgent) {
                select.value = currentAgent.id;
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
    }
}

// Set current agent
function setCurrentAgent() {
    const select = document.getElementById('currentAgent');
    if (select && select.value) {
        const selectedOption = select.options[select.selectedIndex];
        currentAgent = JSON.parse(selectedOption.dataset.agent);
        
        // Save to localStorage
        localStorage.setItem('currentAgent', JSON.stringify(currentAgent));
        
        showNotification(`Ora sei connesso come ${currentAgent.name}`, 'success');
    } else {
        currentAgent = null;
        localStorage.removeItem('currentAgent');
        showNotification('Agente disconnesso', 'info');
    }
}

// Update current agent display in all pages
function updateCurrentAgentDisplay() {
    const select = document.getElementById('currentAgent');
    if (select && currentAgent) {
        select.value = currentAgent.id;
    }
}

// Load agents for edit ticket modal
async function loadAgentsForEditTicket() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`);
        const agents = await response.json();
        
        const select = document.getElementById('editAssignedToAgent');
        if (select) {
            // Clear existing options except the first one
            select.innerHTML = '<option value="">-- Non assegnato --</option>';
            
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.name;
                option.textContent = `${agent.name} (${agent.department})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Ticket form submission
    const ticketForm = document.getElementById('ticketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', handleTicketSubmission);
    }
    
    // Agent form submission
    const agentForm = document.getElementById('agentForm');
    if (agentForm) {
        agentForm.addEventListener('submit', handleAgentSubmission);
    }
    
    // Customer form submission
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', handleCustomerSubmission);
    }
    
    // Edit ticket form submission (only for non-tickets pages)
    const editTicketForm = document.getElementById('editTicketForm');
    if (editTicketForm && window.location.pathname !== '/tickets') {
        editTicketForm.addEventListener('submit', handleEditTicketSubmission);
    }
}

// Handle ticket form submission
async function handleTicketSubmission(e) {
    e.preventDefault();
    
    const customerType = document.querySelector('input[name="customerType"]:checked').value;
    
    let formData = {
        title: document.getElementById('ticketTitle').value,
        description: document.getElementById('ticketDescription').value,
        priority: document.getElementById('ticketPriority').value
    };
    
    if (customerType === 'existing') {
        const customerId = document.getElementById('existingCustomer').value;
        if (!customerId) {
            showNotification('Seleziona un cliente esistente', 'error');
            return;
        }
        
        const selectedOption = document.querySelector(`#existingCustomer option[value="${customerId}"]`);
        const customerData = JSON.parse(selectedOption.dataset.customer);
        
        formData.customer_id = parseInt(customerId);
        formData.customer_name = customerData.name;
        formData.customer_email = customerData.email;
    } else {
        // New customer - use different IDs based on page
        const isTicketsPage = window.location.pathname === '/tickets';
        const isDashboard = window.location.pathname === '/';
        
        let customerNameId, customerEmailId, customerPhoneId;
        
        if (isTicketsPage) {
            customerNameId = 'newTicketCustomerName';
            customerEmailId = 'newTicketCustomerEmail';
            customerPhoneId = 'newTicketCustomerPhone';
        } else if (isDashboard) {
            customerNameId = 'dashboardCustomerName';
            customerEmailId = 'dashboardCustomerEmail';
            customerPhoneId = 'dashboardCustomerPhone';
        } else {
            // Default fallback
            customerNameId = 'customerName';
            customerEmailId = 'customerEmail';
            customerPhoneId = 'customerPhone';
        }
        
        const customerName = document.getElementById(customerNameId).value;
        const customerEmail = document.getElementById(customerEmailId).value;
        
        if (!customerName || !customerEmail) {
            showNotification('Nome e email del cliente sono obbligatori', 'error');
            return;
        }
        
        formData.customer_name = customerName;
        formData.customer_email = customerEmail;
        formData.customer_phone = document.getElementById(customerPhoneId).value;
        formData.customer_company = document.getElementById('customerCompanyTicket').value;
        formData.create_customer = true;
    }
    
    // Add new management fields
    const assignedAgent = document.getElementById('newAssignedToAgent').value;
    if (assignedAgent) {
        formData.assigned_to = assignedAgent;
    } else if (currentAgent) {
        formData.assigned_to = currentAgent.name;
    }
    
    // Add classification fields
    const software = document.getElementById('newTicketSoftware').value;
    if (software) formData.software = software;
    
    const group = document.getElementById('newTicketGroup').value;
    if (group) formData.group = group;
    
    const type = document.getElementById('newTicketType').value;
    if (type) formData.type = type;
    
    // Add assistance fields
    const rapportoDanea = document.getElementById('newRapportoDanea').value;
    if (rapportoDanea) formData.rapporto_danea = rapportoDanea;
    
    const idAssistenza = document.getElementById('newIdAssistenza').value;
    if (idAssistenza) formData.id_assistenza = idAssistenza;
    
    const passwordTeleassistenza = document.getElementById('newPasswordTeleassistenza').value;
    if (passwordTeleassistenza) formData.password_teleassistenza = passwordTeleassistenza;
    
    const numeroRichiesta = document.getElementById('newNumeroRichiestaTeleassistenza').value;
    if (numeroRichiesta) formData.numero_richiesta_teleassistenza = numeroRichiesta;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Ticket creato con successo!', 'success');
            closeModal('newTicketModal');
            resetTicketForm();
            
            // Reload data
            loadStats();
            loadRecentTickets();
            if (typeof loadAllTickets === 'function') {
                loadAllTickets();
            }
        } else {
            throw new Error('Errore nella creazione del ticket');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nella creazione del ticket', 'error');
    }
}

// Handle agent form submission
async function handleAgentSubmission(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('agentName').value,
        email: document.getElementById('agentEmail').value,
        department: document.getElementById('agentDepartment').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Agente aggiunto con successo!', 'success');
            closeModal('newAgentModal');
            document.getElementById('agentForm').reset();
            
            // Reload data
            loadStats();
            loadAgents();
        } else {
            throw new Error('Errore nell\'aggiunta dell\'agente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiunta dell\'agente', 'error');
    }
}

// Handle customer form submission
async function handleCustomerSubmission(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        company: document.getElementById('customerCompany').value,
        address: document.getElementById('customerAddress').value,
        notes: document.getElementById('customerNotes').value,
        status: document.getElementById('customerStatus').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Cliente aggiunto con successo!', 'success');
            closeModal('newCustomerModal');
            document.getElementById('customerForm').reset();
            
            // Reload data if on dashboard
            loadStats();
            if (typeof loadAllCustomers === 'function') {
                loadAllCustomers();
            }
        } else {
            throw new Error('Errore nell\'aggiunta del cliente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiunta del cliente', 'error');
    }
}

// Handle edit ticket form submission (for dashboard)
async function handleEditTicketSubmission(e) {
    e.preventDefault();
    
    // Check if we're on tickets page - use the enhanced version from tickets.js
    if (typeof handleEditTicketSubmission !== 'undefined' && window.location.pathname === '/tickets') {
        return; // Let tickets.js handle this
    }
    
    const ticketId = document.getElementById('editTicketId').value;
    const formData = {
        title: document.getElementById('editTicketTitle').value,
        description: document.getElementById('editTicketDescription').value,
        customer_name: document.getElementById('editCustomerName').value,
        customer_email: document.getElementById('editCustomerEmail').value,
        status: document.getElementById('editTicketStatus').value,
        priority: document.getElementById('editTicketPriority').value,
        assigned_to: document.getElementById('editAssignedToAgent').value || null,
        software: document.getElementById('editTicketSoftware').value || null,
        group: document.getElementById('editTicketGroup').value || null,
        type: document.getElementById('editTicketType').value || null,
        rapporto_danea: document.getElementById('editRapportoDanea').value || null,
        id_assistenza: document.getElementById('editIdAssistenza').value || null,
        password_teleassistenza: document.getElementById('editPasswordTeleassistenza').value || null,
        numero_richiesta_teleassistenza: document.getElementById('editNumeroRichiestaTeleassistenza').value || null
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Ticket aggiornato con successo!', 'success');
            // Force close modal with important flag to override any conflicting styles
            document.getElementById('editTicketModal').style.setProperty('display', 'none', 'important');
            
            // Update details panel if ticket details modal is open
            if (currentTicketId && document.getElementById('ticketDetailsModal').style.display !== 'none') {
                console.log('🔄 Aggiornamento pannello dettagli dopo modifica...');
                setTimeout(() => {
                    loadTicketDetails(currentTicketId);
                }, 500); // Small delay to ensure ticket is updated
            }
            
            // Reload data
            loadStats();
            loadRecentTickets();
        } else {
            throw new Error('Errore nell\'aggiornamento del ticket');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiornamento del ticket', 'error');
    }
}

// Modal functions
async function openNewTicketModal() {
    loadCustomersForTicket();
    // Load configuration options for new ticket form
    await loadNewTicketConfigurationOptions();
    // Load agents for assignment
    await loadAgentsForTicket();
    document.getElementById('newTicketModal').style.display = 'block';
}

// Load configuration options for new ticket form
async function loadNewTicketConfigurationOptions() {
    try {
        // Load software options
        const softwareResponse = await fetchWithAuth(`${API_BASE}/config/software`);
        if (softwareResponse.ok) {
            const softwareOptions = await softwareResponse.json();
            const softwareSelect = document.getElementById('newTicketSoftware');
            if (softwareSelect) {
                softwareSelect.innerHTML = '<option value="">-- Seleziona Software --</option>';
                softwareOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    softwareSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load group options
        const groupResponse = await fetchWithAuth(`${API_BASE}/config/groups`);
        if (groupResponse.ok) {
            const groupOptions = await groupResponse.json();
            const groupSelect = document.getElementById('newTicketGroup');
            if (groupSelect) {
                groupSelect.innerHTML = '<option value="">-- Seleziona Gruppo --</option>';
                groupOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    groupSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load type options
        const typeResponse = await fetchWithAuth(`${API_BASE}/config/types`);
        if (typeResponse.ok) {
            const typeOptions = await typeResponse.json();
            const typeSelect = document.getElementById('newTicketType');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">-- Seleziona Tipo --</option>';
                typeOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    typeSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load agents
        const agentsResponse = await fetchWithAuth(`${API_BASE}/agents`);
        if (agentsResponse.ok) {
            const agents = await agentsResponse.json();
            const agentSelect = document.getElementById('newAssignedToAgent');
            if (agentSelect) {
                agentSelect.innerHTML = '<option value="">-- Non assegnato --</option>';
                agents.forEach(agent => {
                    const optionElement = document.createElement('option');
                    optionElement.value = agent.name;
                    optionElement.textContent = `${agent.name} (${agent.department})`;
                    agentSelect.appendChild(optionElement);
                });
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento delle configurazioni:', error);
        // Set default options if API fails
        setDefaultNewTicketConfigurationOptions();
    }
}

// Load agents for ticket assignment
async function loadAgentsForTicket() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`);
        if (response.ok) {
            const agents = await response.json();
            const agentSelect = document.getElementById('newAssignedToAgent');
            
            if (agentSelect && agents.length > 0) {
                agentSelect.innerHTML = '<option value="">-- Seleziona Agente --</option>';
                
                agents.forEach(agent => {
                    const optionElement = document.createElement('option');
                    optionElement.value = agent.name;
                    optionElement.textContent = `${agent.name} (${agent.department})`;
                    agentSelect.appendChild(optionElement);
                });
                
                // Set current user as default if available
                const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
                if (currentUser.full_name) {
                    // Try to find and select the current user
                    const currentUserOption = Array.from(agentSelect.options).find(option => 
                        option.value === currentUser.full_name
                    );
                    if (currentUserOption) {
                        agentSelect.value = currentUser.full_name;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
    }
}

// Set default configuration options for new ticket form if API is not available
function setDefaultNewTicketConfigurationOptions() {
    const defaultSoftware = [
        { value: 'danea-easyfatt', label: 'Danea EasyFatt' },
        { value: 'danea-clienti', label: 'Danea Clienti' },
        { value: 'gestionale-custom', label: 'Gestionale Custom' },
        { value: 'altro', label: 'Altro' }
    ];
    
    const defaultGroups = [
        { value: 'supporto-tecnico', label: 'Supporto Tecnico' },
        { value: 'assistenza-commerciale', label: 'Assistenza Commerciale' },
        { value: 'amministrazione', label: 'Amministrazione' },
        { value: 'sviluppo', label: 'Sviluppo' }
    ];
    
    const defaultTypes = [
        { value: 'problema-tecnico', label: 'Problema Tecnico' },
        { value: 'richiesta-informazioni', label: 'Richiesta Informazioni' },
        { value: 'installazione', label: 'Installazione' },
        { value: 'teleassistenza', label: 'Teleassistenza' }
    ];
    
    // Populate software select
    const softwareSelect = document.getElementById('newTicketSoftware');
    if (softwareSelect) {
        softwareSelect.innerHTML = '<option value="">-- Seleziona Software --</option>';
        defaultSoftware.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            softwareSelect.appendChild(optionElement);
        });
    }
    
    // Populate group select
    const groupSelect = document.getElementById('newTicketGroup');
    if (groupSelect) {
        groupSelect.innerHTML = '<option value="">-- Seleziona Gruppo --</option>';
        defaultGroups.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            groupSelect.appendChild(optionElement);
        });
    }
    
    // Populate type select
    const typeSelect = document.getElementById('newTicketType');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">-- Seleziona Tipo --</option>';
        defaultTypes.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            typeSelect.appendChild(optionElement);
        });
    }
}

// Load ticket configuration options for dashboard edit modal
async function loadDashboardTicketConfigurationOptions() {
    try {
        // Load software options
        const softwareResponse = await fetchWithAuth(`${API_BASE}/config/software`);
        if (softwareResponse.ok) {
            const softwareOptions = await softwareResponse.json();
            const softwareSelect = document.getElementById('editTicketSoftware');
            if (softwareSelect) {
                softwareSelect.innerHTML = '<option value="">-- Seleziona Software --</option>';
                softwareOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    softwareSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load group options
        const groupResponse = await fetchWithAuth(`${API_BASE}/config/groups`);
        if (groupResponse.ok) {
            const groupOptions = await groupResponse.json();
            const groupSelect = document.getElementById('editTicketGroup');
            if (groupSelect) {
                groupSelect.innerHTML = '<option value="">-- Seleziona Gruppo --</option>';
                groupOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    groupSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load type options
        const typeResponse = await fetchWithAuth(`${API_BASE}/config/types`);
        if (typeResponse.ok) {
            const typeOptions = await typeResponse.json();
            const typeSelect = document.getElementById('editTicketType');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">-- Seleziona Tipo --</option>';
                typeOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    typeSelect.appendChild(optionElement);
                });
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento delle configurazioni dashboard:', error);
    }
}

// Toggle customer type in ticket form
function toggleCustomerType() {
    const customerType = document.querySelector('input[name="customerType"]:checked').value;
    const existingSection = document.getElementById('existingCustomerSection');
    const newSection = document.getElementById('newCustomerSection');
    
    if (customerType === 'existing') {
        existingSection.style.display = 'block';
        newSection.style.display = 'none';
        // Make existing customer select required
        document.getElementById('existingCustomer').required = true;
        // Remove required from new customer fields
        document.getElementById('customerName').required = false;
        document.getElementById('customerEmail').required = false;
    } else {
        existingSection.style.display = 'none';
        newSection.style.display = 'block';
        // Remove required from existing customer select
        document.getElementById('existingCustomer').required = false;
        // Make new customer fields required
        document.getElementById('customerName').required = true;
        document.getElementById('customerEmail').required = true;
    }
    
    // Hide customer info display
    document.getElementById('selectedCustomerInfo').style.display = 'none';
}

// Handle customer selection
function onCustomerSelect() {
    const select = document.getElementById('existingCustomer');
    const selectedCustomerInfo = document.getElementById('selectedCustomerInfo');
    const customerInfoContent = document.getElementById('customerInfoContent');
    
    if (select.value) {
        const selectedOption = select.options[select.selectedIndex];
        const customerData = JSON.parse(selectedOption.dataset.customer);
        
        customerInfoContent.innerHTML = `
            <div class="customer-preview">
                <div><strong>Nome:</strong> ${customerData.name}</div>
                <div><strong>Email:</strong> ${customerData.email}</div>
                ${customerData.phone ? `<div><strong>Telefono:</strong> ${customerData.phone}</div>` : ''}
                ${customerData.company ? `<div><strong>Azienda:</strong> ${customerData.company}</div>` : ''}
            </div>
        `;
        
        selectedCustomerInfo.style.display = 'block';
    } else {
        selectedCustomerInfo.style.display = 'none';
    }
}

// Reset ticket form
function resetTicketForm() {
    document.getElementById('ticketForm').reset();
    document.querySelector('input[name="customerType"][value="existing"]').checked = true;
    toggleCustomerType();
}

function openNewAgentModal() {
    document.getElementById('newAgentModal').style.display = 'block';
}

function openNewCustomerModal() {
    document.getElementById('newCustomerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.setProperty('display', 'none', 'important');
    
    // Stop auto-refresh when closing ticket details modal to prevent conflicts
    if (modalId === 'ticketDetailsModal') {
        stopMessageAutoRefresh();
        currentTicketId = null;
        isOpeningTicketDetails = false; // Reset flag
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.setProperty('display', 'none', 'important');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'  // Forza timezone italiano
    });
}

// Flag to prevent multiple simultaneous calls
let isOpeningTicketDetails = false;

// Open ticket details
async function openTicketDetails(ticketId) {
    // Prevent multiple simultaneous calls that could cause loops
    if (isOpeningTicketDetails) {
        console.log('⚠️ Apertura ticket già in corso, ignoro chiamata duplicata');
        return;
    }
    
    // Stop any existing auto-refresh to prevent conflicts
    stopMessageAutoRefresh();
    
    isOpeningTicketDetails = true;
    
    try {
        // Find ticket in the current tickets array
        let ticket = tickets.find(t => t.id === ticketId);
        
        // If not found, fetch from API
        if (!ticket) {
            const response = await fetchWithAuth(`${API_BASE}/tickets`);
            const allTickets = await response.json();
            ticket = allTickets.find(t => t.id === ticketId);
        }
        
        if (!ticket) {
            showNotification('Ticket non trovato', 'error');
            return;
        }
        
        // Populate header section with ticket title and description
        const titleElement = document.getElementById('ticketProblemTitle');
        const descriptionElement = document.getElementById('ticketProblemDescription');
        
        if (titleElement) {
            titleElement.textContent = ticket.title;
        }
        
        if (descriptionElement) {
            descriptionElement.textContent = ticket.description;
        }
        
        // Main content area - No longer needed, using new layout structure
        const mainContent = document.getElementById('ticketMainContent');
        if (mainContent && false) { // Disabled for new layout
            mainContent.innerHTML = `
                <div class="ticket-main-view">
                    <div class="ticket-header">
                        <div class="ticket-id-title">
                            <h3>Ticket #${ticket.id}</h3>
                            <h4>${ticket.title}</h4>
                        </div>
                        <div class="ticket-badges">
                            <span class="priority-badge priority-${ticket.priority}">${ticket.priority}</span>
                            <span class="status-badge status-${ticket.status.replace(' ', '-')}">${ticket.status}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Descrizione Iniziale</h3>
                        <div class="ticket-description">${ticket.description}</div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Informazioni Cliente</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="field-label">Nome:</span>
                                <span>${ticket.customer_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="field-label">Email:</span>
                                <span><a href="mailto:${ticket.customer_email}">${ticket.customer_email}</a></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section ticket-chat-section">
                        <div class="chat-header">
                            <h3><i class="fas fa-comments"></i> Conversazione</h3>
                            <div class="chat-controls">
                                <button id="refreshMessages" class="btn secondary btn-small" onclick="loadTicketMessages(${ticket.id})">
                                    <i class="fas fa-sync-alt"></i> Aggiorna
                                </button>
                            </div>
                        </div>
                        
                        <div id="ticketMessages" class="chat-messages">
                            <div class="loading-messages">
                                <i class="fas fa-spinner fa-spin"></i> Caricamento messaggi...
                            </div>
                        </div>
                        
                        <div class="chat-input-section">
                            <form id="messageForm" onsubmit="sendTicketMessage(event, ${ticket.id})">
                                <div class="message-input-container">
                                    <textarea id="messageText" placeholder="Scrivi un messaggio al cliente..." rows="3" required></textarea>
                                    <div class="message-options">
                                        <label class="checkbox-option">
                                            <input type="checkbox" id="isInternalMessage">
                                            <span>Nota interna (non inviata al cliente)</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="message-actions">
                                    <button type="submit" class="btn primary">
                                        <i class="fas fa-paper-plane"></i> Invia Messaggio
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
        }
        
        // Set current ticket ID for message form
        currentTicketId = ticket.id;
        
        // Load ticket messages and start auto-refresh with reduced frequency  
        loadTicketMessages(ticket.id);
        startMessageAutoRefresh(ticket.id);
        
        // Sidebar content - compact ticket details (only if not already loaded for this ticket)
        const detailsContent = document.getElementById('ticketDetailsContent');
        const currentlyDisplayedTicketId = detailsContent.getAttribute('data-ticket-id');
        
        if (currentlyDisplayedTicketId != ticket.id) {
        detailsContent.innerHTML = `
            <div class="ticket-sidebar-details">
                <div class="detail-section">
                    <h3>Informazioni Ticket</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">ID:</span>
                            <span>#${ticket.id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Priorità:</span>
                            <span class="priority-badge priority-${sanitizeForAttribute(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Stato:</span>
                            <span class="status-badge status-${sanitizeForAttribute(ticket.status.replace(' ', '-'))}">${escapeHtml(ticket.status)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Assegnato a:</span>
                            <span>${escapeHtml(ticket.assigned_to) || 'Non assegnato'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Classificazione</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">Software:</span>
                            <span>${escapeHtml(ticket.software) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Gruppo:</span>
                            <span>${escapeHtml(ticket.group) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Tipo:</span>
                            <span>${escapeHtml(ticket.type) || 'Non specificato'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Assistenza</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">Rapporto Danea:</span>
                            <span>${escapeHtml(ticket.rapporto_danea) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">ID Assistenza:</span>
                            <span>${escapeHtml(ticket.id_assistenza) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Password Teleassistenza:</span>
                            <span>${escapeHtml(ticket.password_teleassistenza) || 'Non specificata'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Numero Richiesta:</span>
                            <span>${escapeHtml(ticket.numero_richiesta_teleassistenza) || 'Non specificato'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn primary" onclick="makeTicketDetailsEditable(${ticket.id})">
                        <i class="fas fa-edit"></i> Modifica
                    </button>
                </div>
            </div>
        `;
        
        // Set the ticket ID attribute to avoid regenerating the same content
        detailsContent.setAttribute('data-ticket-id', ticket.id);
        }
        
        document.getElementById('ticketDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Errore nel caricamento dettagli ticket:', error);
        showNotification('Errore nel caricamento dettagli ticket', 'error');
    } finally {
        // Always release the flag
        isOpeningTicketDetails = false;
    }
}

// Edit ticket from details modal
async function editTicketFromDetails(ticketId) {
    closeModal('ticketDetailsModal');
    
    // Check if we're on tickets page with the enhanced modal
    if (typeof openEditTicketModal === 'function') {
        // Use the enhanced modal from tickets.js
        openEditTicketModal(ticketId);
        return;
    }
    
    // For dashboard: use the same complete modal logic
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
        showNotification('Ticket non trovato', 'error');
        return;
    }
    
    try {
        console.log('🔄 Caricamento configurazioni dashboard modal...'); // DEBUG
        
        // PRIMA carica le configurazioni, POI popola i campi
        await loadDashboardTicketConfigurationOptions();
        await loadAgentsForEditTicket();
        
        console.log('✅ Configurazioni caricate, popolamento campi dashboard...'); // DEBUG
        
        // THEN populate all fields with current values
        document.getElementById('editTicketId').value = ticket.id;
        document.getElementById('editTicketTitle').value = ticket.title || '';
        document.getElementById('editTicketDescription').value = ticket.description || '';
        document.getElementById('editCustomerName').value = ticket.customer_name || '';
        document.getElementById('editCustomerEmail').value = ticket.customer_email || '';
        document.getElementById('editTicketStatus').value = ticket.status || 'Open';
        document.getElementById('editTicketPriority').value = ticket.priority || 'Medium';
        document.getElementById('editAssignedToAgent').value = ticket.assigned_to || '';
        
        // New fields - POPOLATI DOPO IL CARICAMENTO DELLE OPZIONI
        document.getElementById('editTicketSoftware').value = ticket.software || '';
        document.getElementById('editTicketGroup').value = ticket.group || '';
        document.getElementById('editTicketType').value = ticket.type || '';
        document.getElementById('editRapportoDanea').value = ticket.rapporto_danea || '';
        document.getElementById('editIdAssistenza').value = ticket.id_assistenza || '';
        document.getElementById('editPasswordTeleassistenza').value = ticket.password_teleassistenza || '';
        document.getElementById('editNumeroRichiestaTeleassistenza').value = ticket.numero_richiesta_teleassistenza || '';
        
        console.log('✅ Tutti i campi popolati correttamente nella dashboard'); // DEBUG
        console.log('🔍 Valori impostati dashboard:', {
            software: ticket.software,
            group: ticket.group,
            type: ticket.type,
            rapporto_danea: ticket.rapporto_danea
        }); // DEBUG
        
        // Open edit modal
        document.getElementById('editTicketModal').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Errore nel caricamento configurazioni dashboard:', error);
        // Anche se il caricamento fallisce, mostra il modal con i valori di base
        document.getElementById('editTicketModal').style.display = 'block';
    }
}

// Make ticket details editable inline
async function makeTicketDetailsEditable(ticketId) {
    try {
        // Find ticket in the current tickets array
        let ticket = tickets.find(t => t.id === ticketId);
        
        // If not found, fetch from API
        if (!ticket) {
            const response = await fetchWithAuth(`${API_BASE}/tickets`);
            const allTickets = await response.json();
            ticket = allTickets.find(t => t.id === ticketId);
        }
        
        if (!ticket) {
            showNotification('Ticket non trovato', 'error');
            return;
        }

        // Load configuration options first
        const [softwareOptions, groupOptions, typeOptions, agents] = await Promise.all([
            fetchWithAuth(`${API_BASE}/config/software`).then(r => r.json()).catch(() => []),
            fetchWithAuth(`${API_BASE}/config/groups`).then(r => r.json()).catch(() => []),
            fetchWithAuth(`${API_BASE}/config/types`).then(r => r.json()).catch(() => []),
            fetchWithAuth(`${API_BASE}/agents`).then(r => r.json()).catch(() => [])
        ]);

        const detailsContent = document.getElementById('ticketDetailsContent');
        detailsContent.innerHTML = `
            <form id="editableTicketDetailsForm">
                <input type="hidden" id="editableTicketId" value="${ticket.id}">
                
                <div class="ticket-details-edit">
                    <div class="ticket-header">
                        <div class="ticket-id-title">
                            <h3>Ticket #${ticket.id}</h3>
                            <input type="text" id="editableTicketTitle" value="${ticket.title}" class="inline-edit-input title-input">
                        </div>
                        <div class="ticket-badges">
                            <select id="editableTicketPriority" class="inline-select priority-select">
                                <option value="Low" ${ticket.priority === 'Low' ? 'selected' : ''}>Bassa</option>
                                <option value="Medium" ${ticket.priority === 'Medium' ? 'selected' : ''}>Media</option>
                                <option value="High" ${ticket.priority === 'High' ? 'selected' : ''}>Alta</option>
                                <option value="Urgent" ${ticket.priority === 'Urgent' ? 'selected' : ''}>Urgente</option>
                            </select>
                            <select id="editableTicketStatus" class="inline-select status-select">
                                <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Aperto</option>
                                <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Corso</option>
                                <option value="Resolved" ${ticket.status === 'Resolved' ? 'selected' : ''}>Risolto</option>
                                <option value="Closed" ${ticket.status === 'Closed' ? 'selected' : ''}>Chiuso</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Informazioni Cliente</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label for="editableCustomerName">Nome:</label>
                                <input type="text" id="editableCustomerName" value="${ticket.customer_name}" class="inline-edit-input">
                            </div>
                            <div class="detail-item">
                                <label for="editableCustomerEmail">Email:</label>
                                <input type="email" id="editableCustomerEmail" value="${ticket.customer_email}" class="inline-edit-input">
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Descrizione</h3>
                        <textarea id="editableTicketDescription" class="inline-edit-textarea">${ticket.description}</textarea>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Dettagli Ticket</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label for="editableAssignedToAgent">Assegnato a:</label>
                                <select id="editableAssignedToAgent" class="inline-select">
                                    <option value="">-- Non assegnato --</option>
                                    ${agents.map(agent => 
                                        `<option value="${agent.name}" ${ticket.assigned_to === agent.name ? 'selected' : ''}>${agent.name} (${agent.department})</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="detail-item">
                                <label for="editableSoftware">Software:</label>
                                <select id="editableSoftware" class="inline-select">
                                    <option value="">-- Seleziona Software --</option>
                                    ${softwareOptions.map(option => 
                                        `<option value="${option.value}" ${ticket.software === option.value ? 'selected' : ''}>${option.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="detail-item">
                                <label for="editableGroup">Gruppo:</label>
                                <select id="editableGroup" class="inline-select">
                                    <option value="">-- Seleziona Gruppo --</option>
                                    ${groupOptions.map(option => 
                                        `<option value="${option.value}" ${ticket.group === option.value ? 'selected' : ''}>${option.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="detail-item">
                                <label for="editableType">Tipo:</label>
                                <select id="editableType" class="inline-select">
                                    <option value="">-- Seleziona Tipo --</option>
                                    ${typeOptions.map(option => 
                                        `<option value="${option.value}" ${ticket.type === option.value ? 'selected' : ''}>${option.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="detail-item">
                                <span class="field-label">Creato:</span>
                                <span>${formatDate(ticket.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="field-label">Ultimo aggiornamento:</span>
                                <span>${formatDate(ticket.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Informazioni Assistenza</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label for="editableRapportoDanea">Rapporto Danea:</label>
                                <input type="text" id="editableRapportoDanea" value="${ticket.rapporto_danea || ''}" class="inline-edit-input" placeholder="Inserisci rapporto Danea">
                            </div>
                            <div class="detail-item">
                                <label for="editableIdAssistenza">ID Assistenza:</label>
                                <input type="text" id="editableIdAssistenza" value="${ticket.id_assistenza || ''}" class="inline-edit-input" placeholder="Inserisci ID assistenza">
                            </div>
                            <div class="detail-item">
                                <label for="editablePasswordTeleassistenza">Password Teleassistenza:</label>
                                <input type="text" id="editablePasswordTeleassistenza" value="${ticket.password_teleassistenza || ''}" class="inline-edit-input" placeholder="Inserisci password">
                            </div>
                            <div class="detail-item">
                                <label for="editableNumeroRichiesta">Numero Richiesta Teleassistenza:</label>
                                <input type="text" id="editableNumeroRichiesta" value="${ticket.numero_richiesta_teleassistenza || ''}" class="inline-edit-input" placeholder="Inserisci numero richiesta">
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-actions">
                        <button type="submit" class="btn success">
                            <i class="fas fa-save"></i> Salva Modifiche
                        </button>
                        <button type="button" class="btn secondary" onclick="cancelEditTicketDetails(${ticket.id})">
                            <i class="fas fa-times"></i> Annulla
                        </button>
                        <button type="button" class="btn secondary" onclick="window.location.href='/tickets'">
                            <i class="fas fa-list"></i> Tutti i Ticket
                        </button>
                    </div>
                </div>
            </form>
        `;

        // Add styles for inline editing
        if (!document.getElementById('inlineEditStyles')) {
            const styles = document.createElement('style');
            styles.id = 'inlineEditStyles';
            styles.textContent = `
                .inline-edit-input, .inline-select, .inline-edit-textarea {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 6px 8px;
                    font-size: 13px;
                    width: 100%;
                    background: #fff;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }
                .inline-edit-input:focus, .inline-select:focus, .inline-edit-textarea:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
                    outline: none;
                }
                .title-input {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 8px 0;
                    padding: 8px;
                }
                .priority-select, .status-select {
                    min-width: 90px;
                    margin: 3px;
                    font-size: 12px;
                    padding: 4px 6px;
                }
                .inline-edit-textarea {
                    min-height: 80px;
                    resize: vertical;
                    font-family: inherit;
                }
                .detail-grid .detail-item {
                    margin-bottom: 12px;
                }
                .detail-actions {
                    padding-top: 15px;
                    margin-top: 15px;
                    border-top: 1px solid #eee;
                }
                .detail-actions .btn {
                    padding: 8px 12px;
                    font-size: 12px;
                    margin: 3px 0;
                    width: 100%;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                .btn.success {
                    background: #28a745;
                    color: white;
                }
                .btn.success:hover {
                    background: #218838;
                    transform: translateY(-1px);
                }
                .btn.secondary {
                    background: #6c757d;
                    color: white;
                }
                .btn.secondary:hover {
                    background: #5a6268;
                    transform: translateY(-1px);
                }
                .ticket-details-edit {
                    padding: 0;
                }
                .ticket-details-edit .ticket-header {
                    background: white;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 12px;
                    border: 1px solid #e9ecef;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .ticket-details-edit .ticket-id-title h3 {
                    color: #667eea;
                    margin-bottom: 8px;
                    font-size: 16px;
                }
                .ticket-details-edit .ticket-badges {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 8px;
                }
            `;
            document.head.appendChild(styles);
        }

        // Handle form submission
        document.getElementById('editableTicketDetailsForm').addEventListener('submit', handleEditableTicketSubmission);
        
    } catch (error) {
        console.error('Errore nel rendering del modal editabile:', error);
        showNotification('Errore nel caricamento del modal editabile', 'error');
    }
}

// Handle editable ticket details form submission
async function handleEditableTicketSubmission(e) {
    e.preventDefault();
    
    const ticketId = document.getElementById('editableTicketId').value;
    const formData = {
        title: document.getElementById('editableTicketTitle').value,
        description: document.getElementById('editableTicketDescription').value,
        customer_name: document.getElementById('editableCustomerName').value,
        customer_email: document.getElementById('editableCustomerEmail').value,
        status: document.getElementById('editableTicketStatus').value,
        priority: document.getElementById('editableTicketPriority').value,
        assigned_to: document.getElementById('editableAssignedToAgent').value || null,
        software: document.getElementById('editableSoftware').value || null,
        group: document.getElementById('editableGroup').value || null,
        type: document.getElementById('editableType').value || null,
        rapporto_danea: document.getElementById('editableRapportoDanea').value || null,
        id_assistenza: document.getElementById('editableIdAssistenza').value || null,
        password_teleassistenza: document.getElementById('editablePasswordTeleassistenza').value || null,
        numero_richiesta_teleassistenza: document.getElementById('editableNumeroRichiesta').value || null
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Ticket aggiornato con successo!', 'success');
            console.log('✅ Ticket salvato, switching a read-only mode...');
            
            // Update local ticket data immediately
            const ticketIndex = tickets.findIndex(t => t.id == ticketId);
            if (ticketIndex >= 0) {
                tickets[ticketIndex] = { ...tickets[ticketIndex], ...formData, id: ticketId };
                console.log('📝 Dati locali aggiornati');
            }
            
            // Force hide the edit form first
            const editForm = document.getElementById('editableTicketDetailsForm');
            if (editForm) {
                editForm.remove(); // Remove completely
                console.log('🗑️ Form di editing rimosso dal DOM');
            }
            
            // Switch back to read-only view with updated local data (no API fetch)
            await displayTicketDetailsReadOnly(ticketId, false); // Use local data
            console.log('✅ Read-only mode attivato');
            
            // Refresh background data asynchronously (non-blocking)
            setTimeout(() => {
                loadRecentTickets();
                loadStats();
            }, 0);
        } else {
            throw new Error('Errore nell\'aggiornamento del ticket');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiornamento del ticket', 'error');
    }
}

// Cancel edit ticket details - return to read-only view WITHOUT loops
function cancelEditTicketDetails(ticketId) {
    displayTicketDetailsReadOnly(ticketId);
}

// Display ticket details in read-only mode (safe, no loops)
async function displayTicketDetailsReadOnly(ticketId, forceFetch = false) {
    console.log(`🔄 displayTicketDetailsReadOnly chiamata per ticket ${ticketId}, forceFetch: ${forceFetch}`);
    try {
        let ticket = null;
        
        // If forceFetch is true or ticket not in local array, fetch from API
        if (forceFetch || !tickets.find(t => t.id === ticketId)) {
            console.log('🔄 Fetching fresh ticket data from API...');
            const response = await fetchWithAuth(`${API_BASE}/tickets`);
            const allTickets = await response.json();
            ticket = allTickets.find(t => t.id == ticketId);
            // Update local tickets array with fresh data
            tickets = allTickets;
        } else {
            ticket = tickets.find(t => t.id == ticketId);
        }
        
        if (!ticket) {
            showNotification('Ticket non trovato', 'error');
            return;
        }
        
        // Update the details content with read-only view
        const detailsContent = document.getElementById('ticketDetailsContent');
        
        if (!detailsContent) {
            console.error('❌ ticketDetailsContent element not found!');
            return;
        }
        
        // Force clear any existing content first
        detailsContent.innerHTML = '';
        
        // Remove any remaining edit forms from the entire modal
        const allEditForms = document.querySelectorAll('#editableTicketDetailsForm');
        allEditForms.forEach(form => form.remove());
        
        detailsContent.innerHTML = `
            <div class="ticket-sidebar-details">
                <div class="detail-section">
                    <h3>Informazioni Ticket</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">ID:</span>
                            <span>#${ticket.id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Titolo:</span>
                            <span>${escapeHtml(ticket.title)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Priorità:</span>
                            <span class="priority-badge priority-${sanitizeForAttribute(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Stato:</span>
                            <span class="status-badge status-${sanitizeForAttribute(ticket.status.replace(' ', '-'))}">${escapeHtml(ticket.status)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Assegnato a:</span>
                            <span>${escapeHtml(ticket.assigned_to) || 'Non assegnato'}</span>
                        </div>
                    </div>
                </div>
            
                <div class="detail-section">
                    <h3>Cliente</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">Nome:</span>
                            <span>${escapeHtml(ticket.customer_name)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Email:</span>
                            <span><a href="mailto:${sanitizeForAttribute(ticket.customer_email)}">${escapeHtml(ticket.customer_email)}</a></span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Descrizione</h3>
                    <div class="ticket-description">${escapeHtml(ticket.description)}</div>
                </div>
                
                <div class="detail-section">
                    <h3>Classificazione</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">Software:</span>
                            <span>${escapeHtml(ticket.software) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Gruppo:</span>
                            <span>${escapeHtml(ticket.group) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Tipo:</span>
                            <span>${escapeHtml(ticket.type) || 'Non specificato'}</span>
                        </div>
                    </div>
                </div>
            
                <div class="detail-section">
                    <h3>Assistenza</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="field-label">Rapporto Danea:</span>
                            <span>${escapeHtml(ticket.rapporto_danea) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">ID Assistenza:</span>
                            <span>${escapeHtml(ticket.id_assistenza) || 'Non specificato'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Password Teleassistenza:</span>
                            <span>${escapeHtml(ticket.password_teleassistenza) || 'Non specificata'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="field-label">Numero Richiesta:</span>
                            <span>${escapeHtml(ticket.numero_richiesta_teleassistenza) || 'Non specificato'}</span>
                        </div>
                    </div>
                </div>
            
                <div class="detail-actions">
                    <button class="btn primary" onclick="makeTicketDetailsEditable(${ticket.id})">
                        <i class="fas fa-edit"></i> Modifica
                    </button>
                </div>
            </div>
        `;
        
        // Update ticket ID attribute
        detailsContent.setAttribute('data-ticket-id', ticket.id);
        
    } catch (error) {
        console.error('Errore nel caricamento dettagli ticket:', error);
        showNotification('Errore nel caricamento dettagli ticket', 'error');
    }
}

// Assign ticket to current agent
async function assignTicketToMe(ticketId) {
    if (!currentAgent) {
        showNotification('Seleziona un agente prima', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assigned_to: currentAgent.name,
                status: 'In Progress' // Auto-change status when assigned
            })
        });
        
        if (response.ok) {
            showNotification(`Ticket assegnato a ${currentAgent.name}`, 'success');
            closeModal('ticketDetailsModal');
            loadRecentTickets(); // Safe refresh after modal is closed
            loadStats();
        } else {
            throw new Error('Errore nell\'assegnazione');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'assegnazione del ticket', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add notification styles
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideInNotification 0.3s ease;
}

.notification-success {
    background: linear-gradient(135deg, #56ab2f, #a8e6cf);
}

.notification-error {
    background: linear-gradient(135deg, #ff416c, #ff4b2b);
}

.notification-info {
    background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.notification button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@keyframes slideInNotification {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Ticket Messages Functions
async function loadTicketMessages(ticketId) {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}/messages`);
        const messages = await response.json();
        
        const messagesContainer = document.getElementById('ticketMessages');
        if (!messagesContainer) return;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <p>Nessun messaggio ancora. Inizia la conversazione!</p>
                </div>
            `;
            return;
        }
        
        // Genera il nuovo HTML con fumetti
        const newHTML = messages.map(message => {
            const messageDate = new Date(message.created_at);
            const isAgent = message.sender_type === 'agent';
            const isInternal = message.is_internal;
            
            // Determina il tipo di bubble
            let bubbleClass = isInternal ? 'internal' : (isAgent ? 'agent' : 'customer');
            
            return `
                <div class="message-bubble ${bubbleClass}">
                    <div class="message-content">
                        ${escapeHtml(message.message_text).replace(/\n/g, '<br>')}
                    </div>
                    <div class="message-meta">
                        <div class="message-author">
                            <i class="fas ${isAgent ? 'fa-user-tie' : 'fa-user'}"></i>
                            ${escapeHtml(message.sender_name)}
                        </div>
                        <div class="message-time">${formatMessageDate(messageDate)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Aggiorna solo se il contenuto è diverso (evita lampeggio)
        const currentHTML = messagesContainer.innerHTML.trim();
        const newHTMLTrimmed = newHTML.trim();
        
        if (currentHTML !== newHTMLTrimmed) {
            console.log('🔄 Aggiornamento messaggi ticket:', ticketId, 'cambio rilevato');
            messagesContainer.innerHTML = newHTML;
            // Scroll to bottom solo se c'è stato un cambiamento
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            console.log('⏭️ Nessun cambio messaggi ticket:', ticketId);
        }
        
    } catch (error) {
        console.error('Errore nel caricamento messaggi:', error);
        const messagesContainer = document.getElementById('ticketMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="error-messages">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Errore nel caricamento dei messaggi</p>
                </div>
            `;
        }
    }
}

// Flag per prevenire invii duplicati
let isMessageSending = false;

async function sendTicketMessage(event, ticketId) {
    console.log('🚀 sendTicketMessage chiamata con ticketId:', ticketId);
    event.preventDefault();
    
    // Previeni invii duplicati
    if (isMessageSending) {
        console.log('🚫 Messaggio già in invio, ignoro duplicato');
        return;
    }
    
    const messageTextElement = document.getElementById('messageText');
    const isInternalElement = document.getElementById('isInternalMessage');
    
    console.log('📝 messageTextElement:', messageTextElement);
    console.log('☑️ isInternalElement:', isInternalElement);
    
    if (!messageTextElement || !isInternalElement) {
        console.error('❌ Elementi del form non trovati!');
        showNotification('Errore nel form del messaggio', 'error');
        return;
    }
    
    const messageText = messageTextElement.value.trim();
    const isInternal = isInternalElement.checked;
    
    console.log('📄 messageText:', messageText);
    console.log('🔒 isInternal:', isInternal);
    
    if (!messageText) {
        showNotification('Inserisci un messaggio', 'error');
        return;
    }
    
    // Imposta flag di invio
    isMessageSending = true;
    console.log('📤 Inizio invio messaggio...');
    
    try {
        const messageData = {
            sender_type: 'agent',
            sender_name: currentUser.full_name,
            sender_email: currentUser.email,
            message_text: messageText,
            is_internal: isInternal
        };
        
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        if (response.ok) {
            console.log('✅ Messaggio inviato con successo');
            
            // Reset form
            document.getElementById('messageText').value = '';
            document.getElementById('isInternalMessage').checked = false;
            
            // Reload messages
            await loadTicketMessages(ticketId);
            
            showNotification(
                isInternal ? 'Nota interna aggiunta' : 'Messaggio inviato al cliente', 
                'success'
            );
        } else {
            throw new Error('Errore nell\'invio del messaggio');
        }
        
    } catch (error) {
        console.error('Errore nell\'invio messaggio:', error);
        showNotification('Errore nell\'invio del messaggio', 'error');
    } finally {
        // Rilascia sempre il flag
        isMessageSending = false;
        console.log('🔓 Flag invio rilasciato');
    }
}

// Funzione per aggiornare manualmente i messaggi del ticket
function refreshTicketMessages() {
    if (currentTicketId) {
        console.log('🔄 Aggiornamento manuale messaggi per ticket:', currentTicketId);
        loadTicketMessages(currentTicketId);
    } else {
        console.warn('⚠️ Nessun ticket ID corrente per l\'aggiornamento');
    }
}

function formatMessageDate(date) {
    // Assicurati che la data sia in timezone locale italiano
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'  // Forza timezone italiano
    });
}

// Auto-refresh functions for ticket messages
function startMessageAutoRefresh(ticketId) {
    // Stop any existing interval
    stopMessageAutoRefresh();
    
    // Set current ticket ID
    currentTicketId = ticketId;
    
    // Start new interval - check every 30 seconds (further reduced frequency to prevent conflicts)
    autoRefreshInterval = setInterval(() => {
        if (currentTicketId === ticketId && document.getElementById('ticketDetailsModal').style.display === 'block') {
            // Only refresh if modal is still open and not being edited
            const isEditing = document.getElementById('editableTicketDetailsForm');
            if (!isEditing) {
                loadTicketMessages(ticketId);
            }
        } else {
            stopMessageAutoRefresh();
        }
    }, 15000);
    
    console.log(`🔄 Auto-refresh avviato per ticket ${ticketId} (ogni 15 secondi)`);
}

function stopMessageAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        currentTicketId = null;
        console.log('⏹️ Auto-refresh fermato');
    }
}