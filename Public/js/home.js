document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    if (user && user.id) {
        // User is logged in - show dashboard
        loginView.style.display = 'none';
        dashboardView.style.display = 'block';
        
        // Display username
        document.getElementById('username-display').textContent = user.username;
        
        // Load dashboard data
        loadDashboard(user.id);
    } else {
        // User is not logged in - show login view
        loginView.style.display = 'block';
        dashboardView.style.display = 'none';
    }
});

async function loadDashboard(userId) {
    try {
        const response = await fetch(`/dashboard?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('total-recipes').textContent = data.stats.totalRecipes;
        document.getElementById('favorite-recipes').textContent = data.stats.favoriteRecipes;
        document.getElementById('total-categories').textContent = data.stats.categories;
        
        // Render recent recipes
        renderRecipeList(data.recentRecipes, 'recent-recipes');
        
        // Render favorite recipes
        renderRecipeList(data.favoriteRecipes, 'favorite-recipes-container');
        
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

function renderRecipeList(recipes, containerId) {
    const container = document.getElementById(containerId);
    
    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="empty-message">No recipes found.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-preview-card';
        if (recipe.is_favorite) {
            card.classList.add('is-favorite');
        }
        
        card.innerHTML = `
            <h3>${recipe.title}</h3>
            <div class="card-actions">
                <a href="/recipe-detail.html?id=${recipe.id}" class="btn btn-sm">View</a>
                ${recipe.is_favorite ? 
                    '<i class="fas fa-star favorite-indicator"></i>' : 
                    ''}
            </div>
        `;
        
        container.appendChild(card);
    });
}