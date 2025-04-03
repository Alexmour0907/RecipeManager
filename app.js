const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up database
const db = new Database('./Database/RecipeManager.db');

// Initialize database tables if they don't exist
function initializeDatabase() {
  // Create users table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `).run();

  // Create categories table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER
    )
  `).run();

  // Create recipes table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      category_id INTEGER,
      user_id INTEGER NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `).run();
}

// Run database initialization
initializeDatabase();

// Check if recipes table has is_favorite column, add if needed
try {
  const tableInfo = db.prepare("PRAGMA table_info(recipes)").all();
  const hasFavoriteColumn = tableInfo.some(column => column.name === 'is_favorite');
  
  if (!hasFavoriteColumn) {
    db.prepare("ALTER TABLE recipes ADD COLUMN is_favorite INTEGER DEFAULT 0").run();
    console.log("Added is_favorite column to recipes table");
  }
} catch (err) {
  console.error("Error updating recipes table:", err);
}

// Add default categories if they don't exist
function addDefaultCategories() {
  const defaultCategories = [
    'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Appetizers', 
    'Soups', 'Salads', 'Vegetarian', 'Vegan', 'Gluten-Free'
  ];
  
  const stmt = db.prepare("INSERT OR IGNORE INTO categories (name, user_id) VALUES (?, NULL)");
  
  defaultCategories.forEach(category => {
    try {
      stmt.run(category);
    } catch (err) {
      console.error(`Error adding default category ${category}:`, err);
    }
  });
  
  console.log("Default categories added");
}

// Call function to add default categories
addDefaultCategories();

// ======================== USER ROUTES ========================

// Register new user
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the new user
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);
    
    // Return success without any sensitive data
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      username: username,
      message: 'User registered successfully' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get user from database
    const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create response object WITHOUT sensitive data
    const userData = {
      id: user.id,
      username: user.username,
      message: 'Login successful'
    };
    
    res.json(userData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user account
app.delete('/users/:id', async (req, res) => {
  try {
    // Delete all user's recipes
    db.prepare('DELETE FROM recipes WHERE user_id = ?').run(req.params.id);
    
    // Delete user's custom categories
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(req.params.id);
    
    // Delete the user
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ======================== RECIPE ROUTES ========================

// Get all recipes for user
app.get('/recipes', (req, res) => {
  const userId = req.query.user_id;
  const favoritesOnly = req.query.favorites === '1';
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let query = 'SELECT * FROM recipes WHERE user_id = ?';
    let params = [userId];
    
    // Add filter for favorites if requested
    if (favoritesOnly) {
      query += ' AND is_favorite = 1';
    }
    
    // Add ordering
    query += ' ORDER BY id DESC';
    
    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (err) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe by ID
app.get('/recipes/:id', (req, res) => {
  try {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Get recipe error:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create new recipe
app.post('/recipes', (req, res) => {
  const { title, ingredients, instructions, category_id, user_id } = req.body;
  
  try {
    // Validate required fields
    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!user_id) {
      return res.status(401).json({ error: 'User must be logged in to create a recipe' });
    }

    const stmt = db.prepare(
      'INSERT INTO recipes (title, ingredients, instructions, category_id, user_id, is_favorite) VALUES (?, ?, ?, ?, ?, 0)'
    );
    const result = stmt.run(title, ingredients, instructions, category_id, user_id);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Recipe created successfully'
    });
  } catch (err) {
    console.error('Create recipe error:', err);
    res.status(400).json({ error: 'Failed to create recipe' });
  }
});

// Update existing recipe
app.put('/recipes/:id', (req, res) => {
  const { title, ingredients, instructions, category_id, user_id } = req.body;
  
  try {
    // Validate required fields
    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if recipe exists and if user is authorized to modify it
    const existingRecipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (user_id && existingRecipe.user_id != user_id) {
      return res.status(403).json({ error: 'Not authorized to modify this recipe' });
    }

    const stmt = db.prepare(
      'UPDATE recipes SET title = ?, ingredients = ?, instructions = ?, category_id = ? WHERE id = ?'
    );
    const result = stmt.run(title, ingredients, instructions, category_id, req.params.id);
    
    res.json({ message: 'Recipe updated successfully' });
  } catch (err) {
    console.error('Update recipe error:', err);
    res.status(400).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
app.delete('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if recipe belongs to user
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (recipe.user_id != userId) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }
    
    // Delete the recipe
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error('Delete recipe error:', err);
    res.status(400).json({ error: 'Failed to delete recipe' });
  }
});

// Toggle favorite status
app.put('/recipes/:id/favorite', (req, res) => {
  const recipeId = req.params.id;
  const userId = req.query.user_id;
  const isFavorite = req.body.is_favorite ? 1 : 0;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verify ownership
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?').get(recipeId, userId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found or not owned by user' });
    }
    
    // Update favorite status
    db.prepare('UPDATE recipes SET is_favorite = ? WHERE id = ?').run(isFavorite, recipeId);
    
    res.json({ 
      message: isFavorite ? 'Recipe added to favorites' : 'Recipe removed from favorites',
      is_favorite: !!isFavorite
    });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});

// ======================== CATEGORY ROUTES ========================

// Get all categories (both default and user-specific)
app.get('/categories', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    let categories;
    
    if (userId) {
      // Return default (null user_id) and user-specific categories
      categories = db.prepare('SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name').all(userId);
    } else {
      // Return only default categories
      categories = db.prepare('SELECT * FROM categories WHERE user_id IS NULL ORDER BY name').all();
    }
    
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category by ID
app.get('/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    console.error('Get category error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Get recipes by category
app.get('/categories/:id/recipes', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Only return recipes in this category that belong to the user
    const recipes = db.prepare('SELECT * FROM recipes WHERE category_id = ? AND user_id = ? ORDER BY id DESC')
      .all(req.params.id, userId);
      
    res.json(recipes);
  } catch (err) {
    console.error('Get recipes by category error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Create new category
app.post('/categories', (req, res) => {
  const { name, user_id } = req.body;
  
  try {
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    console.log('Creating category with data:', { name, user_id });
    
    // Check if category with this name already exists for this user
    const existingCategory = db.prepare('SELECT id FROM categories WHERE name = ? AND (user_id IS NULL OR user_id = ?)').get(name, user_id);
    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    
    const stmt = db.prepare('INSERT INTO categories (name, user_id) VALUES (?, ?)');
    const result = stmt.run(name, user_id || null);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      name: name,
      user_id: user_id,
      message: 'Category created successfully'
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// Delete category (only if it belongs to the user and has no recipes)
app.delete('/categories/:id', (req, res) => {
  const categoryId = req.params.id;
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if category exists and belongs to user
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Don't allow deletion of default categories
    if (category.user_id === null) {
      return res.status(403).json({ error: 'Default categories cannot be deleted' });
    }
    
    // Check if the category belongs to the user
    if (parseInt(category.user_id) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Not authorized to delete this category' });
    }
    
    // Check if any recipes use this category
    const recipesUsingCategory = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE category_id = ?').get(categoryId);
    
    if (recipesUsingCategory.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is used by recipes',
        recipeCount: recipesUsingCategory.count
      });
    }
    
    // Delete the category
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ======================== DASHBOARD ROUTE ========================

// Get dashboard data for user
app.get('/dashboard', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get recipe counts
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?').get(userId).count;
    const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ? AND is_favorite = 1').get(userId).count;
    const categoryCount = db.prepare('SELECT COUNT(DISTINCT category_id) as count FROM recipes WHERE user_id = ?').get(userId).count;
    
    // Get recent recipes (limit to 3)
    const recentRecipes = db.prepare('SELECT id, title, category_id, is_favorite FROM recipes WHERE user_id = ? ORDER BY id DESC LIMIT 3').all(userId);
    
    // Get favorite recipes (limit to 3)
    const favoriteRecipes = db.prepare('SELECT id, title, category_id, is_favorite FROM recipes WHERE user_id = ? AND is_favorite = 1 ORDER BY id DESC LIMIT 3').all(userId);
    
    res.json({
      stats: {
        totalRecipes: totalCount,
        favoriteRecipes: favoriteCount,
        categories: categoryCount
      },
      recentRecipes,
      favoriteRecipes
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ======================== ROOT ROUTE ========================

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Recipe Manager API. Available endpoints: /recipes, /categories, etc.');
});

// Start server
app.listen(port, () => {
  console.log(`Recipe Manager app listening at http://localhost:${port}`);
});