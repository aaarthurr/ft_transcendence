/*------------------------ SETUP WEBSOCKET ------------------------- */


document.addEventListener("DOMContentLoaded", () => {
    console.log("🌐 Initialisation du WebSocket...");

    // Définition de l'URL WebSocket
    let url = `ws://${window.location.host}/ws/socket-server/`;
    window.mySocket = new WebSocket(url);

    // Connexion réussie
    window.mySocket.onopen = function () {
        console.log("✅ WebSocket connecté !");
    };

    // Gestion des erreurs
    window.mySocket.onerror = function (error) {
        console.error("❌ Erreur WebSocket :", error);
    };

    // Fermeture et tentative de reconnexion
    window.mySocket.onclose = function (event) {
        console.log("⚠️ WebSocket déconnecté. Reconnexion dans 3 secondes...:", event);
        setTimeout(() => {
            window.mySocket = new WebSocket(url); // Reconnexion
        }, 3000);
    };

	window.mySocket.onmessage = function(event) {
		console.log("📩 WebSocket message reçu:", event.data);
	
		const data = JSON.parse(event.data);
		console.log("📩 Données reçues:", data);
	
		if (data.type === "update_lists") {
			console.log("🔄 Mise à jour de la liste d'amis !");
			showFriendList();
			showFriendRequestList();
			showNotif(data.message)
		}
		else if (data.type === "update_messages") {
			console.log("new message recieved");
			fetchMessages();
		}
		else if (friendtrigger === 1 && data.type === "movement")
			movep2( data);

	};
});


/*--------SETUP---------*/
showFriendList();
showFriendRequestList();
let notifTimeout; // Variable pour stocker le timeout
let lastMessageTimestamp = 0;
/*------------------------------------FONCTION PRINCIPALE MOUVEMENT SUR LA PAGE-------------------------*/
var is_in_bottom = 1
function scrollToBottom()
{
    document.getElementById('bottomPage').scrollIntoView({ behavior: 'smooth' });
    is_in_bottom = 0;
}

function scrollToMainPage()
{
    if (is_in_bottom === 0)
    {
        is_in_bottom = 1
        document.getElementById('mainPage').scrollIntoView({ behavior: 'smooth' });
    }
}
/*----------------GAME STUFF--------------*/ 
function activateAiGame()
{
	let GameMenu = document.getElementById('GameMenu');
	let	TheGame = document.getElementById('TheGame');
	let	Scoreboard = document.getElementById('scoreboard');
	let winner = document.getElementById('winner');
	let returnButton = document.getElementById('ReturnButton');


	GameMenu.classList.add('inactive');
	TheGame.classList.add('active');
	Scoreboard.classList.add('active');
	winner.classList.remove('active');
	returnButton.classList.remove('active')
	aitrigger = 1;
}

function activateFriendMenu()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let returnButton = document.getElementById('ReturnButton');

	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	local.classList.add('active');
	online.classList.add('active');
	returnButton.classList.add('active')
}

function ChallengeFriend()
{
	let	friendMenu = document.getElementsByClassName('friendList');
	let friendTitle = document.getElementById('FriendTitle');
	let	TheGame = document.getElementById('TheGame');
	let	Scoreboard = document.getElementById('scoreboard');
	let winner = document.getElementById('winner');
	let returnButton = document.getElementById('ReturnButton');


	friendTitle.classList.remove('active');
	friendMenu[0].classList.remove('active');
	TheGame.classList.add('active');
	Scoreboard.classList.add('active');
	winner.classList.remove('active');
	returnButton.classList.remove('active')
	friendtrigger = 1;
	
}

function ShowFriendList_game()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let	friendList = document.getElementById('friendList');
	let	friendMenu = document.getElementsByClassName('friendList');
	let friends = document.getElementById('friend-list');
	let friendTitle = document.getElementById('FriendTitle');

	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	local.classList.remove('active');
	online.classList.remove('active');
	friendTitle.classList.add('active');
	friendMenu[0].classList.add('active');
	
	friendList.innerHTML = '';

    if (friends.children.length === 0) {
        friendList.insertAdjacentHTML(
            'beforeend',
            `<li class="material-symbols-outlined">Aucun ami trouvé</li>`
        );
        return;
    }

    // Loop through friends and append them correctly
    for (let i = 0; i < friends.children.length; i++) {
        let friendName = friends.children[i].textContent.trim(); // Get the name

        console.log(`Ajout d'un ami: ${friendName}`);

        friendList.insertAdjacentHTML(
            'beforeend',
            `<button onclick="ChallengeFriend()">${friendName}</button><br>`
        );
    }
}

function returnToMenu()
{
	let GameMenu = document.getElementById('GameMenu');
	let winner = document.getElementById('winner');

	GameMenu.classList.remove('inactive');
	winner.classList.remove('active');
	aitrigger = 0;

}
/*---------------------------------------*/
/*- - - - Our notif - - - -*/

function showNotif(message) {
    const notifBox = document.getElementById("notif-box");
    const notifMessage = document.getElementById("notif-message");

    notifMessage.textContent = message;
	notifBox.classList.remove("hide"); // Retire la classe pour masquer
    notifBox.classList.add("show"); // Ajoute la classe pour l’animation

    // Annuler le timeout précédent s'il existe
    if (notifTimeout) {
        clearTimeout(notifTimeout);
    }

    // Définir un nouveau timeout pour masquer après 3 sec
    notifTimeout = setTimeout(hideNotif, 3000);
}

function hideNotif() {
    const notifBox = document.getElementById("notif-box");
    notifBox.classList.remove("show"); // Retire la classe pour masquer
    notifBox.classList.add("hide"); // Ajoute la classe pour l’animation

}



/*----Function to show the friends menu-------*/


// Fonction pour gérer la position de la souris et activer/désactiver le menu
document.addEventListener('mousemove', function(event) {

    // Récupérer la position de la souris
    let mouseX = event.clientX;
    let pageWidth = window.innerWidth;
    
    // Calculer 15% de la largeur de la page
    let threshold = pageWidth * 0.15;
    // Vérifier si la souris est dans les 15% à gauche
    if (mouseX <= threshold && is_in_bottom === 1) {
        // Action quand la souris est dans les 15% à gauche
       // console.log("Souris dans les 15% à gauche - Activation");
        scrollToFriendMenu(true);  // Activer le menu si souris dans les 15% à gauche
    } else  if (mouseX > pageWidth * 0.30) {
        // Action quand la souris est en dehors des 15% à gauche
        //console.log("Souris en dehors des 15% à gauche - Désactivation");
        scrollToFriendMenu(false);  // Désactiver le menu si souris sort des 15% à gauche
    }
});

// Fonction pour afficher/masquer le menu en fonction de l'activation
function scrollToFriendMenu(activate) {
    var friendMenu = document.getElementById('friendMenu');
    
    if (activate) {

        // Si activé, rendre le menu visible
        friendMenu.classList.add('active');
        document.addEventListener('click', unscrollToFriendMenu); // Ajouter un écouteur de clic
    } else {
        // Si désactivé, rendre le menu invisible
        friendMenu.classList.remove('active');
    }
}

// Fonction pour gérer le clic en dehors du menu
function unscrollToFriendMenu(event) {
    var friendMenu = document.getElementById('friendMenu');

    if (!friendMenu.contains(event.target)) {  // Vérifie si le clic est en dehors du friendMenu
        friendMenu.classList.remove('active');  // Désactive le menu
        document.removeEventListener('click', unscrollToFriendMenu); // Enlève l'écouteur de clic
    }
}



document.addEventListener('mousemove', function(event) {
    // Récupérer la position de la souris
    let mouseX = event.clientX;
    let pageWidth = window.innerWidth;
    
    // Calculer 15% de la largeur de la page
    let threshold = pageWidth * 0.85;  // Position des 15% à droite (85% de la largeur totale)

    // Vérifier si la souris est dans les 15% à droite
    if (mouseX >= threshold && is_in_bottom === 1) {
        // Action quand la souris est dans les 15% à droite
       // console.log("Souris dans les 15% à droite - Activation");
        scrollToSettingsMenu(true);  // Activer le menu si souris dans les 15% à droite
    } else if (mouseX < pageWidth * 0.70)
    {
        // Action quand la souris est en dehors des 15% à droite
      //  console.log("Souris en dehors des 15% à droite - Désactivation");
        scrollToSettingsMenu(false);  // Désactiver le menu si souris sort des 15% à droite
    }
});

// Fonction pour gérer le clic en dehors du menu
function unscrollToSettingsMenu(event) {
    var settingsMenu = document.getElementById('settingsMenu');

    if (!settingsMenu.contains(event.target)) {  // Vérifie si le clic est en dehors du friendMenu
        friendMenu.classList.remove('active');  // Désactive le menu
        document.removeEventListener('click', unscrollToSettingsMenu); // Enlève l'écouteur de clic
    }
}

function scrollToSettingsMenu(activate) {
    var settingsMenu = document.getElementById('settingsMenu');
    
    if (activate ) {
        // Si activé, rendre le menu visible
        settingsMenu.classList.add('active');
        document.addEventListener('click', unscrollToSettingsMenu); // Ajouter un écouteur de clic
    } else {
        // Si désactivé, rendre le menu invisible
        settingsMenu.classList.remove('active');
    }
}





function fetchUsers(query = '') {
    fetch(`/search_users/?q=${query}`)
        .then(response => response.json())  
        .then(data => {
            const resultsContainer = document.getElementById("results");
            resultsContainer.innerHTML = '';

            if (data.users && data.users.length > 0) {
                data.users.slice(0, 5).forEach(user => {
                    const button = document.createElement("button");
                    button.textContent = user.username;
                    button.onclick = function() {
                        
                       // console.log(user.username);
                        friendOptionMenu(user);
                        // Appelle la fonction pour ajouter un ami
                    };
                    resultsContainer.appendChild(button);
                });
            } else {
                const li = document.createElement("li");
                li.textContent = "Aucun utilisateur trouvé";
                resultsContainer.appendChild(li);
            }
        })
        .catch(error => {
            console.error('Error fetching users:', error);""
        });
}


function friendOptionMenu(user) {
	//console.log("Friendoptionmenu open");
  //  console.log("Utilisateur reçu dans friendOptionMenu :", user);
  //  console.log("Utilisateur a l'ID", user.id);

    // Affiche les détails de l'utilisateur
	selectUserDisplay(user.id);

    document.getElementById("userDetails").classList.add("active");
    document.getElementById("userUsername").innerText = user.username;
	console.log(user.is_online);
    document.getElementById("userStatus").innerText = user.is_online;
    
    // Stocker l'ID de l'utilisateur cible dans le bouton
    document.getElementById("addFriendButton").setAttribute("data-user-id", user.id);
    document.getElementById("blockButton").setAttribute("data-user-id", user.id);

    document.getElementById("sendMessageBar").setAttribute("data-user-id", user.id);

	console.log("test");
	lastMessageTimestamp = 0;
	clearChat();
	fetchMessages();
}

function resetUserDetails() {
    document.getElementById("userDetails").classList.remove("active");
}


// Fonction pour lancer la recherche à chaque saisie dans la barre de recherche
function searchFriends() {
    const query = document.getElementById("searchBar").value;  // Récupère la valeur de la barre de recherche
    fetchUsers(query);  // Appelle fetchUsers avec la valeur de recherche
}



//
// --gestions des amis--
//
function addFriendRequest() {

   // console.log("addFriend lancé");

    // Récupérer l'ID de l'utilisateur cible depuis l'attribut data-user-id
    const toUserId = document.getElementById("addFriendButton").getAttribute("data-user-id");

    // Vérifie si l'ID est bien récupéré
	console.log(toUserId);

    if (!toUserId) {
        alert("Erreur : ID utilisateur manquant.");
        return;
    }

   // console.log("ID de l'utilisateur cible:", toUserId);  // Affiche l'ID de l'utilisateur dans la console

    // Envoi de la requête POST pour ajouter un ami, avec CSRF token
    fetch("/send-friend-request/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCSRFToken(),  // Récupère le CSRF token depuis le cookie
        },
        body: `to_user_id=${toUserId}`  // Envoie l'ID dans le corps de la requête
    })
    .then(response => response.json())
    .then(result => {
		selectUserDisplay(toUserId);
    })
    .catch(error => console.error("Erreur lors de l'envoi de la demande d'ami:", error));
}

function blockUser() {
	// Récupérer l'ID de l'utilisateur cible depuis l'attribut data-user-id
	const toUserId = document.getElementById("blockButton").getAttribute("data-user-id");

	// Vérifie si l'ID est bien récupéré
	console.log("id utilisateur ->", toUserId);

	if (!toUserId) {
		alert("Erreur : ID utilisateur manquant.");
		return;
	}
	// Envoi de la requête POST pour ajouter un ami, avec CSRF token
	fetch("/blockUser/", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-CSRFToken": getCSRFToken(),  // Récupère le CSRF token depuis le cookie
		},
		body: `to_user_id=${toUserId}`  // Envoie l'ID dans le corps de la requête
	})
	.then(response => response.json())
	.then(result => {
		selectUserDisplay(toUserId);
	})
	.catch(error => console.error("Erreur lors du blockage:", error));
}



async function isUserBlocked(toUserId) {
   return fetch(`/isUserBlocked/?to_user_id=${toUserId}`, {
	   method: "GET",
	   headers: { "Content-Type": "application/json" }
   })
   .then(response => response.json())
   .then(data => {
	   console.log("is user blocked:", data.is_blocked);
	   if (data.success) {
		   return data.is_blocked; // Retourne True ou False
	   } else {
		   console.error("Erreur API:", data.message);
		   return false; // Valeur par défaut en cas d'erreur
	   }
   })
   .catch(error => {
	   console.error("Erreur lors de la requête:", error);
	   return false;
   });
}

async function isUserFriend(toUserId) {
   return fetch(`/isUserFriend/?to_user_id=${toUserId}`, {
	   method: "GET",
	   headers: { "Content-Type": "application/json" }
   })
   .then(response => response.json())
   .then(data => {
	   console.log("is user friend:", data.is_friend);
	   if (data.success) {
		   return data.is_friend; // Retourne True ou False
	   } else {
		   console.error("Erreur API:", data.message);
		   return false;
	   }
   })
   .catch(error => {
	   console.error("Erreur lors de la requête:", error);
	   return false;
   });
}

function selectUserDisplay(toUserId) {
   Promise.all([isUserBlocked(toUserId), isUserFriend(toUserId)])
	   .then(([blocked, friend]) => {
		   console.log("Blocked:", blocked, "| Friend:", friend);

		   // Gérer l'affichage du blocage
		   document.getElementById("ifBlocked").style.display = blocked ? "block" : "none";
		   document.getElementById("ifUnblocked").style.display = blocked ? "none" : "block";

		   // Gérer l'affichage de l'amitié
		   document.getElementById("ifFriend").style.display = friend ? "block" : "none";
		   document.getElementById("ifNotFriend").style.display = friend ? "none" : "block";
	   });
}
function showFriendList() {
//	console.log("je rentre dans la foncition");
	
	// Requête AJAX pour obtenir la liste des amis
	console.log("FUNCTION CCALLED : showFriendList");
	fetch('/showFriendList/')  // URL de ta vue Django
		.then(response => response.json())  // On transforme la réponse en JSON
		.then(data => {
			const friendList = document.getElementById('friend-list');
			friendList.innerHTML = '';  // On vide la liste avant de la remplir

			if (data.success && data.friends.length > 0) {
				// Afficher chaque ami dans la liste
				data.friends.forEach(friend => {
                    const button = document.createElement("button");
                    button.textContent = friend.username;  // Affiche le nom de l'ami
					button.id = friend.username;
                    button.onclick = function() {
                     //   console.log(friend.username);
                        friendOptionMenu(friend);  // Appelle la fonction pour afficher les options d'ami
                    };
                    friendList.appendChild(button);  // Ajoute le bouton dans la liste
				});
			} else {
				// Si aucun ami, afficher ce message
				//console.log("jai trouve aucun amis miskine j'essaye de les afficher");
				const listItem = document.createElement('li');
				listItem.textContent = "Aucun ami ajouté pour le moment.";
				friendList.appendChild(listItem);
			}
		})
		.catch(error => {
			console.error('Erreur de récupération des amis:', error);
		});
}

function showFriendRequestList() {

    // Requête AJAX pour obtenir la liste des demandes d'amis
	console.log("FUNCTION CCALLED : showFriendRequestList");
    fetch('/showFriendRequestList/')  // URL de ta vue Django
        .then(response => {
            //console.log(response);  // Affiche la réponse brute
            return response.json();  // On transforme la réponse en JSON
        })
        .then(data => {
            const friendList = document.getElementById('friend-request-list');
            friendList.innerHTML = '';  // On vide la liste avant de la remplir

            if (data.success && data.friends.length > 0) {
                // Si des amis sont trouvés, on les affiche sous forme de boutons
                data.friends.forEach(friend => {
                    const button = document.createElement("button");
                    button.textContent = friend.username;  // Affiche le nom de l'ami
                    button.onclick = function() {
                     //   console.log(friend.username);
                        friendOptionMenu(friend);  // Appelle la fonction pour afficher les options d'ami
                    };
                    friendList.appendChild(button);  // Ajoute le bouton dans la liste
                });
            } else {
                // Si aucun ami, afficher ce message
             //   console.log("Aucun ami ajouté pour le moment.");
                const listItem = document.createElement('li');
                listItem.textContent = "Aucune demande d'ami pour le moment.";
                friendList.appendChild(listItem);
            }
        })
        .catch(error => {
            console.error('Erreur de récupération des demandes d\'amis:', error);
        });
}




// Fonction pour afficher une notification
function showNotification(message) {
    if (!("Notification" in window)) {
        alert("Votre navigateur ne supporte pas les notifications.");
    } else if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}








function getCSRFToken() {
    // Recherche le token CSRF dans le cookie ou dans le meta tag (selon ta config Django)
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    return csrfToken;
}





/*----------------ONLINE-STATUS-------------
window.addEventListener("beforeunload", function (event) {
    if (performance.getEntriesByType("navigation")[0].type !== "reload") { 
        // Type 1 means "refresh" 
        navigator.sendBeacon("/logoutOnClose/");
    }
});*/

function loggout() {
    fetch('/deconnexion/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(), // Include CSRF token for security
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Django expects some data, even an empty object
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Logout successful!");
            window.location.href = "/login/"; // Redirect after logout
        } else {
            console.error("Logout failed:", data.message);
        }
    })
    .catch(error => console.error("Error:", error));
}


/*- - -- - - CHAT FONCTIONS - - - - -*/

function scrollChatToBottom() {
	const chat = document.getElementById("userChat");

	chat.scrollTo({
		top: chat.scrollHeight,
		behavior: "smooth" // Animation fluide
	});
}

document.addEventListener("DOMContentLoaded", function () {
    // Sélection des éléments
	const input = document.getElementById("sendMessageBar"); // Récupère l'input
	const chat = document.getElementById("userChat"); // Récupère la div du chat

    // Fonction pour envoyer un message
	function sendMessage() {
		const messageText = input.value.trim(); // Récupère le texte et enlève les espaces inutiles
	
		if (messageText === "") return; // Empêche l'envoi d'un message vide
	
		const toUserId = input.getAttribute("data-user-id");

		// Vérifie si l'ID est bien récupéré
		console.log("ID ->", toUserId);

		if (!toUserId) {
			alert("Erreur : ID utilisateur manquant.");
			return;
		}
	
		// Vide l'input
		input.value = "";
	
	
		// Envoi du message au serveur Django
		fetch("/send-message/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCSRFToken() // Protection CSRF pour Django
			},
			body: JSON.stringify({  // Convertit en JSON
				to_user_id: toUserId,  
				message: messageText  
			})
		})
		.then(response => response.json())
		.then(data => {
			if (!data.success) {
				console.error("Erreur:", data.message);
				// Optionnel : afficher un message d'erreur à l'utilisateur
			}
		})
		.catch(error => console.error("Erreur lors de l'envoi:", error));
	}

    // Écoute l'événement "Enter" sur l'input
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Empêche le saut de ligne dans l'input
            sendMessage(); // Envoie le message
        }
    });
});

function clearChat() {
    const chat = document.getElementById("userChat");
    chat.innerHTML = '';  // Efface tout le contenu de la div
}

function fetchMessages() {
    console.log("Trying to fetch messages!");
    const toUserId = document.getElementById("sendMessageBar").getAttribute("data-user-id");
    const chat = document.getElementById("userChat");

    let url = `/get-messages/?to_user_id=${toUserId}`;
    if (lastMessageTimestamp) {
        url += `&timestamp=${encodeURIComponent(lastMessageTimestamp)}`;
    }

    fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            data.messages.forEach(msg => {
                const messageDiv = document.createElement("div");
                messageDiv.classList.add(msg.sender == toUserId ? "received-message" : "sent-message");
                messageDiv.textContent = msg.content;
                chat.appendChild(messageDiv);
                console.log("New message shown -> ", messageDiv);

                lastMessageTimestamp = msg.timestamp; // Met à jour le dernier timestamp
            });

            scrollChatToBottom();
        }
    })
    .catch(error => console.error("Erreur lors de la récupération des messages:", error));
}
