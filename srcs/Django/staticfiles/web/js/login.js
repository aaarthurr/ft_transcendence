// Fonction pour afficher le formulaire d'inscription
function showSignupForm() {
    let signupForm = document.getElementById("signupForm");
    let loginForm = document.getElementById("loginForm");

    // Fermer le formulaire de connexion s'il est ouvert
    loginForm.style.display = "none";
    loginForm.style.opacity = "0";
    loginForm.style.transform = "translateY(-10px)";

    // Afficher le formulaire d'inscription
    if (signupForm.style.display === "none" || signupForm.style.display === "") {
        signupForm.style.display = "flex";
        setTimeout(() => {
            signupForm.style.opacity = "1";
            signupForm.style.transform = "translateY(0)";
        }, 50);
    }
}

// Fonction pour afficher le formulaire de connexion
function showLoginForm() {
    let signupForm = document.getElementById("signupForm");
    let loginForm = document.getElementById("loginForm");

    // Fermer le formulaire d'inscription s'il est ouvert
    signupForm.style.display = "none";
    signupForm.style.opacity = "0";
    signupForm.style.transform = "translateY(-10px)";

    // Afficher le formulaire de connexion
    if (loginForm.style.display === "none" || loginForm.style.display === "") {
        loginForm.style.display = "flex";
        setTimeout(() => {
            loginForm.style.opacity = "1";
            loginForm.style.transform = "translateY(0)";
        }, 50);
    }
}
