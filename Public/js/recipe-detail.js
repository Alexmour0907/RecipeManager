/**
 * Recipe Manager - Recipe Detail Page
 * Displays a single recipe with all details and actions
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    // Get recipe ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    if (!recipeId) {
        alert('Recipe ID is missing');
        window.location.href = '/recipes.html';
        return;
    }
    
    try {
        // Fetch recipe details
        const response = await fetch(`/recipes/${recipeId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe');
        }
        
        const recipe = await response.json();
        displayRecipe(recipe);
    } catch (err) {
        console.error('Error loading recipe:', err);
        const container = document.getElementById('recipe-detail-container');
        if (container) {
            container.innerHTML = `<div class="error-message">Error loading recipe: ${err.message}</div>`;
        }
    }
});

function displayRecipe(recipe) {
    const container = document.getElementById('recipe-detail-container');
    if (!container) return;
    
    // Determine if we should show the image
    const imageSection = recipe.image_url 
        ? `<div class="recipe-detail-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-detail-image no-image">
             <i class="fas fa-utensils"></i>
             <span>No image available</span>
           </div>`;

    // Format ingredients as list
    const ingredients = recipe.ingredients.split('\n').map(ingredient => 
        `<li>${ingredient.trim()}</li>`
    ).join('');
    
    // Format instructions with line breaks
    const instructions = recipe.instructions.split('\n').map(instruction => 
        `<p>${instruction.trim()}</p>`
    ).join('');
    
    container.innerHTML = `
        <div class="recipe-detail">
            <!-- Top back button -->
            <div class="top-navigation">
                <a href="/recipes.html" class="action-btn btn-back">
                    <i class="fas fa-arrow-left"></i> Back to Recipes
                </a>
            </div>

            <!-- Recipe header with title and favorite button -->
            <header class="recipe-detail-header">
                <div class="recipe-detail-title-area">
                    <h1 class="recipe-detail-title">${recipe.title}</h1>
                </div>
                
                <!-- Category and star on same line -->
                <div class="recipe-detail-meta">
                    <div class="recipe-detail-category">
                        ${recipe.category_name || 'Uncategorized'}
                    </div>
                    <div class="recipe-detail-favorite">
                        <button id="favorite-btn" class="favorite-btn ${recipe.is_favorite ? 'active' : ''}" data-id="${recipe.id}">
                            <i class="${recipe.is_favorite ? 'fas' : 'far'} fa-star"></i>
                        </button>
                    </div>
                </div>
            </header>
            
            <!-- Recipe image -->
            ${imageSection}
            
            <!-- Recipe content -->
            <div class="recipe-detail-section">
                <h3>Ingredients</h3>
                <ul class="ingredients-list">
                    ${ingredients}
                </ul>
            </div>
            
            <div class="recipe-detail-section">
                <h3>Instructions</h3>
                <div class="instructions-content">
                    ${instructions}
                </div>
            </div>
            
            <!-- Recipe actions -->
            <div class="recipe-detail-actions">
                <a href="/recipes.html" class="action-btn btn-back">
                    <i class="fas fa-arrow-left"></i> Back to Recipes
                </a>
                <a href="/edit-recipe.html?id=${recipe.id}" class="action-btn btn-edit">
                    <i class="fas fa-edit"></i> Edit Recipe
                </a>
                <button id="delete-recipe" class="action-btn btn-delete" data-id="${recipe.id}">
                    <i class="fas fa-trash"></i> Delete Recipe
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('favorite-btn')?.addEventListener('click', toggleFavorite);
    document.getElementById('delete-recipe')?.addEventListener('click', deleteRecipe);
}

async function toggleFavorite(e) {
    const btn = e.currentTarget;
    const recipeId = btn.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    const isFavorite = btn.classList.contains('active');
    
    try {
        const response = await fetch(`/recipes/${recipeId}/favorite?user_id=${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_favorite: !isFavorite })
        });
        
        if (response.ok) {
            // Toggle active class
            btn.classList.toggle('active');
            
            // Toggle icon
            btn.innerHTML = !isFavorite ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
        } else {
            const error = await response.json();
            console.error('Failed to update favorite status:', error);
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
    }
}

async function deleteRecipe(e) {
    const recipeId = e.currentTarget.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (confirm('Are you sure you want to delete this recipe?')) {
        try {
            const response = await fetch(`/recipes/${recipeId}?user_id=${user.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Redirect back to recipes page
                window.location.href = '/recipes.html';
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to delete recipe');
            }
        } catch (err) {
            console.error('Error deleting recipe:', err);
            alert('An error occurred while trying to delete the recipe');
        }
    }
}