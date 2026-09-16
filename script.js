// =====================================================
// SleepStory - script.js
// =====================================================


// ================= CONFIG =================

const BACKEND_URL =
    "https://storyteller-backend-us3a.onrender.com";


// ================= AUDIO =================

const audioPlayer =
    document.getElementById("audioPlayer");

const playButton =
    document.getElementById("playButton");

const progressBar =
    document.getElementById("progressBar");

const currentTimeDisplay =
    document.getElementById("currentTime");

const durationDisplay =
    document.getElementById("duration");

const volumeControl =
    document.getElementById("volumeControl");

const player =
    document.getElementById("player");

const playerTitle =
    document.getElementById("playerTitle");


// ================= ROOM STATE =================

let socket = null;

let roomCode = null;

let isHost = false;

let pendingJoinRoom = false;


// ================= SOCKET CONNECTION =================

function connectSocket() {

    if (socket && socket.connected) {
        return;
    }

    socket = io(BACKEND_URL);

    socket.on("connect", () => {

        console.log(
            "Connected to SleepStory server:",
            socket.id
        );

    });


    // ================= ROOM CREATED =================

    socket.on("room-created", (data) => {

        roomCode = data.roomCode;

        isHost = true;

        console.log(
            "🌙 Room created:",
            roomCode
        );

        showRoom(roomCode);

    });


    // ================= ROOM JOINED =================

    socket.on("room-joined", (data) => {

        roomCode = data.roomCode;

        isHost = false;

        console.log(
            "👥 Joined room:",
            roomCode
        );


        showRoom(roomCode);


        // Sync current playback

        if (typeof data.currentTime === "number") {

            audioPlayer.currentTime =
                data.currentTime;

        }


        // If host is already playing

        if (data.isPlaying) {

            audioPlayer.play()
                .catch(() => {
                    console.log(
                        "Browser blocked autoplay."
                    );
                });

        } else {

            audioPlayer.pause();

        }

    });


    // ================= ROOM ERROR =================

    socket.on("room-error", (message) => {

        alert(message);

    });


    // ================= PLAY SYNC =================

    socket.on("sync-play", (data) => {

        if (
            typeof data.currentTime ===
            "number"
        ) {

            audioPlayer.currentTime =
                data.currentTime;

        }


        audioPlayer.play()
            .catch(() => {});

    });


    // ================= PAUSE SYNC =================

    socket.on("sync-pause", (data) => {

        if (
            typeof data.currentTime ===
            "number"
        ) {

            audioPlayer.currentTime =
                data.currentTime;

        }


        audioPlayer.pause();

    });


    // ================= SEEK SYNC =================

    socket.on("sync-seek", (data) => {

        if (
            typeof data.currentTime ===
            "number"
        ) {

            audioPlayer.currentTime =
                data.currentTime;

        }

    });


    // ================= USER COUNT =================

    socket.on("user-count", (data) => {

        const userCount =
            document.getElementById(
                "userCount"
            );

        if (!userCount) return;


        const count =
            data.count || 0;


        userCount.innerText =
            `👤 ${count} ${
                count === 1
                    ? "listener"
                    : "listeners"
            }`;

    });


    // ================= REACTION =================

    socket.on("sync-reaction", (data) => {

        if (!data || !data.emoji) {
            return;
        }

        showReaction(data.emoji);

    });


    // ================= CHAT =================

    socket.on("new-chat-message", (data) => {

        console.log(
            "💬 New message:",
            data.message
        );

    });


    // ================= DISCONNECT =================

    socket.on("disconnect", () => {

        console.log(
            "❌ Disconnected from server"
        );

    });

}


// Connect automatically

connectSocket();


// =====================================================
// PLAYER FUNCTIONS
// =====================================================


// ================= START STORY =================

function playStory() {

    if (!audioPlayer) return;


    playerTitle.innerText =
        "The Last Star";


    if (player) {

        player.classList.add(
            "player-visible"
        );

    }


    audioPlayer.play()
        .then(() => {

            updatePlayButton();

        })
        .catch((error) => {

            console.log(
                "Playback error:",
                error
            );

        });

}


// ================= TOGGLE PLAY =================

function togglePlay() {

    if (!audioPlayer) return;


    if (audioPlayer.paused) {

        audioPlayer.play()
            .then(() => {

                updatePlayButton();

                sendPlay();

            })
            .catch(() => {});

    } else {

        audioPlayer.pause();

        updatePlayButton();

        sendPause();

    }

}


// ================= PLAY BUTTON =================

function updatePlayButton() {

    if (!playButton) return;


    if (audioPlayer.paused) {

        playButton.innerText = "▶";

    } else {

        playButton.innerText = "Ⅱ";

    }

}


// =====================================================
// AUDIO EVENTS
// =====================================================


// ================= TIME UPDATE =================

audioPlayer.addEventListener(
    "timeupdate",
    () => {

        if (!audioPlayer.duration) {
            return;
        }


        const percentage =
            (audioPlayer.currentTime /
                audioPlayer.duration) *
            100;


        progressBar.value =
            percentage;


        currentTimeDisplay.innerText =
            formatTime(
                audioPlayer.currentTime
            );

    }
);


// ================= METADATA =================

audioPlayer.addEventListener(
    "loadedmetadata",
    () => {

        durationDisplay.innerText =
            formatTime(
                audioPlayer.duration
            );

    }
);


// ================= AUDIO ENDED =================

audioPlayer.addEventListener(
    "ended",
    () => {

        updatePlayButton();

        if (roomCode && isHost) {

            sendPause();

        }

    }
);


// ================= PROGRESS BAR =================

progressBar.addEventListener(
    "input",
    () => {

        if (!audioPlayer.duration) {
            return;
        }


        const newTime =
            (progressBar.value / 100) *
            audioPlayer.duration;


        audioPlayer.currentTime =
            newTime;

    }
);


// Send seek after user releases slider

progressBar.addEventListener(
    "change",
    () => {

        if (!audioPlayer.duration) {
            return;
        }


        const newTime =
            (progressBar.value / 100) *
            audioPlayer.duration;


        audioPlayer.currentTime =
            newTime;


        sendSeek(newTime);

    }
);


// ================= VOLUME =================

volumeControl.addEventListener(
    "input",
    () => {

        audioPlayer.volume =
            volumeControl.value;

    }
);


// =====================================================
// ROOM SYNC
// =====================================================


// ================= SEND PLAY =================

function sendPlay() {

    if (!socket) return;

    if (!roomCode) return;


    socket.emit("play", {

        currentTime:
            audioPlayer.currentTime

    });

}


// ================= SEND PAUSE =================

function sendPause() {

    if (!socket) return;

    if (!roomCode) return;


    socket.emit("pause", {

        currentTime:
            audioPlayer.currentTime

    });

}


// ================= SEND SEEK =================

function sendSeek(time) {

    if (!socket) return;

    if (!roomCode) return;


    socket.emit("seek", {

        currentTime: time

    });

}


// =====================================================
// JAM / ROOM FUNCTIONS
// =====================================================


// ================= OPEN JAM CHOICE =================

function openJamChoice() {

    const modal =
        document.getElementById(
            "jamChoiceModal"
        );


    if (!modal) return;


    modal.classList.add("active");

}


// ================= CLOSE JAM CHOICE =================

function closeJamChoice() {

    const modal =
        document.getElementById(
            "jamChoiceModal"
        );


    if (!modal) return;


    modal.classList.remove("active");

}


// ================= CREATE ROOM =================

function createRoom() {

    connectSocket();


    if (!socket) {

        alert(
            "Unable to connect to server."
        );

        return;

    }


    if (!socket.connected) {

        alert(
            "Connecting to server... Please try again."
        );

        return;

    }


    socket.emit(
        "create-room"
    );

}


// ================= JOIN ROOM =================

function joinRoom() {

    const modal =
        document.getElementById(
            "roomModal"
        );


    const title =
        document.getElementById(
            "modalTitle"
        );


    const description =
        document.getElementById(
            "modalDescription"
        );


    const action =
        document.getElementById(
            "modalAction"
        );


    const codeInput =
        document.getElementById(
            "joinCode"
        );


    if (!modal) return;


    title.innerText =
        "Join a Jam";


    description.innerText =
        "Enter the 6-character room code shared by your friend.";


    action.innerText =
        "Join Room";


    codeInput.value = "";


    modal.classList.add("active");


    codeInput.focus();


    // Replace button action

    action.onclick =
        submitJoinRoom;

}


// ================= SUBMIT JOIN =================

function submitJoinRoom() {

    const codeInput =
        document.getElementById(
            "joinCode"
        );


    if (!codeInput) return;


    const code =
        codeInput.value
            .trim()
            .toUpperCase();


    if (code.length !== 6) {

        alert(
            "Please enter a valid 6-character room code."
        );

        return;

    }


    connectSocket();


    if (!socket) {

        alert(
            "Unable to connect to server."
        );

        return;

    }


    socket.emit(
        "join-room",
        code
    );

}


// ================= CLOSE ROOM MODAL =================

function closeRoomModal() {

    const modal =
        document.getElementById(
            "roomModal"
        );


    if (!modal) return;


    modal.classList.remove(
        "active"
    );

}


// ================= SHOW ROOM =================

function showRoom(code) {

    closeRoomModal();


    const room =
        document.getElementById(
            "jamRoom"
        );


    const display =
        document.getElementById(
            "roomCodeDisplay"
        );


    if (display) {

        display.innerText =
            code;

    }


    if (room) {

        room.classList.add(
            "active"
        );

    }

}


// ================= COPY ROOM CODE =================

function copyRoomCode() {

    if (!roomCode) return;


    navigator.clipboard
        .writeText(roomCode)
        .then(() => {

            alert(
                "Room code copied: " +
                roomCode
            );

        })
        .catch(() => {

            alert(
                "Room code: " +
                roomCode
            );

        });

}


// =====================================================
// REACTIONS
// =====================================================

function sendReaction(emoji) {

    if (!socket) return;

    if (!roomCode) return;


    socket.emit(
        "reaction",
        {
            emoji: emoji
        }
    );


    showReaction(emoji);

}


function showReaction(emoji) {

    const reaction =
        document.createElement(
            "div"
        );


    reaction.className =
        "floating-reaction";


    reaction.innerText =
        emoji;


    document.body.appendChild(
        reaction
    );


    setTimeout(() => {

        reaction.remove();

    }, 2000);

}


// =====================================================
// CHAT
// =====================================================

function sendChatMessage(message) {

    if (!socket) return;

    if (!roomCode) return;


    if (!message) return;


    socket.emit(
        "chat-message",
        {
            message: message
        }
    );

}


// =====================================================
// HELPERS
// =====================================================


// ================= FORMAT TIME =================

function formatTime(seconds) {

    if (
        !seconds ||
        isNaN(seconds)
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        Math.floor(
            seconds % 60
        );


    return (
        minutes +
        ":" +
        remainingSeconds
            .toString()
            .padStart(2, "0")
    );

}


// =====================================================
// MODAL OUTSIDE CLICK
// =====================================================

window.addEventListener(
    "click",
    (event) => {

        const jamModal =
            document.getElementById(
                "jamChoiceModal"
            );


        const roomModal =
            document.getElementById(
                "roomModal"
            );


        if (
            event.target ===
            jamModal
        ) {

            closeJamChoice();

        }


        if (
            event.target ===
            roomModal
        ) {

            closeRoomModal();

        }

    }
);


// =====================================================
// KEYBOARD
// =====================================================

document.addEventListener(
    "keydown",
    (event) => {

        // ESC closes modal

        if (
            event.key === "Escape"
        ) {

            closeJamChoice();

            closeRoomModal();

        }


        // Enter joins room

        const codeInput =
            document.getElementById(
                "joinCode"
            );


        if (
            document.activeElement ===
            codeInput &&
            event.key === "Enter"
        ) {

            submitJoinRoom();

        }

    }
);


// =====================================================
// INITIALIZATION
// =====================================================

audioPlayer.volume = 1;

updatePlayButton();

console.log(
    "🌙 SleepStory loaded successfully"
);