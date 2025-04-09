/**
 * Recipe Manager Authentication Module
 * Handles login, registration, authentication checks, and logout
 */

// Initialize authentication features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and add the logout modal to the DOM
    createLogoutModal();
    
    // Check if we're on the login or register page
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('register.html');
    
    // Handle page protection
    if (!isAuthPage) {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user'));
        const publicPages = ['/', '/index.html', '/login.html', '/register.html'];
        const currentPath = window.location.pathname;
        
        // If on a protected page and not logged in, redirect to login
        if (!publicPages.includes(currentPath) && (!user || !user.id)) {
            window.location.href = '/login.html';
            return;
        }
    }
    
    // Set up event listeners for forms and buttons
    setupEventListeners();
});

/**
 * Creates the logout confirmation modal and adds it to the DOM
 */
function createLogoutModal() {
    if (!document.getElementById('logout-modal')) {
        const modalHtml = `
            <div id="logout-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3><i class="fas fa-sign-out-alt"></i> Confirm Logout</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to log out?</p>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-logout" class="btn">Cancel</button>
                        <button id="confirm-logout" class="btn btn-danger">Log Out</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

/**
 * Set up event listeners for forms and buttons
 */
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Logout buttons - both main nav and homepage
    const logoutButtons = document.querySelectorAll('#logout-btn, #logout-btn-home');
    logoutButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showLogoutConfirmation();
            });
        }
    });
    
    // Logout modal buttons
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', hideLogoutConfirmation);
    }
    
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', performLogout);
    }
    
    // Modal overlay click to cancel
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideLogoutConfirmation);
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
            hideLogoutConfirmation();
        }
    });
}

/**
 * Show the logout confirmation modal
 */
function showLogoutConfirmation() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    }
}

/**
 * Hide the logout confirmation modal
 */
function hideLogoutConfirmation() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

/**
 * Perform the actual logout action
 */
function performLogout() {
    localStorage.removeItem('user');
    
    // Redirect to home or reload if already home
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        window.location.reload();
    } else {
        window.location.href = '/';
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const errorElement = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    // Clear previous errors
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    try {
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Invalid credentials');
        }
        
        const userData = await response.json();
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect to dashboard
        window.location.href = '/';
    } catch (err) {
        // Show error
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submit event
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const errorElement = document.getElementById('register-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }
    
    // Clear previous errors
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    try {
        const username = e.target.username.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
        
        // Show success message
        if (errorElement) {
            errorElement.textContent = 'Account created successfully! Redirecting to login...';
            errorElement.style.display = 'block';
            errorElement.classList.remove('error-message');
            errorElement.classList.add('success-message');
        }
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    } catch (err) {
        // Show error
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
}

/**
 * Perform the actual logout action
 */
function performLogout() {
    // Clear user data from local storage
    localStorage.removeItem('user');
    
    // Hide the logout confirmation modal
    hideLogoutConfirmation();
    
    // Redirect to login page instead of home page
    window.location.href = '/login.html';
}