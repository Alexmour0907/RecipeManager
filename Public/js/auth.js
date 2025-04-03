// Login form handling
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        // Login code stays the same
    });
}

// Check if user is logged in
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        return false;
    }
    return true;
}

// Protect pages that require authentication
function protectPage() {
    if (!checkAuth()) {
        alert('Please log in to access this page');
        window.location.href = '/login.html';
    }
}

// Check if this is a protected page
const protectedPages = ['recipes.html', 'add-recipe.html'];
const currentPage = window.location.pathname.split('/').pop();
if (protectedPages.includes(currentPage)) {
    protectPage();
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });
}