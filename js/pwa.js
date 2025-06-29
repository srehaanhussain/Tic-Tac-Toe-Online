// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Handle install buttons
let deferredPrompt;
const authInstallButton = document.getElementById('authInstallButton');
const authInstallButtonContainer = document.getElementById('authInstallButtonContainer');
const profileInstallButton = document.getElementById('profileInstallButton');
const profileInstallButtonContainer = document.getElementById('profileInstallButtonContainer');

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Install prompt triggered');
    e.preventDefault();
    deferredPrompt = e;
    authInstallButtonContainer.style.display = 'block';
    profileInstallButtonContainer.style.display = 'block';
});

// Check if the app is already installed
window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed');
    authInstallButtonContainer.style.display = 'none';
    profileInstallButtonContainer.style.display = 'none';
});

// Check if the app is running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App is running in standalone mode');
    authInstallButtonContainer.style.display = 'none';
    profileInstallButtonContainer.style.display = 'none';
}

// Handle auth section install button
authInstallButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        authInstallButtonContainer.style.display = 'none';
        profileInstallButtonContainer.style.display = 'none';
    }
});

// Handle profile section install button
profileInstallButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        authInstallButtonContainer.style.display = 'none';
        profileInstallButtonContainer.style.display = 'none';
    }
});