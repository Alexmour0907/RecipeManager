document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    // Get recipe ID from URL
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('id');
    
    if (!recipeId) {
        window.location.href = '/recipes.html';
        return;
    }
    
    // Set up edit link
    document.getElementById('edit-link').href = `/edit-recipe.html?id=${recipeId}`;
    
    // Set up delete button
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this recipe?')) {
            await deleteRecipe(recipeId);
        }
    });
    
    // Load recipe details
    await loadRecipeDetails(recipeId);
});

async function loadRecipeDetails(recipeId) {
    const recipeContainer = document.getElementById('recipe-container');
    
    try {
        const response = await fetch(`/recipes/${recipeId}`);
        
        if (!response.ok) {
            throw new Error('Recipe not found');
        }
        
        const recipe = await response.json();
        
        // Format ingredients as a list
        const ingredientsList = recipe.ingredients
            .split('\n')
            .filter(ingredient => ingredient.trim() !== '')
            .map(ingredient => `<li>${ingredient.trim()}</li>`)
            .join('');
        
        // Format instructions with paragraphs
        const instructionsHtml = recipe.instructions
            .split('\n')
            .filter(step => step.trim() !== '')
            .map(step => `<p>${step.trim()}</p>`)
            .join('');
        
        // Load category name
        let categoryName = 'Uncategorized';
        if (recipe.category_id) {
            const catResponse = await fetch(`/categories/${recipe.category_id}`);
            if (catResponse.ok) {
                const category = await catResponse.json();
                categoryName = category.name;
            }
        }
        
        // Update page title
        document.title = `${recipe.title} - Recipe Manager`;
        
        // Display recipe details
        recipeContainer.innerHTML = `
            <h1>${recipe.title}</h1>
            <div class="recipe-category">Category: ${categoryName}</div>
            
            <h2>Ingredients</h2>
            <ul class="ingredients-list">
                ${ingredientsList}
            </ul>
            
            <h2>Instructions</h2>
            <div class="instructions">
                ${instructionsHtml}
            </div>
        `;
    } catch (err) {
        console.error('Error loading recipe:', err);
        recipeContainer.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>Failed to load recipe details. The recipe may have been deleted.</p>
            </div>
        `;
    }
}

async function deleteRecipe(recipeId) {
    try {
        const response = await fetch(`/recipes/${recipeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Recipe deleted successfully!');
            window.location.href = '/recipes.html';
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete recipe');
        }
    } catch (err) {
        console.error('Error deleting recipe:', err);
        alert('An error occurred while trying to delete the recipe');
    }
}