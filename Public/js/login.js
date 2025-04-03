document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Only add event listener if form exists on page
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous error messages
            if (errorMessage) {
                errorMessage.textContent = '';
                errorMessage.style.display = 'none';
            }
            
            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };
            
            try {
                console.log('Sending login request...');
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
                
                if (response.ok) {
                    // Login successful, store user data
                    localStorage.setItem('user', JSON.stringify(data));
                    
                    // Redirect to recipes page
                    console.log('Login successful, redirecting...');
                    window.location.href = '/recipes.html';
                } else {
                    // Login failed, show error message
                    console.error('Login failed:', data.error);
                    if (errorMessage) {
                        errorMessage.textContent = data.error || 'Invalid username or password';
                        errorMessage.style.display = 'block';
                    } else {
                        alert(data.error || 'Invalid username or password');
                    }
                }
            } catch (err) {
                console.error('Login error:', err);
                if (errorMessage) {
                    errorMessage.textContent = 'An error occurred during login. Please try again.';
                    errorMessage.style.display = 'block';
                } else {
                    alert('An error occurred during login. Please try again.');
                }
            }
        });
    }
});