/**
 * RecipeManager - Innloggings-Controller
 * -------------------------------------
 * Denne filen håndterer brukerautentisering og innloggingsprosessen.
 * 
 * Hovedfunksjoner:
 * - Validering av innloggingsskjema
 * - Innsending av brukerlegitimasjon til server
 * - Håndtering av innloggingssvar og feil
 * - Lagring av brukerdata ved vellykket innlogging
 * - Omdirigering til riktige sider basert på innloggingsstatus
 */

// Vent til DOM er fullstendig lastet
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser innloggingsskjemafunksjonalitet
    initializeLoginForm();
    
    // Sjekk om brukeren allerede er innlogget
    checkLoginStatus();
});

/**
 * Sjekker om brukeren allerede er innlogget
 * Omdirigerer til dashbord hvis en gyldig brukerøkt finnes
 */
function checkLoginStatus() {
    // Hent brukerdata fra lokal lagring
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Hvis vi er på innloggingssiden og brukeren allerede er innlogget,
    // omdiriger til dashbord
    if (user && user.id && window.location.pathname.includes('login.html')) {
        window.location.href = '/';
    }
}

/**
 * Setter opp hendelseslyttere og validering for innloggingsskjemaet
 */
function initializeLoginForm() {
    // Hent skjemaelementet
    const loginForm = document.getElementById('login-form');
    
    // Fortsett bare hvis skjemaet finnes på siden
    if (!loginForm) return;
    
    // Legg til innsendingshåndtering for skjemaet
    loginForm.addEventListener('submit', async (e) => {
        // Forhindre standard skjemainnsending
        e.preventDefault();
        
        // Hent skjemafeltene
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorDisplay = document.getElementById('login-error');
        
        // Grunnleggende validering
        if (!usernameInput.value.trim() || !passwordInput.value.trim()) {
            if (errorDisplay) {
                errorDisplay.textContent = 'Please enter both username and password';
                errorDisplay.style.display = 'block';
            }
            return;
        }
        
        // Forsøk innlogging med gitte legitimasjoner
        await attemptLogin(usernameInput.value, passwordInput.value, errorDisplay);
    });
}

/**
 * Sender innloggingsforespørsel til serveren og håndterer resultatet
 * 
 * @param {string} username - Brukernavnet som er angitt
 * @param {string} password - Passordet som er angitt
 * @param {HTMLElement} errorDisplay - Element for visning av feilmeldinger
 */
async function attemptLogin(username, password, errorDisplay) {
    try {
        // Forbered "innlasting"-tilstand
        const submitButton = document.querySelector('#login-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
        }
        
        // Send innloggingsforespørsel til serveren
        // Bruker Fetch API for å sende POST-forespørsel til '/login' endepunktet
        // inkluderer brukernavn og passord i JSON-format
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        // Parse JSON-svaret
        const data = await response.json();
        
        // Håndter innloggingsresultatet
        // Hvis svaret er OK, lagre brukerdata for å opprettholde økten
        // omdiriger til dashbordet
        if (response.ok) {
            // Vellykket innlogging - lagre brukerdata og omdiriger
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = '/';
        } else {
            // Vis feilmelding fra serveren
            if (errorDisplay) {
                errorDisplay.textContent = data.error || 'Login failed. Please check your credentials.';
                errorDisplay.style.display = 'block';
            }
        }
    } catch (err) {
        // Håndter nettverksfeil eller andre uventede problemer
        console.error('Login error:', err);
        
        if (errorDisplay) {
            errorDisplay.textContent = 'An error occurred during login. Please try again.';
            errorDisplay.style.display = 'block';
        }
    } finally {
        // Gjenopprett knappen til normal tilstand uansett resultat
        const submitButton = document.querySelector('#login-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    }
}