let MenuTrigger = 0;
/*-----------------------LOGIN PAGE--------------------------------*/
window.onload = is_loged;

function is_loged() {
    let isAuthenticated = document.body.getAttribute("data-authenticated") === "true";
	if (isAuthenticated === true)
		showMainPage();
	else
		showLoginPage();
	showFriendList();
	showFriendRequestList();
}



function showMainPage() {
	document.getElementById('login').style.display = 'none';
	document.getElementById('index').style.display = 'block';
  }
  
  function showLoginPage() {
	document.getElementById('index').style.display = 'none';
	document.getElementById('login').style.display = 'block';
  }


/*------------------------ SETUP WEBSOCKET ------------------------- */


document.addEventListener("DOMContentLoaded", () => {
    console.log("🌐 Initialisation du WebSocket...");

    // Définition de l'URL WebSocket
    let url = `wss://${window.location.host}/ws/socket-server/`;
    window.mySocket = new WebSocket(url);

    // Connexion réussie
    window.mySocket.onopen = function () {
        console.log("✅ WebSocket connecté !");
		//set_user_status(1);
    };

    // Gestion des erreurs
    window.mySocket.onerror = function (error) {
        console.error("❌ Erreur WebSocket :", error);
    };

    // Fermeture et tentative de reconnexion
    window.mySocket.onclose = function (event) {
        console.log("⚠️Websocket déconnecté , reconnexion dans 3 secondes...:", event);
        setTimeout(() => {
            window.mySocket = new WebSocket(url); // Reconnexion
        }, 3000);
		//set_user_status(0);
    };

	window.mySocket.onmessage = function(event) {
		//console.log("📩 WebSocket message reçu:", event.data);
	
		const data = JSON.parse(event.data);
		//console.log("📩 Données reçues:", data);
	
		if (data.type === "update_lists") {
			//console.log("🔄 Mise à jour de la liste d'amis !");
			showFriendList();
			showFriendRequestList();
			selectUserDisplay(data.user_id);
			showNotif(data.message);
		}
		else if (data.type === "update_messages") {
			//console.log("new message recieved");
			fetchMessages();
		}
		else if (friendtrigger === 1)
		{
			if (data.type === "movement")
				p2.y = data.position.y;
			else if (data.type === "ball_movement" && hostname === p2_username)
			{
				clienttrigger = 1;
				move_remote_ball(data);
			}
		}
		if (data.type === "game_invite")
		{
			showNotif("New game invite !");
			handleGameInvite(data);
		}
		else if (data.type === "accept")
		{
			let loading = document.getElementById("loading");
			loading.classList.remove("active");
			activateFriendGame()
		}
		else if (data.type == "decline")
		{
			let loading = document.getElementById("loading");
			let returnButton = document.getElementById('ReturnButton');
			let cant_play = document.getElementById('cant_play');

			loading.classList.remove("active");
			returnButton.classList.add('active');
			user_id = "";
			p2_username = "";
			cant_play.innerText = "";
			cant_play.innerText = "P2  declined";
			cant_play.classList.add('active');
			p2_username = '';
			MenuTrigger = 3;

		}

		else if (data.type === "match_tournament")
		{

			let waitingPage =  document.getElementById("waitingPage");
			waitingPage.classList.remove('active');
			
			if (data.is_hosting == "true")
			{
				user_id = data.opponent.id;
				p2_username = data.opponent.username;
				friendtrigger = 1;	
				in_tournament = 1;
				tournamentRound = data.round;
				console.log("round" + tournamentRound);
				alert("Le match contre : " + p2_username + " va commencer !");
				activateFriendGame();
			}
			else
			{
				hostname = data.opponent.username;
				user_id = data.opponent.id;
				p2_username = data.opponent.username
				friendtrigger = 1;
				in_tournament = 1
				tournamentRound = data.round;
				console.log("round" + tournamentRound);
				alert("Le match contre : " + p2_username + " va commencer !");
				activateFriendGame();

			}		
		}
		else if (data.type ==="notify_join_tournament")
		{
			if (data.is_hosting)
			{
				getTournamentPlayers_Create(data.tournament_id);
			}
			else
			{
				getTournamentPlayers_Join(data.tournament_id);
			}

			if (data.message === "is_destroyed")
			{
				returnToPreviousMenu();
			}		
		}
		else if (data.type ==="new_tournament")
		{
			getAllTournaments()
		}
		if (data.type === "opponent_disconnected")
			{
				reInitialize_bis()
			}
		
	};



	const canvas =  document.getElementById("TheGame");
	function reInitialize_bis()
	{
		let cant_play = document.getElementById("cant_play");

		cant_play.classList.remove('active');
		if (in_tournament === 1)
			{
				if (tournamentRound === 0)
				{
					
					if (p1.points === 5 && friendtrigger === 1)
					{
						alert("deuxieme manche");
						tournamentRound++;
						secondRound(1);	

					}
					else if (p2.points === 5 && friendtrigger === 1)
					{
						in_tournament = 0;
						tournamentRound = 0;
						secondRound(0)
						mainPageButton.classList.remove("disabled");


					}
					
				}
				else if (tournamentRound === 1)
				{
					alert("troisieme manche");
					if (p1.points === 5 && friendtrigger === 1)
					{
						tournamentRound++;
						lastRound(1);	
						
					}
					else if (p2.points === 5 && friendtrigger === 1)
					{
						in_tournament = 0;
						tournamentRound = 0;
						lastRound(0)
						mainPageButton.classList.remove("disabled");
					}
				}
				else if (tournamentRound === 2)
				{
					if (p1.points === 5 && friendtrigger === 1)
					{
						alert("vous avez gagné");
						finishTournament(1);		
					}
					else if (p2.points === 5 && friendtrigger === 1)
					{
						finishTournament(0);
						
					}
					mainPageButton.classList.remove("disabled");
					in_tournament = 0;
					tournamentRound = 0;
				}
			}
			if (friendtrigger === 1 && in_tournament === 0) {
			let TheGame = document.getElementById('TheGame');
			let scoreboard = document.getElementById('scoreboard');
			let winText = document.getElementById('winText');
			let winner = document.getElementById('winner');
			let mainPageButton = document.getElementById("toMainPageButton");
			
			mainPageButton.classList.remove("disabled");
			TheGame.classList.remove('active');
			scoreboard.classList.remove('active');
			winText.innerText = "";
			winText.innerText += "P2 disconnected";
			winner.classList.add('active');
			ball.x = canvas.width / 2;
			ball.y = canvas.height / 2;
			p1.y = canvas.height / 2;
			p2.y = canvas.height / 2;
			p2.points = 0;
			p1.points = 0;
			trigger = 0;
			aitrigger = 0;
			friendtrigger = 0;
			hostname = "       ";
			user_id = "";
			}
		}
		showMatchHistory();
});


/*--------SETUP---------*/


let notifTimeout; // Variable pour stocker le timeout
let lastMessageTimestamp = 0;
let settingDisplayType = 0;

// Global variable to store the chart instance
let winLossChartInstance;
let winLossChartInstance_user;
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

function showMatchHistory() {
    let matchHistory = document.getElementById("matchHistory");

    fetch('/match-history/')
    .then(response => response.json())
    .then(data => {
        matchHistory.innerHTML = '';  // Clear existing matches

        if (data.match_history.length === 0) {
            matchHistory.innerHTML = '<p class="user-info">No matches found.</p>';
        } else {
            data.match_history.forEach(match => {
                matchHistory.insertAdjacentHTML(
                    'beforeend',
                     `<li class="user-info">Opponent: ${match.opponent} | Result: ${match.result} | Score: ${match.score_player} - ${match.score_opponent}</li>`
                );
            });
        }
    })
    .catch(error => console.error("Error fetching match history:", error));
}

function returnToPreviousMenu()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let	friendMenu = document.getElementsByClassName('friendList');
	let friendTitle = document.getElementById('FriendTitle');
	let returnButton = document.getElementById('ReturnButton');
	let cant_play = document.getElementById('cant_play');
	let mainPageButton = document.getElementById("toMainPageButton");
	let GameMenu = document.getElementById("GameMenu");

	let tournamentButton = document.getElementById('Tournament');
	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');

	let joinPage = document.getElementById('joinPage');
	let createPage = document.getElementById('createPage');
			
	mainPageButton.classList.remove("disabled");
	returnButton.classList.add('active');
	if (MenuTrigger === 1)
	{
		returnButton.classList.remove('active');
		MenuTrigger = 0;
		VsAi.classList.remove('inactive');
		VsFriend.classList.remove('inactive');
		local.classList.remove('active');
		online.classList.remove('active');
		tournamentButton.classList.remove('inactive');


		createMenu.classList.remove('active');
		joinMenu.classList.remove('active');

		createPage.classList.remove('active');
		joinPage.classList.remove('active');
		returnButton.classList.remove('active');
		GameMenu.classList.remove('inactive');
		cant_play.classList.remove('active');

	}
	else if (MenuTrigger === 2)
	{
		MenuTrigger = 1;
		local.classList.add('active');
		online.classList.add('active');
		friendTitle.classList.remove('active');
		friendMenu[0].classList.remove('active');
		GameMenu.classList.remove('inactive');
		createMenu.classList.remove('active');
		joinMenu.classList.remove('active');
		createPage.classList.remove('active');
		joinPage.classList.remove('active');
		returnButton.classList.add('active');
		cant_play.classList.remove('active');


	}
	else if (MenuTrigger === 3)
	{
		MenuTrigger = 2;
		cant_play.classList.remove('active');
		friendTitle.classList.add('active');
		friendMenu[0].classList.add('active');
		VsAi.classList.add('inactive');
		VsFriend.classList.add('inactive');
		tournamentButton.classList.add('inactive');


		online.classList.remove('active');
		local.classList.remove('active');
	
		returnButton.classList.add('active');
	}
	else if (MenuTrigger === 4)
	{
		MenuTrigger = 1;


		createMenu.classList.add('active');
		joinMenu.classList.add('active');
		createPage.classList.remove('active');
		joinPage.classList.remove('active');


	}
	else if (MenuTrigger === 5)
	{
		MenuTrigger = 4;


		createPage.classList.add('active');
		joinPage.classList.add('active');
		createMenu.classList.remove('active');
		joinMenu.classList.remove('active');


	}
}

function activateAiGame()
{
	let GameMenu = document.getElementById('GameMenu');
	let	TheGame = document.getElementById('TheGame');
	let	Scoreboard = document.getElementById('scoreboard');
	let winner = document.getElementById('winner');
	let returnButton = document.getElementById('ReturnButton');
	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');
	let aiDifficulty = document.getElementById('ai-difficulty')
	let mainPageButton = document.getElementById("toMainPageButton");
			
	mainPageButton.classList.add("disabled");
	returnButton.classList.remove('active');
	GameMenu.classList.add('inactive');
	TheGame.classList.add('active');
	Scoreboard.classList.add('active');
	winner.classList.remove('active');
	aiDifficulty.classList.add('active');
	aitrigger = 1;
	trigger = 0;
	createMenu.classList.add('inactive');
	joinMenu.classList.add('inactive');
}

function activateLocalGame()
{
	let GameMenu = document.getElementById('GameMenu');
	let	TheGame = document.getElementById('TheGame');
	let	Scoreboard = document.getElementById('scoreboard');
	let winner = document.getElementById('winner');
	let returnButton = document.getElementById('ReturnButton');
	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');
	let mainPageButton = document.getElementById("toMainPageButton");
			
	mainPageButton.classList.add("disabled");
	returnButton.classList.remove('active');
	GameMenu.classList.add('inactive');
	TheGame.classList.add('active');
	Scoreboard.classList.add('active');
	winner.classList.remove('active');
	localtrigger = 1;
	trigger = 0;
	createMenu.classList.add('inactive');
	joinMenu.classList.add('inactive');
}

function activateFriendMenu()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let returnButton = document.getElementById('ReturnButton');
	let tournamentButton = document.getElementById('Tournament');

	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');

	MenuTrigger = 1;
	returnButton.classList.add('active');
	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	tournamentButton.classList.add('inactive');
	local.classList.add('active');
	online.classList.add('active');
	createMenu.classList.add('inactive');
	joinMenu.classList.add('inactive');
}


function activateTournament()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let returnButton = document.getElementById('ReturnButton');

	let tournamentButton = document.getElementById('Tournament');

	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');

	MenuTrigger = 1;


	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	online.classList.remove('active');
	local.classList.remove('active');

	createMenu.classList.add('active');
	joinMenu.classList.add('active');

	
	tournamentButton.classList.add('inactive');


	returnButton.classList.add('active');
	

}

function joinTournamentMenu()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let returnButton = document.getElementById('ReturnButton');
	let tournamentButton = document.getElementById('Tournament');
	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');
	let joinPage = document.getElementById('joinPage');
	let createPage = document.getElementById('createPage');


	MenuTrigger = 4;


	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	online.classList.remove('active');
	local.classList.remove('active');

	createMenu.classList.remove('active');
	joinMenu.classList.remove('active');

	createPage.classList.remove('active');
	joinPage.classList.add('active');
	tournamentButton.classList.add('inactive');


	returnButton.classList.add('active');
	joinTournamentFunction();

}
function createTournamentMenu()
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let returnButton = document.getElementById('ReturnButton');

	let tournamentButton = document.getElementById('Tournament');

	let joinMenu = document.getElementById('joinMenu');
	let createMenu = document.getElementById('createMenu');


	MenuTrigger = 4;


	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	online.classList.remove('active');
	local.classList.remove('active');

	createMenu.classList.remove('active');
	joinMenu.classList.remove('active');

	createPage.classList.add('active');
	joinPage.classList.remove('active');

	tournamentButton.classList.add('inactive');



	returnButton.classList.add('active');
	
	createTournamentFunction();
}

function activateFriendGame()
{
	let	friendMenu = document.getElementsByClassName('friendList');
	let friendTitle = document.getElementById('FriendTitle');
	let	TheGame = document.getElementById('TheGame');
	let	Scoreboard = document.getElementById('scoreboard');
	let winner = document.getElementById('winner');
	let	createMenu = document.getElementById('createMenu');
	let joinMenu = document.getElementById('joinMenu');
	let	createPage = document.getElementById('createPage');
	let joinPage = document.getElementById('joinPage');
	let mainPageButton = document.getElementById("toMainPageButton");
			
	mainPageButton.classList.add("disabled");


	fetch(`/connect_match/?user_id=${user_id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCSRFToken(),  // Récupère le CSRF token depuis le cookie
        },
		body: `user_id=${user_id}`,
	})
	friendtrigger = 1;
	createPage.classList.remove('active');
	joinPage.classList.remove('active');
	createMenu.classList.remove('active');
	joinMenu.classList.remove('active');
	friendTitle.classList.remove('active');
	friendMenu[0].classList.remove('active');
	TheGame.classList.add('active');
	Scoreboard.classList.add('active');
	winner.classList.remove('active');
	console.log("friendtrigger2: ", friendtrigger);
}

function handleGameInvite(_data)
{
	let GameInvite = document.getElementById('GameInvite');
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let	friendMenu = document.getElementsByClassName('friendList');
	let friendTitle = document.getElementById('FriendTitle');
	let returnButton = document.getElementById('ReturnButton');
	let winner = document.getElementById('winner');
	let tournamentButton = document.getElementById('Tournament');

	
//	console.log("_data.hostname:", _data.hostname);
	fetch(`/search_users/?q=${_data.hostname}`) // make a global setup
	.then(response => response.json())
	.then(data => {
		if (friendtrigger === 1 || aitrigger === 1 || localtrigger === 1)
			declineGameInvite(data.users[0].id)
		else if (data.users && data.users[0].username === _data.hostname)
		{
			user_id = data.users[0].id;
			VsAi.classList.add('inactive');
			VsFriend.classList.add('inactive');
			local.classList.remove('active');
			online.classList.remove('active');
			friendTitle.classList.remove('active');
			friendMenu[0].classList.remove('active');
			returnButton.classList.remove('active');
			winner.classList.remove('active');
			GameInvite.classList.add('active');
			tournamentButton.classList.add('inactive');
		}
	})
	hostname = _data.hostname;
}

function acceptGameInvite()
{
	let GameInvite = document.getElementById('GameInvite');

	GameInvite.classList.remove('active');
	if (window.mySocket.readyState === WebSocket.OPEN) {
		const sending_data = {
			type: "accept",
			player_id: p1_username,
			target_group: "user_" + user_id,
		}
		window.mySocket.send(JSON.stringify(sending_data));
	}
	p2_username = hostname;
	activateFriendGame();
}

function declineGameInvite(_user_id)
{
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let GameInvite = document.getElementById('GameInvite');
	let mainPageButton = document.getElementById("toMainPageButton");
			
	mainPageButton.classList.remove("disabled");
	VsAi.classList.remove('inactive');
	VsFriend.classList.remove('inactive');
	GameInvite.classList.remove('active');
	if (window.mySocket.readyState === WebSocket.OPEN) {
		const sending_data = {
			type: "decline",
			player_id: p1_username,
			target_group: "user_" + _user_id,
		}
		window.mySocket.send(JSON.stringify(sending_data));
	}
}

function ChallengeFriend(_p2_username)
{
	let loading = document.getElementById("loading");
	let	friendMenu = document.getElementsByClassName('friendList');
	let friendTitle = document.getElementById('FriendTitle');
	let returnButton = document.getElementById('ReturnButton');
	let winner = document.getElementById('winner');
	let cant_play = document.getElementById('cant_play');
	let GameMenu = document.getElementById('GameMenu');

	winner.classList.remove('active');
	friendTitle.classList.remove('active');
	friendMenu[0].classList.remove('active');
	GameMenu.classList.add('inactive');
	console.log("_p2_username: ", _p2_username);
	fetch(`/search_users/?q=${_p2_username}`) // make a global setup
	.then(response => response.json())
	.then(data => {
		if (data.users)
		{
			console.log("data.users[0].in tournament: ", data.users[0].in_tournament);
			if (data.users[0].in_tournament === true)
			{
				cant_play.innerText = "";
				cant_play.innerText = "Can't send game invite: p2 is in a tournament";
				cant_play.classList.add('active');
				p2_username = '';
				MenuTrigger = 3;
				returnButton.classList.add('active');
			}
			get_user_status(data.users[0].id)
			.then( user_status => {
				console.log("data.users[0].username",data.users[0].username , "user_status",  user_status);

				if (user_status == false)
				{
					cant_play.innerText = "";
					cant_play.innerText = "Can't send game invite: p2 is offline";
					cant_play.classList.add('active');
					p2_username = '';
					MenuTrigger = 3;
					returnButton.classList.add('active');
					}
				else if (data.users[0].username === _p2_username)
				{
					user_id = data.users[0].id;
					if (window.mySocket.readyState === WebSocket.OPEN) {
						const sending_data = {
							type: "game_invite",
							hostname: p1_username,
							target_group: "user_" + user_id,
						}
						window.mySocket.send(JSON.stringify(sending_data));
						MenuTrigger = 3;
						loading.classList.add("active");
						returnButton.classList.remove('active');
						p2_username = _p2_username;
					}
				}
			})
		}
	})
}

function rePlay()
{
	let winner = document.getElementById('winner');

	winner.classList.remove('active');
	if (MenuTrigger === 0)
		activateAiGame();
	else if (p2_username)
		ChallengeFriend(p2_username);
	else
		activateLocalGame();
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

	MenuTrigger = 2;
	VsAi.classList.add('inactive');
	VsFriend.classList.add('inactive');
	local.classList.remove('active');
	online.classList.remove('active');
	friendTitle.classList.add('active');
	friendMenu[0].classList.add('active');
	
	friendList.innerHTML = '';

    if (friends.children.length === 0 || friends.children.length === 1 && friends.children[0].textContent === "Aucun ami ajouté pour le moment.") {
        friendList.insertAdjacentHTML(
            'beforeend',
            `<li style="color: white;" >Aucun ami trouvé</li>`
        );
        return;
    }

    // Loop through friends and append them correctly
    for (let i = 0; i < friends.children.length; i++) {
		const friendButton = document.createElement("button");
        let friendName = friends.children[i].textContent.trim(); // Get the name
		friendButton.onclick= function ()
		{
			ChallengeFriend(friendName);
		};
		friendButton.innerText = friendName;
		friendList.appendChild(friendButton);
		friendList.insertAdjacentHTML(
            "beforeend",
            "<br>"
        );
    }
}

function returnToMenu()
{
	let GameMenu = document.getElementById('GameMenu');
	let VsAi = document.getElementById('VsAi');
	let VsFriend = document.getElementById('VsFriend');
	let online = document.getElementById('online');
	let local = document.getElementById('local');
	let winner = document.getElementById('winner');
	let aiDifficulty = document.getElementById('ai-difficulty')
	let tournamentButton = document.getElementById('Tournament')

	MenuTrigger = 0;
	local.classList.remove('active');
	online.classList.remove('active');
	VsAi.classList.remove('inactive');
	VsFriend.classList.remove('inactive');
	GameMenu.classList.remove('inactive');
	tournamentButton.classList.remove('inactive');
	tournamentButton.classList.add('active');
	winner.classList.remove('active');
	aiDifficulty.classList.remove('active');
	aitrigger = 0;
	friendtrigger = 0;
	p2_username = "";
	user_id = "";
	hostname = "       ";

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
    } else {
        // Si désactivé, rendre le menu invisible
        friendMenu.classList.remove('active');
    }
}

// Fonction pour gérer le clic en dehors du menu
// function unscrollToFriendMenu(event) {
//     var friendMenu = document.getElementById('friendMenu');

//     if (!friendMenu.contains(event.target)) {  // Vérifie si le clic est en dehors du friendMenu
//         friendMenu.classList.remove('active');  // Désactive le menu
//         document.removeEventListener('click', unscrollToFriendMenu); // Enlève l'écouteur de clic
//     }
// }



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
    } else {
        // Si désactivé, rendre le menu invisible
        settingsMenu.classList.remove('active');
    }
}
function activateSettingsInfo() {
	settingDisplayType = 0;
	selectSettingDisplay();
}

function activateSettingsStats(id) {
	settingDisplayType = 1;
	getSelfStats(id);
	selectSettingDisplay();
}

function activateSettingsSettings() {
	settingDisplayType = 2;
	selectSettingDisplay();
}





function selectSettingDisplay() {
  // Hide all the divs first
  document.getElementById('SettingsInfo').style.display = 'none';
  document.getElementById('SettingsStats').style.display = 'none';
  document.getElementById('SettingsSetting').style.display = 'none';
  
  // Show the div based on the index
  if (settingDisplayType === 0) {
    document.getElementById('SettingsInfo').style.display = 'block';
  } else if (settingDisplayType === 1) {
    document.getElementById('SettingsStats').style.display = 'block';
  } else if (settingDisplayType === 2) {
    document.getElementById('SettingsSetting').style.display = 'block';
  }
}



async function getSelfStats(id) {
    try {
        const response = await fetch(`/get_player_stats/?user_id=${id}`, {  // Pass user_id as a query parameter
            method: "GET",
            headers: {
                "X-Requested-With": "XMLHttpRequest", // Helps Django recognize AJAX requests
            },
            credentials: "include", // Ensures cookies (like session authentication) are sent
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
           // console.log("User ID:", data.user_id);
         //   console.log("Victories:", data.victories);
           // console.log("Losses:", data.losses);
           // console.log("Rank:", data.rank);

			showSelfStats(data.victories, data.losses, data.rank)
        } else {
            console.error("Failed to fetch player stats:", data.error);
        }
    } catch (error) {
        console.error("Error fetching player stats:", error);
    }
}





function showSelfStats(wins, losses, rank) {
  
  // Calculate the ratio
  let ratio = (wins + losses) > 0 ? (wins / (wins + losses)).toFixed(2) : "N/A";

  // Update the Ratio and Rank display
  document.getElementById("Ratio_self").textContent = `Winrate: ${ratio * 100}%`;
  document.getElementById("Rank_self").textContent = `Rank: ${rank}`;

  // Get the canvas
  const canvas = document.getElementById('winLossChart');
  if (!canvas) {
    console.error('Canvas element not found.');
    return;
  }

  // If a chart already exists, destroy it
  if (winLossChartInstance) {
    winLossChartInstance.destroy();
    canvas.removeAttribute('style'); // Remove any Chart.js inline styles
  }

  // Ensure the canvas retains the class
  canvas.classList.add('chartSelf');

  const ctx = canvas.getContext('2d');
  winLossChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [wins, losses], // Dynamic values
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: false
    }
  });
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
            console.error('Error fetching users:', error);
        });
}



function friendOptionMenu(userId) {
    fetch(`/get_user_info/?user_id=${userId.id}`, { method: "GET" })
        .then(response => response.json())
        .then(user => {
            if (user.error) {
                console.error("Erreur:", user.error);
                return;
            }

            // Affiche les détails de l'utilisateur
            selectUserDisplay(user.id);

            document.getElementById("userDetails").classList.add("active");
            document.getElementById("userUsername").innerText = user.username;
            document.getElementById("userStatus").innerText = user.is_online ? "En ligne" : "Hors ligne";

            // Stocker l'ID de l'utilisateur cible dans les boutons
            document.getElementById("addFriendButton").setAttribute("data-user-id", user.id);
            document.getElementById("blockButton").setAttribute("data-user-id", user.id);
            document.getElementById("unblockButton").setAttribute("data-user-id", user.id);
            document.getElementById("statsButton").setAttribute("data-user-id", user.id);
            document.getElementById("sendMessageBar").setAttribute("data-user-id", user.id);

            setFriendPdp(user);

            console.log("test");
            lastMessageTimestamp = 0;
            clearChat();
            fetchMessages();
        })
        .catch(error => console.error("Erreur lors de la récupération de l'utilisateur :", error));
}


function setFriendPdp(user) {
	const imageContainer = document.getElementById("friendImageContainer");

	imageContainer.style.background = `linear-gradient(45deg, ${user.color1} 0%, ${user.color2} 100%)`;
    const profilePic = document.getElementById("friendProfilePic");

    // Récupère les URL depuis les attributs data
    const maleImg = profilePic.getAttribute("data-male");
    const femaleImg = profilePic.getAttribute("data-female");
    const alienImg = profilePic.getAttribute("data-alien");

    which_friend_pic = user.picture; // Incrémente

    if (which_friend_pic === 1) {
        profilePic.src = maleImg;
    } 
    else if (which_friend_pic === 2) {
        profilePic.src = femaleImg;
    } 
    else if (which_friend_pic === 0) {
        profilePic.src = alienImg;
    }
}



function resetUserDetails() {
    document.getElementById("userDetails").classList.remove("active");
}

function activateUserStats() {
	const UserId = document.getElementById("addFriendButton").getAttribute("data-user-id");
    document.getElementById("userStats").classList.add("active");
	getUserStats(UserId);
}

function resetUserStats() {
    document.getElementById("userStats").classList.remove("active");
}



async function getUserStats(id) {
    try {
        const response = await fetch(`/get_player_stats/?user_id=${id}`, {  // Pass user_id as a query parameter
            method: "GET",
            headers: {
                "X-Requested-With": "XMLHttpRequest", // Helps Django recognize AJAX requests
            },
            credentials: "include", // Ensures cookies (like session authentication) are sent
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
           // console.log("User ID:", data.user_id);
           // console.log("Victories:", data.victories);
          //  console.log("Losses:", data.losses);
           // console.log("Rank:", data.rank);

			showUserStats(data.victories, data.losses, data.rank)
        } else {
            console.error("Failed to fetch player stats:", data.error);
        }
    } catch (error) {
        console.error("Error fetching player stats:", error);
    }
}





function showUserStats(wins, losses, rank) {
  
  // Calculate the ratio
  let ratio = (wins + losses) > 0 ? (wins / (wins + losses)).toFixed(2) : "N/A";

  // Update the Ratio and Rank display
  document.getElementById("Ratio").textContent = `Winrate: ${ratio * 100}%`;
  document.getElementById("Rank").textContent = `Rank: ${rank}`;

  // Get the canvas
  const canvas = document.getElementById('winLossChart_User');
  if (!canvas) {
    console.error('Canvas element not found.');
    return;
  }

  // If a chart already exists, destroy it
  if (winLossChartInstance_user) {
    winLossChartInstance_user.destroy();
    canvas.removeAttribute('style'); // Remove any Chart.js inline styles
  }

  // Ensure the canvas retains the class
  canvas.classList.add('chartSelf');

  const ctx = canvas.getContext('2d');
  winLossChartInstance_user = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [wins, losses], // Dynamic values
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: false
    }
  });
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
	//console.log(toUserId);

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
//	console.log("id utilisateur ->", toUserId);

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
		showFriendList();
		showFriendRequestList();
	})
	.catch(error => console.error("Erreur lors du blockage:", error));
}
function unblockUser() {
	// Récupérer l'ID de l'utilisateur cible depuis l'attribut data-user-id
	const toUserId = document.getElementById("unblockButton").getAttribute("data-user-id");

	if (!toUserId) {
		alert("Erreur : ID utilisateur manquant.");
		return;
	}
	// Envoi de la requête POST pour ajouter un ami, avec CSRF token
	fetch("/unblockUser/", {
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
	  // console.log("is user blocked:", data.is_blocked);
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
	//   console.log("is user friend:", data.is_friend);
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
            // Gérer l'affichage du blocage
            document.getElementById("ifBlocked").style.display = blocked ? "block" : "none";
            document.getElementById("ifUnblocked").style.display = blocked ? "none" : "block";

            // Gérer l'affichage de l'amitié
            document.getElementById("ifFriend").style.display = friend ? "block" : "none";
            document.getElementById("ifNotFriend").style.display = friend ? "none" : "block";

            // Modifier le bouton d'ajout d'ami
            const addFriendButton = document.getElementById("addFriendButton");
            const buttonText = addFriendButton.querySelector("p");
            const buttonIcon = addFriendButton.querySelector("span");

            if (friend) {
                buttonText.textContent = "Friend";
                buttonIcon.textContent = "person_check";
                addFriendButton.disabled = true; // Optional: disable the button
            } else {
                buttonText.textContent = "Ajouter";
                buttonIcon.textContent = "person_add";
                addFriendButton.disabled = false;
            }
        });
}
 

function showFriendList() {
//	console.log("je rentre dans la foncition");
	
	// Requête AJAX pour obtenir la liste des amis
	//console.log("FUNCTION CCALLED : showFriendList");
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
	//console.log("FUNCTION CCALLED : showFriendRequestList");
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





/*----------------ONLINE-STATUS-------------*/
/*function set_user_status(_online_status)
{
	fetch("/set_user_status/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": getCSRFToken() // Protection CSRF pour Django
		},
		body: JSON.stringify({  // Convertit en JSON
			online_status: _online_status  
		})
	})
	.catch(error => console.error("Erreur lors de l'envoi:", error));
}*/

function get_user_status(user_id) {
	return fetch(`/get_user_status/?to_user_id=${user_id}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-CSRFToken": getCSRFToken(),  // Récupère le CSRF token depuis le cookie
		},
	})
	.then(response => response.json())
	.then(data => {
		console.log("user_id", user_id, "user_staus 1: ", data.user_status);
		return data.user_status;
	})
	.catch(error => {
		console.error("Erreur lors du get_user_status:", error);
		return false;	
	});
}


/*----------------ONLINE-STATUS-------------*/

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
            //console.log("Logout successful!");
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

    	// Bloquer les messages de plus de 300 caractères
		if (messageText.length >= 200) {
			input.classList.add("limite");  // Add style when limit is reached
			return;
		}

		input.classList.remove("limite"); // Remove style when under limit
	
		const toUserId = input.getAttribute("data-user-id");

		// Vérifie si l'ID est bien récupéré
		//console.log("ID ->", toUserId);

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
   // console.log("Trying to fetch messages!");
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
           //      ("New message shown -> ", messageDiv);

                lastMessageTimestamp = msg.timestamp; // Met à jour le dernier timestamp
            });

            scrollChatToBottom();
        }
    })
    .catch(error => console.error("Erreur lors de la récupération des messages:", error));
}


document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("passwordChangeForm").addEventListener("submit", function (event) {
        event.preventDefault(); // Empêche le rechargement de la page

        let formData = new FormData(this);

        fetch(this.action, {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                alert("Mot de passe changé avec succès !");
                window.location.href = data.redirect;  // Redirige vers la page de login
            } else {
                alert("Erreur : " + (data.message || "Impossible de changer le mot de passe"));
            }
        })
        .catch(error => console.error("Erreur lors de la requête :", error));
    });
});



// fonction pour les settings settings pour cacher le bouton et afficher le truc pour changer de username au dessus cest pour le mdp
document.addEventListener("DOMContentLoaded", function () {
    const allButtons = document.querySelectorAll(".SettingsSetting_Button"); // Tous les boutons

    allButtons.forEach(button => {
        button.addEventListener("click", function () {
            // Cache tous les boutons
            allButtons.forEach(btn => btn.style.display = "none");

            // Affiche le formulaire correspondant
            const targetForm = document.getElementById(this.dataset.target);
            targetForm.style.display = "block";
        });
    });

    document.querySelectorAll(".cancelButton").forEach(button => {
        button.addEventListener("click", function () {
            const targetForm = document.getElementById(this.dataset.target);
            targetForm.style.display = "none"; // Cache le formulaire

            // Réaffiche tous les boutons
            allButtons.forEach(btn => btn.style.display = "block");
        });
    });

});

let which_pic = 0; // Variable globale

function select_base_user_pdp() {
	const userData = document.getElementById("pdp_data");

    const color1 = userData.dataset.color1;
    const color2 = userData.dataset.color2;
    const picture = userData.dataset.picture;
	console.log("color 1 :", color1);
	console.log("color 2 :", color2);
	console.log("pic id :", picture);


	which_pic = picture - 1;
	changePDP();
    const imageContainer = document.getElementById("imageContainer");
	imageContainer.style.background = `linear-gradient(45deg, ${color1} 0%, ${color2} 100%)`;
}


document.addEventListener("DOMContentLoaded", function() {
    console.log("Le DOM est prêt !");
    select_base_user_pdp();
});


function changePDP() {
    const profilePic = document.getElementById("profilePic");

    // Récupère les URL depuis les attributs data
    const maleImg = profilePic.getAttribute("data-male");
    const femaleImg = profilePic.getAttribute("data-female");
    const alienImg = profilePic.getAttribute("data-alien");

    which_pic++; // Incrémente

    if (which_pic === 1) {
        profilePic.src = maleImg;
    } 
    else if (which_pic === 2) {
        profilePic.src = femaleImg;
    } 
    else {
        profilePic.src = alienImg;
        which_pic = 0; // Reset
    }
	updatePicture(which_pic);
}

function submitColors() {
	let color1 = document.getElementById('colorPickerA').value;
	let color2 = document.getElementById('colorPickerB').value;

	updateColor1(color1, color2);
}

// Fonction pour mettre à jour la couleur 1
// Fonction pour mettre à jour la couleur 1
function updateColor1(color, color2) {
    fetch('/update/color_1/', {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCSRFToken()  // Ajout du token CSRF
        },
        body: new URLSearchParams({ color_1: color })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        updateColor2(color2); // Assure-toi que "color2" est défini quelque part
    })
    .catch(error => console.error("Erreur:", error));
}


// Fonction pour mettre à jour la couleur 2
function updateColor2(color) {
    fetch('/update/color_2/', {
        method: "POST",
        headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-CSRFToken": getCSRFToken()  // Ajout du token CSRF // 
			},
        body: new URLSearchParams({ color_2: color })
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error("Erreur:", error));
}

// Fonction pour mettre à jour la photo de profil (picture)
function updatePicture(pictureName) {
    fetch('/update_picture/', {
        method: "POST",
        headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-CSRFToken": getCSRFToken()  // Ajout du token CSRF // 
			},
        body: new URLSearchParams({ picture: pictureName })
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error("Erreur:", error));
}









// TOURNOIS ---------------------------------------------




function joinTournamentFunction()
{
	getAllTournaments()
}

function joinTournament(tournament)
{
	fetch('/join_tournament/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        },
        body: JSON.stringify({
            tournament_id: tournament.tournament_id,
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success)
		{
			//ajouter la nouvelle page avec tout les joueur 
            // D'autres actions que tu veux faire après la création
			let returnButton = document.getElementById('ReturnButton');
			let mainPageButton = document.getElementById("toMainPageButton");
			
			mainPageButton.classList.add("disabled");
			returnButton.classList.remove('active');
			getTournamentPlayers_Join(data.tournament_id);
        } else {
            alert("Erreur : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}

function quitTournament()
{
	fetch('/quitTournament/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success)
		{
            alert("Vous avez quittez le tournoi !");
			returnToPreviousMenu();


			//ajouter la nouvelle page avec tout les joueur 
            // D'autres actions que tu veux faire après la création
        } else {
            alert("Erreur : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}

function createTournamentFunction()
{
	let returnButton = document.getElementById('ReturnButton');

	fetch('/create_tournament/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        },
        body: JSON.stringify({
            name: "Tournoi by ",  // Utilise userId dans le nom du tournoi
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
			let mainPageButton = document.getElementById("toMainPageButton");
			returnButton.classList.remove("active");
			
			mainPageButton.classList.add("disabled");
			getTournamentPlayers_Create(data.tournament_id);
            // D'autres actions que tu veux faire après la création
        } else {
            alert("Erreur : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}




function deleteTournament() {

    fetch(`/delete_tournament/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        }  // Envoi de l'objet JSON dans la requête
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Tournoi supprimé !");
             // Appeler la fonction qui bascule le bouton
        } else {
            alert("Erreur : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));

    // Réinitialisation du bouton après suppression
}



function getTournamentPlayers_Create(tournamentId) {
    fetch('/get_tournament_players/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        },
        body: JSON.stringify({
            tournament_id: tournamentId  // Envoi de l'ID dans le body
        })
    })
    .then(response => response.json())
    .then(data => {
		console.log("Données reçues du serveur:", data);
        if (data.success) {
            let playersList = document.getElementById("tournamentPlayersList");
            playersList.innerHTML = "";  // Vider la liste avant d'ajouter les joueurs
            data.players.forEach(player => {
                let li = document.createElement("li");
                li.textContent = player;  // Ajouter le nom du joueur
                playersList.appendChild(li);
            });
        } else {
            console.error("Erreur :", data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}


function getTournamentPlayers_Join(tournamentId) {
    fetch('/get_tournament_players/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Nécessaire pour Django
        },
        body: JSON.stringify({
            tournament_id: tournamentId  // Envoi de l'ID dans le body
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let playersList = document.getElementById("tournamentListJoin");


            playersList.innerHTML = "";  // Vider la liste avant d'ajouter les joueurs
            data.players.forEach(player => {
                let li = document.createElement("li");
                li.textContent = player;  // Ajouter le nom du joueur
                playersList.appendChild(li);
            });
        } else {
            console.error("Erreur :", data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}




document.addEventListener("DOMContentLoaded", function() {
    getAllTournaments();  // Récupère et affiche les tournois
});
// Fonction pour récupérer tous les tournois
function getAllTournaments() {
    fetch('/get_all_tournaments/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),  // Nécessaire pour Django
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
			console.log("Tournois reçus :", data.tournaments);
            displayTournaments(data.tournaments);  // Affiche les tournois si la requête réussie
        } else {
            alert("Erreur lors de la récupération des tournois : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}


// Fonction pour afficher les tournois sous forme de boutons
function displayTournaments(tournaments) {
    const tournamentListDiv = document.getElementById("tournamentListJoin");
    if (!tournamentListDiv) {
        console.error("Erreur : l'élément #joinPage n'existe pas.");
        return;
    }

    tournamentListDiv.innerHTML = "";  // Réinitialise la liste de tournois



	tournaments.forEach(tournament => {
		const button = document.createElement("button");
		button.textContent = tournament.name;
		
		// Ajout de la classe CSS "buttonJoinTournament"
		button.classList.add("buttonJoinTournament");
	
		button.onclick = () => joinTournament(tournament);
		tournamentListDiv.appendChild(button);
	});
	
}

function launchTournament()
{
    fetch('/launch_tournament/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),  // Nécessaire pour Django
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
			alert(data.message);
              // Affiche les tournois si la requête réussie
        } else {
            alert("Erreur lors de la récupération des tournois : " + data.error);
        }
    })
    .catch(error => console.error("Erreur :", error));
}

function secondRound(winner_or_looser) {

	if (winner_or_looser == 0)
	{
		fetch('/secondRoundLoose/', {
			method: 'POST',  // Correction : POST au lieu de GET
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),  // Sécurité Django
			},
			body: JSON.stringify({
				is_winner: winner_or_looser  // Envoi 1 si gagnant, 0 si perdant
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				let winner =  document.getElementById("winner");
				let waitingPage =  document.getElementById("waitingPage");

				winner.classList.remove('active');
				waitingPage.classList.remove('active');
				returnToPreviousMenu();
				scrollToMainPage();
				// block everything and show wainting page
				alert(data.message);
				alert("vous avez perdu");
			} else {
				alert("Erreur : " + data.error);
			}
		})
		.catch(error => console.error("Erreur :", error));
	}
	else if (winner_or_looser == 1)
	{
		fetch('/secondRound/', {
			method: 'POST',  // Correction : POST au lieu de GET
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),  // Sécurité Django
			},
			body: JSON.stringify({
				is_winner: winner_or_looser  // Envoi 1 si gagnant, 0 si perdant
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				if (data.waiting)
				{
					let winner =  document.getElementById("winner");
					let waitingPage =  document.getElementById("waitingPage");
	
					winner.classList.remove('active');
					waitingPage.classList.add('active');
					
					// block everything and show wainting page
					alert(data.message);
					console.log("Tournoi avancé :", data.message);
				}

			} else {
				alert("Erreur : " + data.error);
			}
		})
		.catch(error => console.error("Erreur :", error));
	}
}


function lastRound(winner_or_looser) {

	if (winner_or_looser === 0)
	{
		fetch('/lastRoundLoose/', {
			method: 'POST',  // Correction : POST au lieu de GET
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),  // Sécurité Django
			},
			body: JSON.stringify({
				is_winner: winner_or_looser  // Envoi 1 si gagnant, 0 si perdant
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				let winner =  document.getElementById("winner");
				let waitingPage =  document.getElementById("waitingPage");

				winner.classList.remove('active');
				waitingPage.classList.remove('active');
				returnToPreviousMenu();
				scrollToMainPage();
				// block everything and show wainting page
				alert("vous avez perdu");
			} else {
				alert("Erreur : " + data.error);
			}
		})
		.catch(error => console.error("Erreur :", error));	
	}
	else
	{
		fetch('/lastRound/', {
			method: 'POST',  // Correction : POST au lieu de GET
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),  // Sécurité Django
			},
			body: JSON.stringify({
				is_winner: winner_or_looser  // Envoi 1 si gagnant, 0 si perdant
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				if (data.waiting)
				{
					let winner =  document.getElementById("winner");
					let waitingPage =  document.getElementById("waitingPage");
	
					winner.classList.remove('active');
					waitingPage.classList.add('active');
					
					// block everything and show wainting page
					alert(data.message);
					console.log("Tournoi avancé :", data.message);
				}
			} else {
				alert("Erreur : " + data.error);
			}
		})
		.catch(error => console.error("Erreur :", error));
	}
}




function finishTournament(winner_or_looser)
{

	fetch('/finishTournament/', {
		method: 'POST',  // Correction : POST au lieu de GET
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken(),  // Sécurité Django
		},
		body: JSON.stringify({
			is_winner: winner_or_looser  // Envoi 1 si gagnant, 0 si perdant
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.success) {
			scrollToMainPage();
			let winner =  document.getElementById("winner");
			let waitingPage =  document.getElementById("waitingPage");

			winner.classList.remove('active');
			waitingPage.classList.remove('active');
			returnToPreviousMenu();
		} else {
			alert("Erreur : " + data.error);
		}
	})
	.catch(error => console.error("Erreur :", error));	

}