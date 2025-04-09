const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('Public'));

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
      image_url TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `).run();
}

// Run database initialization
initializeDatabase();

// Check if recipes table has necessary columns, add if needed
try {
  const tableInfo = db.prepare("PRAGMA table_info(recipes)").all();
  
  // Check for is_favorite column
  const hasFavoriteColumn = tableInfo.some(column => column.name === 'is_favorite');
  if (!hasFavoriteColumn) {
    db.prepare("ALTER TABLE recipes ADD COLUMN is_favorite INTEGER DEFAULT 0").run();
    console.log("Added is_favorite column to recipes table");
  }
  
  // Check for image_url column
  const hasImageUrlColumn = tableInfo.some(column => column.name === 'image_url');
  if (!hasImageUrlColumn) {
    db.prepare("ALTER TABLE recipes ADD COLUMN image_url TEXT").run();
    console.log("Added image_url column to recipes table");
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

// Configure multer for image storage
const uploadDir = './Public/uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp-originalname
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

// Set up file filter to only accept images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer with our configuration
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

// ======================== IMAGE UPLOAD ROUTE ========================

// Handle image uploads
app.post('/upload', upload.single('recipeImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Send back the path to the uploaded file
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ======================== RECIPE ROUTES ========================

// Get all recipes for user (with category names)
app.get('/recipes', (req, res) => {
  const userId = req.query.user_id;
  const favoritesOnly = req.query.favorites === '1';
  const categoryId = req.query.category_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let query = `
      SELECT r.*, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ?
    `;
    let params = [userId];
    
    // Add filter for favorites if requested
    if (favoritesOnly) {
      query += ' AND r.is_favorite = 1';
    }
    
    // Add filter for category if provided
    if (categoryId) {
      query += ' AND r.category_id = ?';
      params.push(categoryId);
    }
    
    // Add ordering
    query += ' ORDER BY r.id DESC';
    
    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (err) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe by ID (with category name)
app.get('/recipes/:id', (req, res) => {
  try {
    const recipe = db.prepare(`
      SELECT r.*, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);
    
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
app.post('/recipes', async (req, res) => {
  try {
    const { title, ingredients, instructions, category_id, user_id, image_url, is_favorite } = req.body;
    
    // Debug logging
    console.log('Creating recipe with data:', req.body);
    console.log('is_favorite value received:', is_favorite);
    
    // Validate required fields
    if (!title || !ingredients || !instructions || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = db.prepare(`
      INSERT INTO recipes (title, ingredients, instructions, category_id, user_id, is_favorite, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, ingredients, instructions, category_id || null, user_id, is_favorite || 0, image_url || null);
    
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update existing recipe
app.put('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, ingredients, instructions, category_id, user_id, is_favorite, image_url } = req.body;
    
    // Validate required fields
    if (!title || !ingredients || !instructions || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Update with image_url field
    const result = db.prepare(`
      UPDATE recipes 
      SET title = ?, ingredients = ?, instructions = ?, category_id = ?, is_favorite = ?, image_url = ?
      WHERE id = ? AND user_id = ?
    `).run(title, ingredients, instructions, category_id || null, is_favorite || 0, image_url, id, user_id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found or you do not have permission to edit it' });
    }
    
    res.json({ message: 'Recipe updated successfully' });
  } catch (err) {
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
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
    const recipes = db.prepare(`
      SELECT r.*, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = ? AND r.user_id = ? 
      ORDER BY r.id DESC
    `).all(req.params.id, userId);
      
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
    const categoryCount = db.prepare('SELECT COUNT(DISTINCT category_id) as count FROM recipes WHERE user_id = ? AND category_id IS NOT NULL').get(userId).count;
    
    // Get recent recipes (limit to 3)
    const recentRecipes = db.prepare(`
      SELECT r.id, r.title, r.category_id, r.is_favorite, r.image_url, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? 
      ORDER BY r.id DESC LIMIT 3
    `).all(userId);
    
    // Get favorite recipes (limit to 3)
    const favoriteRecipes = db.prepare(`
      SELECT r.id, r.title, r.category_id, r.is_favorite, r.image_url, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_favorite = 1 
      ORDER BY r.id DESC LIMIT 3
    `).all(userId);
    
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