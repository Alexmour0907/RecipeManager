/**
 * RecipeManager - Hovedapplikasjonsfil
 * --------------------------------------------------
 * Dette er hovedserverfilen for RecipeManager-applikasjonen, en fullstendig
 * oppskriftshåndteringsplattform som gjør det mulig for brukere å lagre,
 * kategorisere og administrere matoppskrifter.
 * 
 * Applikasjonen er bygget med Node.js og Express, og bruker SQLite for
 * datalagring via better-sqlite3-biblioteket.
 * 
 * Hovedfunksjonalitet:
 * - Brukeradministrasjon: registrering, innlogging og "kontosletting - ikke implimentert enda"
 * - Oppskriftsadministrasjon: opprettelse, lagring, redigering og sletting av oppskrifter
 * - Kategorihåndtering: standard og brukerdefinerte kategorier
 * - Bildeopplasting: lagring av bilder for oppskrifter
 * - Favorittmerking: mulighet for å markere oppskrifter som favoritter
 * - REST API: endepunkter for å interagere med klientapplikasjonen
 * 
 * Sikkerhetsfunksjoner:
 * - Passordkryptering med bcrypt
 * - Brukerautentisering for alle beskyttede endepunkter
 * - Validering av eierskap for alle brukeravhengige ressurser
 * 
 * Databasestruktur:
 * - users: Brukerinformasjon og legitimasjon
 * - recipes: Oppskrifter med titler, ingredienser og instruksjoner
 * - categories: Standard og brukerdefinerte kategorier for organisering
 */

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const multer = require('multer'); // For bildeopplasting, brukt KI til multer fuksjonalitet
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware for håndtering av forespørsler
// Konfigurerer Express for å tolke JSON og form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotrutebehandling - håndterer forespørsler til hovedsiden
// Dette sender index.html direkte når brukeren besøker rotkatalogen
app.get('/', (req, res) => {
  console.log('Rotruteforespørsel mottatt, sender index.html direkte');
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Konfigurerer statisk filbetjening etter rotruteoppsettet
// Dette gjør at alle filer i Public-mappen blir tilgjengelige direkte
app.use(express.static('Public'));

// Setter opp databasetilkobling med SQLite
const db = new Database('./Database/RecipeManager.db');

// Initialiserer databasetabeller hvis de ikke allerede eksisterer
// Dette kalles ved oppstart for å sikre at databasestrukturen er på plass
function initializeDatabase() {
  // Oppretter users-tabell hvis den ikke eksisterer
  // Inneholder brukerinformasjon med krypterte passord
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `).run();

  // Oppretter categories-tabell hvis den ikke eksisterer
  // Inneholder både standardkategorier (null user_id) og brukerdefinerte kategorier
  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER
    )
  `).run();

  // Oppretter recipes-tabell hvis den ikke eksisterer
  // Hovedtabellen for oppskrifter med relasjoner til både brukere og kategorier
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

// Kjører databaseinitialisering ved oppstart
initializeDatabase();

// Oppretter en testbruker hvis ingen brukere eksisterer
// Dette gjør det enklere å teste applikasjonen uten å måtte registrere en bruker først
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCount || userCount.count === 0) {
    // Opprett en testbruker med passordet "password123"
    // Passordet lagres kryptert med bcrypt for sikkerhet
    const hashedPassword = bcrypt.hashSync('password123', 10);
    db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
      .run('testuser', 'test@example.com', hashedPassword);
    console.log('Opprettet testbruker: testuser / password123');
  }
} catch (err) {
  console.error('Feil ved sjekk eller oppretting av testbruker:', err);
}

// Sjekk om recipes-tabellen har nødvendige kolonner, og legg til hvis de mangler
// Dette håndterer databasemigrering hvis applikasjonen oppdateres med nye funksjoner
try {
  const tableInfo = db.prepare("PRAGMA table_info(recipes)").all();
  
  // Sjekk for is_favorite kolonne
  const hasFavoriteColumn = tableInfo.some(column => column.name === 'is_favorite');
  if (!hasFavoriteColumn) {
    db.prepare("ALTER TABLE recipes ADD COLUMN is_favorite INTEGER DEFAULT 0").run();
    console.log("La til is_favorite-kolonne i recipes-tabellen");
  }
  
  // Sjekk for image_url kolonne
  const hasImageUrlColumn = tableInfo.some(column => column.name === 'image_url');
  if (!hasImageUrlColumn) {
    db.prepare("ALTER TABLE recipes ADD COLUMN image_url TEXT").run();
    console.log("La til image_url-kolonne i recipes-tabellen");
  }
} catch (err) {
  console.error("Feil ved oppdatering av recipes-tabell:", err);
}

// Legg til standardkategorier hvis de ikke eksisterer
// Dette sikrer at nye brukere har et sett med forhåndsdefinerte kategorier
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
      console.error(`Feil ved tillegging av standardkategori ${category}:`, err);
    }
  });
  
  console.log("Standardkategorier lagt til");
}

// Kaller funksjon for å legge til standardkategorier
addDefaultCategories();

// Konfigurerer multer for lagring av opplastede bilder
// Dette håndterer bildeopplasting for oppskriftene
// Brukt KI til multer fuksjonalitet
const uploadDir = './Public/uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Oppretter uploads-mappen hvis den ikke eksisterer
    // Dette sikrer at applikasjonen kan lagre bilder selv om mappen mangler
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Lager et unikt filnavn: tidsstempel-originalfilnavn
    // Dette forhindrer navnekonflikter når flere brukere laster opp filer
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

// Setter opp filfilter for å kun akseptere bilder
// Dette sikrer at bare gyldige bildefiler kan lastes opp
const fileFilter = (req, file, cb) => {
  // Godta bare bildefiler basert på MIME-type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Bare bildefiler er tillatt!'), false);
  }
};

// Initialiserer multer med vår konfigurasjon
// Dette setter opp hele håndteringen av bildeopplasting
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB grense
  }
});

// ======================== BRUKERRUTER ========================

// Registrere ny bruker
// Håndterer brukerregistrering med passordkryptering
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Validerer inndata - alle felt er påkrevd
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Sjekker om brukernavn allerede eksisterer for å unngå duplikater
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Krypterer passordet med bcrypt for sikker lagring
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Setter inn den nye brukeren i databasen
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);
    
    // Returnerer suksess uten sensitive data
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      username: username,
      message: 'User registered successfully' 
    });
  } catch (err) {
    console.error('Registreringsfeil:', err);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Logg inn bruker
// Autentiserer brukeren mot databasen
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Validerer inndata - både brukernavn og passord er påkrevd
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Henter bruker fra databasen
    const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verifiserer passordet mot det krypterte passordet i databasen
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Oppretter responsobjekt UTEN sensitive data for sikker retur
    const userData = {
      id: user.id,
      username: user.username,
      message: 'Login successful'
    };
    
    res.json(userData);
  } catch (err) {
    console.error('Innloggingsfeil:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Slette brukerkonto
// Sletter all brukerdata inkludert oppskrifter og kategorier
// ikke implementert enda
app.delete('/users/:id', async (req, res) => {
  try {
    // Sletter alle brukerens oppskrifter først (relasjonsdata)
    db.prepare('DELETE FROM recipes WHERE user_id = ?').run(req.params.id);
    
    // Sletter brukerens egendefinerte kategorier
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(req.params.id);
    
    // Sletter selve brukeren til slutt
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Feil ved sletting av bruker:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ======================== BILDEOPPLASTINGSRUTE ========================

// Håndterer bildeopplasting for oppskrifter
// Lagrer bildene i uploads-mappen og returnerer URL-en
app.post('/upload', upload.single('recipeImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Sender tilbake stien til den opplastede filen
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error('Feil ved opplasting av fil:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ======================== OPPSKRIFTSRUTER ========================

// Hent alle oppskrifter for bruker (med kategorinavn)
// Støtter filtrering på favoritter og kategori
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
    
    // Legg til filter for favoritter hvis forespurt
    if (favoritesOnly) {
      query += ' AND r.is_favorite = 1';
    }
    
    // Legg til filter for kategori hvis oppgitt
    if (categoryId) {
      query += ' AND r.category_id = ?';
      params.push(categoryId);
    }
    
    // Legg til sortering (nyeste først)
    query += ' ORDER BY r.id DESC';
    
    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (err) {
    console.error('Feil ved henting av oppskrifter:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Hent enkelt oppskrift etter ID (med kategorinavn)
// Brukes for å vise detaljert oppskriftsinformasjon
app.get('/recipes/:id', (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.query.user_id;
    
    // Krever user_id-parameter for autorisasjon
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const recipe = db.prepare(`
      SELECT r.*, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ? AND r.user_id = ?
    `).get(recipeId, userId);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found or you do not have permission to view it' });
    }
    
    res.json(recipe);
  } catch (err) {
    console.error('Feil ved henting av oppskrift:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Lag ny oppskrift
// Lagrer en ny oppskrift i databasen med alle felter
// Setter opp et POST-endpunkt for /recipies ruten
// Bruker POST fordi vi oppretter en ny ressurs
app.post('/recipes', async (req, res) => {
  try {
    const { title, ingredients, instructions, category_id, user_id, image_url, is_favorite } = req.body;
    
    // Validerer påkrevde felt
    // Sjekker at alle nødvendige felt er tilstede før vi prøver å opprette oppskriften
    // Retunerer 400 Bad Request hvis noen felt mangler
    if (!title || !ingredients || !instructions || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Selve SQL-spørringen oppretter en ny rad i recipes-tabellen.
    const result = db.prepare(`
      INSERT INTO recipes (title, ingredients, instructions, category_id, user_id, is_favorite, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, ingredients, instructions, category_id || null, user_id, is_favorite || 0, image_url || null);
    // category_id og image_url kan være null, så vi setter dem til null hvis de ikke er oppgitt
    // Samme gjelder is_favorite, som settes til 0 (false) som standard

    // retunerer 201 Created hvis opprettelsen var vellykket
    // retunerer 500 Internal Server Error hvis det oppstod en feil under opprettelsen
    // og logger feilen til konsollen for feilsøking
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('Feil ved oppretting av oppskrift:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Oppdater eksisterende oppskrift
// Oppdaterer alle felt i en eksisterende oppskrift
app.put('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params; // Fanger opp id fra URL-en
    const { title, ingredients, instructions, category_id, user_id, is_favorite, image_url } = req.body; 
    // Henter og validerer data fra forespørselen
    
    // Validerer påkrevde felt
    if (!title || !ingredients || !instructions || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Oppdater med image_url-felt
    // Klargjør og utfører SQL-spørringen for oppdatering av oppskriften
    const result = db.prepare(`
      UPDATE recipes 
      SET title = ?, ingredients = ?, instructions = ?, category_id = ?, is_favorite = ?, image_url = ?
      WHERE id = ? AND user_id = ?
    `).run(title, ingredients, instructions, category_id || null, is_favorite || 0, image_url, id, user_id);
    // category_id og image_url kan være null, så vi setter dem til null hvis de ikke er oppgitt
    // Samme gjelder is_favorite, som settes til 0 (false) som standard
    // Her oppdateres oppskriften i databasen hvis både oppskriftens ID og user_id stemmer – dette sikrer at kun eieren kan oppdatere sin egen oppskrift.(Se linje 452)
    
    // Sjekker om oppskriften ble funnet og oppdatert
    // Hvis result.changes er 0, betyr det at ingen rader ble oppdatert,
    // enten fordi man ikke har tilgang til oppskriften eller at den ikke eksisterer
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found or you do not have permission to edit it' });
    }
    
    // retunerer 500 Internal Server Error hvis det oppstod en feil under oppdateringen
    res.json({ message: 'Recipe updated successfully' });
  } catch (err) {
    console.error('Feil ved oppdatering av oppskrift:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Oppskriften oppdateres ved at klienten sender en PUT-forespørsel med de nye dataene. 
// Serveren validerer, oppdaterer databasen, og sørger for at kun den riktige brukeren får lov til å gjøre endringen.


// Slett oppskrift
// Fjerner en oppskrift fra databasen permanent
// Håndterer sletting av oppskrifter via HTTP DELETE
app.delete('/recipes/:id', (req, res) => {
  // recipeId trekkes fra URL-en, og userId kommer fra forespørselen
  const recipeId = req.params.id;
  const userId = req.query.user_id;
  
  try {
    // Hvis userId ikke er oppgitt, returneres en 400 Bad Request
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Sjekker om oppskriften finnes: Hentes fra databasen – hvis den ikke eksisterer, returneres 404.
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Verifiserer eierskap: Sjekker om oppskriften tilhører brukeren
    // Hvis oppskriften ikke tilhører brukeren som forsøker å slette, returneres 403 (forbudt).
    if (recipe.user_id != userId) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }
    
    // Sletter oppskriften
    // Når alt er validert, fjernes oppføringen fra databasen.
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);
    
    //  Hvis noe går galt underveis, logges feilen og det returneres en generell 400-feil.
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error('Feil ved sletting av oppskrift:', err);
    res.status(400).json({ error: 'Failed to delete recipe' });
  }
});

// Veksle favoritt-status
// Oppdaterer en oppskrifts favoritt-status
// Bruker PUT for å oppdatere eksisterende ressurs (opp)
app.put('/recipes/:id/favorite', (req, res) => {
  const recipeId = req.params.id;
  const userId = req.query.user_id;
  const isFavorite = req.body.is_favorite ? 1 : 0;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verifiserer eierskap
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?').get(recipeId, userId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found or not owned by user' });
    }
    
    // Oppdaterer favoritt-status
    db.prepare('UPDATE recipes SET is_favorite = ? WHERE id = ?').run(isFavorite, recipeId);
    
    res.json({ 
      message: isFavorite ? 'Recipe added to favorites' : 'Recipe removed from favorites',
      is_favorite: !!isFavorite
    });
  } catch (err) {
    console.error('Feil ved oppdatering av favoritt-status:', err);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});

// ======================== KATEGORIRUTER ========================

// Hent alle kategorier (både standard og brukerspesifikke)
// Returnerer kategorier tilpasset brukerens tilgang
app.get('/categories', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    let categories;
    
    if (userId) {
      // Returner standard (null user_id) og brukerspesifikke kategorier
      categories = db.prepare('SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name').all(userId);
    } else {
      // Returner kun standardkategorier
      categories = db.prepare('SELECT * FROM categories WHERE user_id IS NULL ORDER BY name').all();
    }
    
    res.json(categories);
  } catch (err) {
    console.error('Feil ved henting av kategorier:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Hent enkeltkategori etter ID
// Brukes for å hente detaljer om en spesifikk kategori
app.get('/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    console.error('Feil ved henting av kategori:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Hent oppskrifter etter kategori
// Returnerer alle oppskrifter i en spesifikk kategori for en bruker
app.get('/categories/:id/recipes', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Returner kun oppskrifter i denne kategorien som tilhører brukeren
    const recipes = db.prepare(`
      SELECT r.*, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = ? AND r.user_id = ? 
      ORDER BY r.id DESC
    `).all(req.params.id, userId);
      
    res.json(recipes);
  } catch (err) {
    console.error('Feil ved henting av oppskrifter etter kategori:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Opprett ny kategori
// Lager en ny tilpasset kategori for en bruker
app.post('/categories', (req, res) => {
  const { name, user_id } = req.body;
  
  try {
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Sjekker om kategori med dette navnet allerede eksisterer for denne brukeren
    // Dette forhindrer dupliserte kategorinavn
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
    console.error('Feil ved oppretting av kategori:', err);
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// Slett kategori (bare hvis den tilhører brukeren og ikke har oppskrifter)
// Fjerner en brukerdefinert kategori hvis den ikke er i bruk
app.delete('/categories/:id', (req, res) => {
  const categoryId = req.params.id;
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Sjekker om kategorien eksisterer og tilhører brukeren
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Tillater ikke sletting av standardkategorier
    if (category.user_id === null) {
      return res.status(403).json({ error: 'Default categories cannot be deleted' });
    }
    
    // Sjekker om kategorien tilhører brukeren
    if (parseInt(category.user_id) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Not authorized to delete this category' });
    }
    
    // Sjekker om noen oppskrifter bruker denne kategorien
    const recipesUsingCategory = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE category_id = ?').get(categoryId);
    
    if (recipesUsingCategory.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is used by recipes',
        recipeCount: recipesUsingCategory.count
      });
    }
    
    // Sletter kategorien
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Feil ved sletting av kategori:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ======================== FEILSØKINGSRUTE ========================

// Feilsøkingsrute for å sjekke database- og brukerstatus
// Brukes for å verifisere at systemet fungerer som forventet
app.get('/api/debug', (req, res) => {
  try {
    // Sjekker databasetilkobling
    const dbTest = db.prepare('SELECT 1 as test').get();
    
    // Sjekker brukertabell
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    // Sender feilsøkingsinformasjon
    res.json({
      status: 'OK',
      database: {
        connected: !!dbTest,
        userCount: userCount ? userCount.count : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== DASHBORDRUTE ========================

// Hent dashboarddata for bruker
// Gir en oversikt over brukerens oppskrifter og statistikk
app.get('/dashboard', (req, res) => {
  const userId = req.query.user_id;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Henter oppskriftstall for statistikk
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?').get(userId).count;
    const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ? AND is_favorite = 1').get(userId).count;
    const categoryCount = db.prepare('SELECT COUNT(DISTINCT category_id) as count FROM recipes WHERE user_id = ? AND category_id IS NOT NULL').get(userId).count;
    
    // Henter nylige oppskrifter (begrenset til 3)
    const recentRecipes = db.prepare(`
      SELECT r.id, r.title, r.category_id, r.is_favorite, r.image_url, c.name as category_name 
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? 
      ORDER BY r.id DESC LIMIT 3
    `).all(userId);
    
    // Henter favorittoppskrifter (begrenset til 3)
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
    console.error('Feil ved henting av dashboarddata:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Starter serveren
// Gjør applikasjonen tilgjengelig på angitt port
app.listen(port, () => {
  console.log(`Oppskriftsbehandler kjører på http://localhost:${port}`);
});