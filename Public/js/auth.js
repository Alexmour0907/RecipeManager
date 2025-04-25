/**
 * RecipeManager - Autentiseringsmodul
 * ------------------------------------
 * Denne filen håndterer all brukerautentisering i applikasjonen,
 * inkludert innlogging, registrering, sesjonsvalidering og utlogging.
 * 
 * Hovedfunksjonalitet:
 * - Kontrollerer tilgang til beskyttede sider basert på innloggingsstatus
 * - Håndterer innloggings- og registreringsskjemaer
 * - Lagrer brukerdata i lokal lagring for persistens mellom øktene
 * - Håndterer utloggingsprosess med bekreftelsesdialog
 * - Validerer brukerlegitimasjon mot serveren
 */

// Initialiser autentiseringsfunksjoner når DOM er lastet
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js ble lastet inn');
    
    // Opprett og legg til utloggingsmodalvinduet i DOM-strukturen
    // Dette sikrer at utloggingsbekreftelsen er tilgjengelig på alle sider
    createLogoutModal();
    
    // Sjekk om vi er på en innloggings- eller registreringsside
    // Dette hjelper med å justere navigasjonslogikken basert på sidetype
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('register.html');
    
    // Hent gjeldende brukerdata fra lokal lagring hvis tilgjengelig
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('Gjeldende bruker:', user);
    
    // Direkte omdirigering til innlogging hvis hjemmesiden besøkes uten innlogging
    // Dette sikrer at bare innloggede brukere kan se dashbordet
    if ((window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) && (!user || !user.id)) {
        console.log('Hjemmeside ble åpnet uten innlogging, omdirigerer til innloggingssiden');
        window.location.href = '/login.html';
        return;
    }
    
    // Håndter sidebeskyttelse for andre sider enn innlogging/registrering
    if (!isAuthPage) {
        // Definer hvilke sider som er offentlig tilgjengelige uten innlogging
        const publicPages = ['/', '/index.html', '/login.html', '/register.html'];
        const currentPath = window.location.pathname;
        
        // Hvis brukeren prøver å åpne en beskyttet side uten å være innlogget, omdiriger til innlogging
        if (!publicPages.includes(currentPath) && (!user || !user.id)) {
            console.log('Beskyttet side åpnet uten innlogging, omdirigerer');
            window.location.href = '/login.html';
            return;
        }
    }
    
    // Hvis på hjemmesiden og innlogget, sørg for at dashbordet vises med riktig brukernavn
    if ((window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) && user && user.id) {
        console.log('Bruker innlogget på hjemmesiden, viser dashbord');
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            dashboardView.style.display = 'block';
            
            // Sett brukernavnet i velkomstmeldingen for personalisering
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
        }
    }
    
    // Sett opp nødvendige hendelseslyttere for skjemaer og knapper
    setupEventListeners();
});

/**
 * Oppretter utloggingsbekreftelsesmodalvindu og legger det til i DOM
 * 
 * Dette modalvinduet gir en visuell bekreftelse før utlogging for å forhindre
 * utilsiktet utlogging og tap av ulagret arbeid. Det inkluderer både
 * "Avbryt" og "Logg ut"-knapper for å gi brukeren kontroll.
 */
function createLogoutModal() {
    // Sjekk om modalvinduet allerede eksisterer for å unngå duplisering
    if (!document.getElementById('logout-modal')) {
        // Definer HTML-strukturen for modalvinduet med ikonografi og knapper
        const modalHtml = `
            <div id="logout-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3><i class="fas fa-sign-out-alt"></i> Confirm Logout</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to log out?</p>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-logout" class="btn">Cancel</button>
                        <button id="confirm-logout" class="btn btn-danger">Log Out</button>
                    </div>
                </div>
            </div>
        `;
        
        // Legg til modalvinduet i slutten av body-elementet
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

/**
 * Setter opp hendelseslyttere for alle autentiseringsrelaterte elementer
 * 
 * Denne funksjonen kobler hendelseslyttere til skjemaer og knapper i brukergrensesnittet
 * som er relatert til autentisering, inkludert innloggings- og registreringsskjemaer,
 * utloggingsknapper og modalvinduinteraksjoner.
 */
function setupEventListeners() {
    // Innloggingsskjema - koble til hendelseshåndtereren
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Fant innloggingsskjema, legger til hendelseslytter');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.log('Innloggingsskjema ikke funnet på denne siden');
    }
    
    // Registreringsskjema - koble til hendelseshåndtereren
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Utloggingsknapper - både i hovednavigasjonen og på hjemmesiden
    // Bruker querySelector for å fange opp alle matchende elementer
    const logoutButtons = document.querySelectorAll('#logout-btn, #logout-btn-home');
    logoutButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Forhindre standardlenkeoppførsel
                showLogoutConfirmation(); // Vis bekreftelsesmodalvinduet
            });
        }
    });
    
    // Modalvindu-knapper for å avbryte og bekrefte utlogging
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', hideLogoutConfirmation);
    }
    
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', performLogout);
    }
    
    // Klikk på modaloverlaget for å avbryte (UX-forbedring)
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideLogoutConfirmation);
    }
    
    // ESC-tast for å lukke modalvinduet (tilgjengelighetsforsterkning)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
            hideLogoutConfirmation();
        }
    });
}

/**
 * Viser utloggingsbekreftelsesmodalvinduet
 * 
 * Denne funksjonen aktiverer modalvinduet ved å legge til CSS-klasser
 * som kontrollerer synlighet og animasjon av modalvinduet.
 */
function showLogoutConfirmation() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        // Legg til klasser som viser modalvinduet og låser bakgrunnen
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    }
}

/**
 * Skjuler utloggingsbekreftelsesmodalvinduet
 * 
 * Denne funksjonen bruker en kombinasjon av CSS-klasser og en tidsforsinkelse
 * for å skape en jevn utfading av modalvinduet før det skjules helt.
 */
function hideLogoutConfirmation() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        // Fjern 'show' klassen først for å starte utfadingsanimasjonen
        modal.classList.remove('show');
        
        // Vent på at animasjonen skal fullføres før vi frigjør bakgrunnen
        // Dette sikrer en jevn visuell overgang
        setTimeout(() => {
            document.body.classList.remove('modal-open');
        }, 300); // 300ms matcher vanligvis CSS-overgangsvarigheten
    }
}

/**
 * Utfører den faktiske utloggingsoperasjonen
 * 
 * Denne funksjonen håndterer alle aspekter ved utlogging:
 * - Fjerner brukerdata fra lokal lagring
 * - Lukker modalvinduet
 * - Omdirigerer til innloggingssiden
 */
function performLogout() {
    // Fjern brukerdata fra lokal lagring for å avslutte økten
    localStorage.removeItem('user');
    
    // Skjul bekreftelsesmodalvinduet når utloggingen er fullført
    hideLogoutConfirmation();
    
    // Omdiriger til innloggingssiden så brukeren kan logge inn på nytt
    window.location.href = '/login.html';
}

/**
 * Håndterer innloggingsskjemainnsendinger
 * 
 * Denne funksjonen validerer og sender innloggingsforespørsler til serveren,
 * oppdaterer brukergrensesnittet underveis for å vise status, og håndterer
 * både vellykkede innlogginger og feil som kan oppstå.
 * 
 * @param {Event} e - Skjemainnsendingshendelsen
 */
async function handleLogin(e) {
    // Forhindre standard skjemainnsending
    e.preventDefault();
    console.log('Innloggingsskjema innsendt');
    
    // Hent innloggingsdata fra skjemafeltene
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('Forsøker innlogging med brukernavn:', username);
    
    // Referanser til UI-elementer for å oppdatere status
    const errorElement = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Oppdater knappestatus for å vise laster-tilstand
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    // Fjern eventuelle tidligere feilmeldinger
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    try {
        // Send innloggingsforespørsel til API-et
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('Innloggingsrespons status:', response.status);
        const data = await response.json();
        console.log('Innloggingsresponsdata:', data);
        
        // Håndter mislykket innlogging
        if (!response.ok) {
            throw new Error(data.error || 'Ugyldig legitimasjon');
        }
        
        // Lagre brukerdata i lokal lagring for å opprettholde innloggingsstatusen
        localStorage.setItem('user', JSON.stringify(data));
        
        // Omdiriger til dashbordet (eksplisitt angi index.html for konsistens)
        window.location.href = '/index.html';
    } catch (err) {
        // Logg og vis feilmeldinger ved innloggingsproblemer
        console.error('Innloggingsfeil:', err);
        
        // Vis feilmelding til brukeren
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Tilbakestill knappen slik at brukeren kan prøve på nytt
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
}

/**
 * Håndterer registreringsskjemainnsendinger
 * 
 * Denne funksjonen validerer brukerens inndata, sender registreringsforespørsler
 * til serveren, og håndterer både vellykkede registreringer og feil som kan oppstå.
 * Den inkluderer validering av passordmatch og andre grunnleggende sjekker.
 * 
 * @param {Event} e - Skjemainnsendingshendelsen
 */
async function handleRegister(e) {
    // Forhindre standard skjemainnsending
    e.preventDefault();
    console.log('Registreringsskjema sendt inn');
    
    // Referanser til UI-elementer for å oppdatere status
    const errorElement = document.getElementById('register-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Oppdater knappestatus for å vise laster-tilstand
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }
    
    // Nullstill tidligere feilmeldinger og formater elementet for riktig stil
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.classList.remove('success-message');
        errorElement.classList.add('error-message');
    }
    
    try {
        // Hent brukerinndataene fra skjemafeltene
        const username = e.target.username.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;
        
        // Valider at passordene matcher før innsending til serveren
        // Dette er en viktig klientsideverifisering for å forbedre brukeropplevelsen
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        console.log('Sender registrering for:', username);
        
        // Send registreringsforespørsel til API-et
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        console.log('Registreringsrespons status:', response.status);
        const data = await response.json();
        console.log('Registreringsrespons data:', data);
        
        // Håndter mislykket registrering
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        // Vis suksessmelding til brukeren
        if (errorElement) {
            errorElement.textContent = 'Account created successfully! Redirecting to login...';
            errorElement.style.display = 'block';
            errorElement.classList.remove('error-message');
            errorElement.classList.add('success-message');
        }
        
        // Omdiriger til innloggingssiden etter en kort forsinkelse
        // Dette gir brukeren tid til å lese suksessmeldingen
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    } catch (err) {
        // Logg og vis feilmeldinger ved registreringsproblemer
        console.error('Registreringsfeil:', err);
        
        // Vis feilmelding til brukeren
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Tilbakestill knappen slik at brukeren kan prøve på nytt
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
}