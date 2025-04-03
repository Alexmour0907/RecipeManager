// Registration form handling
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };
    
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Registration successful! Please login.');
                window.location.href = '/login.html';
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
}

// Add this to the end of main.js
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the home page
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const user = JSON.parse(localStorage.getItem('user'));
        const homeActions = document.querySelector('.home-actions');
        
        if (homeActions) {
            if (user && user.id) {
                // User is logged in - show appropriate actions
                homeActions.innerHTML = `
                    <a href="/recipes.html" class="btn">My Recipes</a>
                    <a href="/add-recipe.html" class="btn">Add New Recipe</a>
                    <a href="#" id="logout-btn" class="btn">Logout</a>
                `;
                
                // Add logout listener
                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('user');
                    window.location.reload();
                });
            } else {
                // User is not logged in - show login/register options
                homeActions.innerHTML = `
                    <a href="/login.html" class="btn">Login</a>
                    <a href="/register.html" class="btn">Register</a>
                `;
            }
        }
    }
});

// Recipe loading code will go here
// Recipe form handling code will go here