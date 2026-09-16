const socket = io("https://storyteller-backend-us3a.onrender.com");


console.log("🔌 Connected to SleepStory server");
/* =========================================
   SLEEPSTORY - STEP 1
   Audio Player + Basic Jam UI
========================================= */


// =========================================
// STORY LIST
// =========================================

const stories = [
    { title: "The Last Star", src: "AUDIO/the-last-star.mp3" },
    { title: "Moonlight Dreams", src: "AUDIO/the-last-star.mp3" },
    { title: "The Silent Forest", src: "AUDIO/the-last-star.mp3" },
    { title: "Ocean Whispers", src: "AUDIO/the-last-star.mp3" }
];

let currentStoryIndex = 0;


// =========================================
// AUDIO PLAYER
// =========================================

const audio = document.getElementById("audioPlayer");

const playButton = document.getElementById("playButton");

const progressBar = document.getElementById("progressBar");

const currentTimeText = document.getElementById("currentTime");

const durationText = document.getElementById("duration");

const playerTitle = document.getElementById("playerTitle");


// =========================================
// PLAY / PAUSE
// =========================================

function togglePlay() {
    if (audio.paused) {
        audio.play();
        playButton.textContent = "❚❚";
        updateFullPlayButton(true);
        openFullPlayer();

        socket.emit("play", {
            currentTime: audio.currentTime
        });

    } else {
        audio.pause();
        playButton.textContent = "▶";
        updateFullPlayButton(false);

        socket.emit("pause", {
            currentTime: audio.currentTime
        });
    }
}

// RECEIVE PLAY FROM OTHER USER
socket.on("sync-play", (data) => {
    audio.currentTime = data.currentTime;
    audio.play();
    playButton.textContent = "❚❚";
    updateFullPlayButton(true);
});

// RECEIVE PAUSE FROM OTHER USER
socket.on("sync-pause", (data) => {
    audio.currentTime = data.currentTime;
    audio.pause();
    playButton.textContent = "▶";
    updateFullPlayButton(false);
});

// =========================================
// PLAY STORY
// =========================================

function playStory(storyName) {

    // খুঁজে বের করি এই story-টা list-এ কোথায় আছে
    const foundIndex = stories.findIndex(
        (story) => story.title === storyName
    );

    if (foundIndex !== -1) {
        currentStoryIndex = foundIndex;
        loadCurrentStory();
    }

    audio.play();

    playButton.textContent = "❚❚";
    updateFullPlayButton(true);

    openFullPlayer();

}

function loadCurrentStory() {

    const story = stories[currentStoryIndex];

    playerTitle.textContent = story.title;
    fullPlayerTitle.textContent = story.title;

    audio.src = story.src;

}

function nextStory() {

    currentStoryIndex = (currentStoryIndex + 1) % stories.length;

    loadCurrentStory();

    audio.play();

    playButton.textContent = "❚❚";
    updateFullPlayButton(true);

}

function previousStory() {

    currentStoryIndex =
        (currentStoryIndex - 1 + stories.length) % stories.length;

    loadCurrentStory();

    audio.play();

    playButton.textContent = "❚❚";
    updateFullPlayButton(true);

}


// =========================================
// AUDIO TIME UPDATE
// =========================================

audio.addEventListener("timeupdate", function () {

    if (!audio.duration) return;

    const percentage =
        (audio.currentTime / audio.duration) * 100;

    progressBar.value = percentage;

    currentTimeText.textContent =
        formatTime(audio.currentTime);

});


// =========================================
// AUDIO LOADED
// =========================================

audio.addEventListener("loadedmetadata", function () {

    durationText.textContent =
        formatTime(audio.duration);

});


// =========================================
// AUDIO ENDED
// =========================================

audio.addEventListener("ended", function () {

    playButton.textContent = "▶";

    progressBar.value = 0;

});


// =========================================
// FORMAT TIME
// =========================================

function formatTime(seconds) {

    if (isNaN(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return (
        minutes +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );

}


// =========================================
// CHANGE PROGRESS
// =========================================

function changeProgress() {
    if (!audio.duration) return;

    const newTime = (progressBar.value / 100) * audio.duration;
    audio.currentTime = newTime;

    socket.emit("seek", {
        currentTime: audio.currentTime
    });
}



// =========================================
// SKIP BACKWARD
// =========================================

function skipBackward() {
    audio.currentTime = Math.max(0, audio.currentTime - 10);

    socket.emit("seek", {
        currentTime: audio.currentTime
    });
}


// =========================================
// SKIP FORWARD
// =========================================

function skipForward() {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);

    socket.emit("seek", {
        currentTime: audio.currentTime
    });
}

// =========================================
// MUTE
// =========================================

function toggleMute() {

    audio.muted = !audio.muted;

}


// =========================================
// SLEEP TIMER
// =========================================

let sleepTimer = null;


function setSleepTimer() {

    const select =
        document.getElementById("sleepTimer");

    const minutes =
        Number(select.value);


    // Cancel previous timer

    if (sleepTimer) {

        clearTimeout(sleepTimer);

        sleepTimer = null;

    }


    if (minutes === 0) {

        return;

    }


    sleepTimer = setTimeout(function () {

        audio.pause();

        playButton.textContent = "▶";

        alert("🌙 Good night! Sleep timer finished.");

    }, minutes * 60 * 1000);


    alert(
        "🌙 Sleep timer set for " +
        minutes +
        " minutes."
    );

}


// =========================================
// SEARCH
// =========================================

function toggleSearch() {

    const searchBox =
        document.getElementById("searchBox");

    if (
        searchBox.style.display === "block"
    ) {

        searchBox.style.display = "none";

    } else {

        searchBox.style.display = "block";

        document
            .getElementById("searchInput")
            .focus();

    }

}


function searchStories() {

    const input =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase();


    const stories =
        document.querySelectorAll(".story-card");


    stories.forEach(function (story) {

        const title =
            story
                .getAttribute("data-title")
                .toLowerCase();


        if (title.includes(input)) {

            story.style.display = "block";

        } else {

            story.style.display = "none";

        }

    });

}


// =========================================
// MOOD
// =========================================

function selectMood(mood) {

    alert(
        "✨ " +
        mood +
        " stories will appear here in the next version."
    );

}


// =========================================
// JAM - STEP 1 UI
// =========================================


 function createRoom() {
    socket.emit("create-room");
}


socket.on("room-created", (data) => {
    console.log("🌙 Room created:", data.roomCode);

    fullPlayerRoomInfo.textContent = "Room: " + data.roomCode;

    openFullPlayer();

    alert("Your Jam Room Code is: " + data.roomCode);
});

function generateRoom() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for (let i = 0; i < 6; i++) {

        code +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

    }


    document.getElementById("roomCode")
        .textContent = code;


    document.getElementById("modalText")
        .textContent =
        "Share this code with your friend. Real-time sync will be connected in Step 2.";

}


// =========================================
// JOIN ROOM
// =========================================

function joinRoom() {

    const modal = document.getElementById("roomModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const roomCode = document.getElementById("roomCode");
    const joinCode = document.getElementById("joinCode");
    const action = document.getElementById("modalAction");

    // Open modal
    modal.style.display = "flex";

    // Change modal to Join mode
    modalTitle.textContent = "Join a Jam";

    modalText.textContent =
        "Enter the 6-character room code shared by your friend.";

    // Hide generated room code
    roomCode.style.display = "none";

    // Show input
    joinCode.style.display = "block";

    // Clear old code
    joinCode.value = "";

    // Change button
    action.textContent = "Join Room";

    // Connect when button is clicked
    action.onclick = connectToRoom;
}


// =========================================
// CONNECT TO ROOM
// =========================================

function connectToRoom() {

    const joinCode = document.getElementById("joinCode");

    const code = joinCode.value
        .trim()
        .toUpperCase();

    if (code.length !== 6) {

        alert("Please enter a valid 6-character room code.");

        return;
    }

    console.log("🔗 Joining room:", code);

    socket.emit("join-room", code);
}


// =========================================
// ROOM JOINED SUCCESSFULLY
// =========================================

socket.on("room-joined", (data) => {
    console.log("👥 Successfully joined:", data.roomCode);

    // Host-এর current story position এ নিয়ে যাবে
    audio.currentTime = data.currentTime || 0;

    // Host যদি এখন Play করে থাকে
    if (data.isPlaying) {
        audio.play()
            .then(() => {
                playButton.textContent = "❚❚";
                updateFullPlayButton(true);
            })
            .catch((error) => {
                console.log("Autoplay blocked:", error);
                playButton.textContent = "▶";
                updateFullPlayButton(false);
            });
    } 
    
    // Host যদি Pause করে থাকে
    else {
        audio.pause();
        playButton.textContent = "▶";
        updateFullPlayButton(false);
    }

    fullPlayerRoomInfo.textContent = "Room: " + data.roomCode;

    openFullPlayer();

    alert("✅ Successfully joined Jam: " + data.roomCode);
    closeModal();
});

socket.on("user-count", (data) => {
    const userCount = document.getElementById("userCount");

    if (!userCount) return;

    userCount.textContent =
        "👥 " + data.count +
        (data.count === 1 ? " listener" : " listeners");
});

// =========================================
// ROOM ERROR
// =========================================

socket.on("room-error", (message) => {

    console.log("❌ Room error:", message);

    alert("❌ " + message);

});


// =========================================
// CLOSE MODAL
// =========================================

function closeModal() {

    document.getElementById("roomModal")
        .style.display = "none";

}


// =========================================
// CLOSE MODAL BY CLICKING OUTSIDE
// =========================================

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("roomModal");

    if (event.target === modal) {

        closeModal();

    }

});
// RECEIVE SEEK FROM OTHER USER
socket.on("sync-seek", (data) => {
    audio.currentTime = data.currentTime;
});

// LIVE USER COUNT
socket.on("user-count", (data) => {
    const userCount = document.getElementById("userCount");

    if (!userCount) return;

    if (data.count === 1) {
        userCount.textContent = "👥 1 listener";
    } else {
        userCount.textContent = "👥 " + data.count + " listeners";
    }
});


// =========================================
// LIVE REACTIONS
// =========================================

function sendReaction(emoji) {
    socket.emit("reaction", {
        emoji: emoji
    });

    showFloatingEmoji(emoji);
}

socket.on("sync-reaction", (data) => {
    showFloatingEmoji(data.emoji);
});

function showFloatingEmoji(emoji) {

    const container = document.getElementById("reactionContainer");

    if (!container) return;

    const span = document.createElement("span");

    span.textContent = emoji;
    span.className = "floating-emoji";

    // Random horizontal position so emojis don't overlap
    const randomLeft = Math.random() * 80 + 10; // 10% - 90%
    span.style.left = randomLeft + "%";

    container.appendChild(span);

    // Remove after animation finishes
    setTimeout(() => {
        span.remove();
    }, 3000);

}


// =========================================
// FULL PAGE PLAYER
// =========================================

const fullPlayer = document.getElementById("fullPlayer");
const fullPlayButton = document.getElementById("fullPlayButton");
const fullProgressBar = document.getElementById("fullProgressBar");
const fullCurrentTimeText = document.getElementById("fullCurrentTime");
const fullDurationText = document.getElementById("fullDuration");
const fullPlayerTitle = document.getElementById("fullPlayerTitle");
const fullPlayerRoomInfo = document.getElementById("fullPlayerRoomInfo");

function openFullPlayer() {
    fullPlayer.classList.add("active");
    fullPlayerTitle.textContent = playerTitle.textContent;
}

function closeFullPlayer() {
    fullPlayer.classList.remove("active");
}

function updateFullPlayButton(isPlaying) {
    const symbol = isPlaying ? "❚❚" : "▶";
    fullPlayButton.textContent = symbol;
}

function changeProgressFull() {
    if (!audio.duration) return;

    const newTime = (fullProgressBar.value / 100) * audio.duration;
    audio.currentTime = newTime;

    socket.emit("seek", {
        currentTime: audio.currentTime
    });
}

// Keep full player progress in sync with mini player
audio.addEventListener("timeupdate", function () {
    if (!audio.duration) return;

    const percentage = (audio.currentTime / audio.duration) * 100;

    fullProgressBar.value = percentage;
    fullCurrentTimeText.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", function () {
    fullDurationText.textContent = formatTime(audio.duration);
});

// =========================================
// TABS (Chat / Reactions)
// =========================================

function showTab(tab) {

    const chatPanel = document.getElementById("chatPanel");
    const reactionsPanel = document.getElementById("reactionsPanel");
    const tabChatBtn = document.getElementById("tabChatBtn");
    const tabReactionsBtn = document.getElementById("tabReactionsBtn");

    if (tab === "chat") {
        chatPanel.style.display = "flex";
        reactionsPanel.style.display = "none";
        tabChatBtn.classList.add("active");
        tabReactionsBtn.classList.remove("active");
    } else {
        chatPanel.style.display = "none";
        reactionsPanel.style.display = "flex";
        tabChatBtn.classList.remove("active");
        tabReactionsBtn.classList.add("active");
    }

}


// =========================================
// CHAT
// =========================================

function sendChatMessage() {

    const chatInput = document.getElementById("chatInput");

    const message = chatInput.value.trim();

    if (message === "") return;

    socket.emit("chat-message", {
        message: message
    });

    chatInput.value = "";

}

// Allow pressing Enter to send
document.addEventListener("DOMContentLoaded", function () {

    const chatInput = document.getElementById("chatInput");

    if (chatInput) {
        chatInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                sendChatMessage();
            }
        });
    }

});

socket.on("new-chat-message", (data) => {

    const chatMessages = document.getElementById("chatMessages");

    if (!chatMessages) return;

    const bubble = document.createElement("div");

    bubble.classList.add("chat-message");

    if (data.senderId === socket.id) {
        bubble.classList.add("own");
    }

    bubble.textContent = data.message;

    chatMessages.appendChild(bubble);

    // Auto-scroll to latest message
    chatMessages.scrollTop = chatMessages.scrollHeight;

});


// =========================================
// JAM CHOICE MODAL
// =========================================

function openJamChoice() {
    document.getElementById("jamChoiceModal")
        .style.display = "flex";
}

function closeJamChoice() {
    document.getElementById("jamChoiceModal")
        .style.display = "none";
}
