function getCSRFToken() {
    // Recherche le token CSRF dans le cookie ou dans le meta tag (selon ta config Django)
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    return csrfToken;
}





document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("signupForm");

    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent default form submission

        const email = form.querySelector("input[name='email']").value;
        const nickname = form.querySelector("input[name='nickname']").value;
        const password = form.querySelector("input[name='password']").value;
        const confirmPassword = form.querySelector("input[name='confirm_password']").value;

        console.log(email, nickname, password, confirmPassword);

        // Check if passwords match before making a request
        if (password !== confirmPassword) {
            alert("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            // Send the signup request to Django's inscription view
            const response = await fetch("/inscription/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken() // Django CSRF protection
                },
                body: JSON.stringify({ email, nickname, password, confirm_password: confirmPassword }),
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.message); // Show error message from Django
                return;
            }

            // If the signup is successful, show the success message
            alert(data.message);

            // Now, redirect to the home page
            window.location.href = "/"; // Redirect to the home page, where user data is fetched

        } catch (error) {
            console.error("Erreur lors de l'inscription :", error);
            alert("Une erreur s'est produite. Veuillez réessayer.");
        }
    });
});






document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginFormElement");

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent default form submission

        const email = loginForm.querySelector("input[name='email']").value;
        const password = loginForm.querySelector("input[name='password']").value;

        try {
            const response = await fetch("/connexion/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(), // Django CSRF protection
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.message); // Display error message from the server
                return;
            }

            alert("Connexion réussie !");
            window.location.href = "/"; // Redirect on success
        } catch (error) {
            console.error("Erreur lors de la connexion :", error);
            alert("Une erreur s'est produite. Veuillez réessayer.");
        }
    });
});





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

function connectWithApi() {
    // This will redirect the browser to 42's OAuth authorization page
    window.location.href = '/auth/42/';
}
