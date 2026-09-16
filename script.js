const socket = io("https://storyteller-backend-us3a.onrender.com");

console.log("🔌 Connected to SleepStory server");

/* =========================================
   SLEEPSTORY
   YouTube-powered Player + Jam
========================================= */


// =========================================
// STORY LIST
// =========================================

const stories = [
    { title: "Sunday Suspense", youtubeId: "dQw4w9WgXcQ" },
    { title: "Mirchi Bangla", youtubeId: "dQw4w9WgXcQ" },
    { title: "Love Story", youtubeId: "dQw4w9WgXcQ" },
    { title: "Horror Story", youtubeId: "dQw4w9WgXcQ" },
    { title: "Sleepy Night", youtubeId: "dQw4w9WgXcQ" },
    { title: "Moonlight Dreams", youtubeId: "dQw4w9WgXcQ" },
    { title: "The Silent Forest", youtubeId: "dQw4w9WgXcQ" },
    { title: "Ocean Whispers", youtubeId: "dQw4w9WgXcQ" }
];

let currentStoryIndex = 0;

let ytPlayer = null;
let ytReady = false;
let pendingAutoplay = false;


// =========================================
// DOM ELEMENTS
// =========================================

const playButton = document.getElementById("playButton");
const progressBar = document.getElementById("progressBar");
const currentTimeText = document.getElementById("currentTime");
const durationText = document.getElementById("duration");
const playerTitle = document.getElementById("playerTitle");

const fullPlayer = document.getElementById("fullPlayer");
const fullPlayButton = document.getElementById("fullPlayButton");
const fullProgressBar = document.getElementById("fullProgressBar");
const fullCurrentTimeText = document.getElementById("fullCurrentTime");
const fullDurationText = document.getElementById("fullDuration");
const fullPlayerTitle = document.getElementById("fullPlayerTitle");
const fullPlayerRoomInfo = document.getElementById("fullPlayerRoomInfo");


// =========================================
// YOUTUBE PLAYER SETUP
// =========================================

function onYouTubeIframeAPIReady() {

    ytPlayer = new YT.Player("youtubePlayer", {
        height: "100%",
        width: "100%",
        videoId: stories[currentStoryIndex].youtubeId,
        playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });

}

function onPlayerReady() {

    ytReady = true;

    loadCurrentStory(false);

    if (pendingAutoplay) {
        ytPlayer.playVideo();
        pendingAutoplay = false;
    }

}

function onPlayerStateChange(event) {

    if (event.data === YT.PlayerState.PLAYING) {
        playButton.textContent = "❚❚";
        updateFullPlayButton(true);
    }

    if (event.data === YT.PlayerState.PAUSED) {
        playButton.textContent = "▶";
        updateFullPlayButton(false);
    }

    if (event.data === YT.PlayerState.ENDED) {
        playButton.textContent = "▶";
        updateFullPlayButton(false);
        progressBar.value = 0;
        fullProgressBar.value = 0;
    }

}


// =========================================
// PROGRESS POLLING (YouTube API-তে timeupdate event নেই)
// =========================================

setInterval(function () {

    if (!ytReady || !ytPlayer || !ytPlayer.getCurrentTime) return;

    const current = ytPlayer.getCurrentTime();
    const duration = ytPlayer.getDuration();

    if (!duration) return;

    const percentage = (current / duration) * 100;

    progressBar.value = percentage;
    fullProgressBar.value = percentage;

    currentTimeText.textContent = formatTime(current);
    fullCurrentTimeText.textContent = formatTime(current);

    durationText.textContent = formatTime(duration);
    fullDurationText.textContent = formatTime(duration);

}, 500);


// =========================================
// PLAY / PAUSE
// =========================================

function togglePlay() {

    if (!ytReady) return;

    const state = ytPlayer.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {

        ytPlayer.pauseVideo();

        socket.emit("pause", {
            currentTime: ytPlayer.getCurrentTime()
        });

    } else {

        ytPlayer.playVideo();

        openFullPlayer();

        socket.emit("play", {
            currentTime: ytPlayer.getCurrentTime()
        });

    }

}

// RECEIVE PLAY FROM OTHER USER
socket.on("sync-play", (data) => {
    if (!ytReady) return;
    ytPlayer.seekTo(data.currentTime, true);
    ytPlayer.playVideo();
});

// RECEIVE PAUSE FROM OTHER USER
socket.on("sync-pause", (data) => {
    if (!ytReady) return;
    ytPlayer.seekTo(data.currentTime, true);
    ytPlayer.pauseVideo();
});

// RECEIVE SEEK FROM OTHER USER
socket.on("sync-seek", (data) => {
    if (!ytReady) return;
    ytPlayer.seekTo(data.currentTime, true);
});


// =========================================
// PLAY STORY
// =========================================

function playStory(storyName) {

    const foundIndex = stories.findIndex(
        (story) => story.title === storyName
    );

    if (foundIndex !== -1) {
        currentStoryIndex = foundIndex;
    }

    if (!ytReady) {
        pendingAutoplay = true;
        openFullPlayer();
        loadCurrentStory(false);
        return;
    }

    loadCurrentStory(true);
    openFullPlayer();

}

function loadCurrentStory(autoplay) {

    const story = stories[currentStoryIndex];

    playerTitle.textContent = story.title;
    fullPlayerTitle.textContent = story.title;

    if (!ytReady) return;

    if (autoplay) {
        ytPlayer.loadVideoById(story.youtubeId);
    } else {
        ytPlayer.cueVideoById(story.youtubeId);
    }

}

function nextStory() {

    currentStoryIndex = (currentStoryIndex + 1) % stories.length;

    loadCurrentStory(true);

}

function previousStory() {

    currentStoryIndex =
        (currentStoryIndex - 1 + stories.length) % stories.length;

    loadCurrentStory(true);

}


// =========================================
// FORMAT TIME
// =========================================

function formatTime(seconds) {

    if (isNaN(seconds)) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return minutes + ":" + String(remainingSeconds).padStart(2, "0");

}


// =========================================
// CHANGE PROGRESS (mini player)
// =========================================

function changeProgress() {

    if (!ytReady) return;

    const duration = ytPlayer.getDuration();

    if (!duration) return;

    const newTime = (progressBar.value / 100) * duration;

    ytPlayer.seekTo(newTime, true);

    socket.emit("seek", {
        currentTime: newTime
    });

}

function changeProgressFull() {

    if (!ytReady) return;

    const duration = ytPlayer.getDuration();

    if (!duration) return;

    const newTime = (fullProgressBar.value / 100) * duration;

    ytPlayer.seekTo(newTime, true);

    socket.emit("seek", {
        currentTime: newTime
    });

}


// =========================================
// MUTE
// =========================================

function toggleMute() {

    if (!ytReady) return;

    if (ytPlayer.isMuted()) {
        ytPlayer.unMute();
    } else {
        ytPlayer.mute();
    }

}


// =========================================
// SLEEP TIMER
// =========================================

let sleepTimer = null;

function setSleepTimer() {

    const select = document.getElementById("sleepTimer");
    const minutes = Number(select.value);

    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
    }

    if (minutes === 0) return;

    sleepTimer = setTimeout(function () {

        if (ytReady) {
            ytPlayer.pauseVideo();
        }

        playButton.textContent = "▶";
        updateFullPlayButton(false);

        alert("🌙 Good night! Sleep timer finished.");

    }, minutes * 60 * 1000);

    alert("🌙 Sleep timer set for " + minutes + " minutes.");

}


// =========================================
// SEARCH
// =========================================

function toggleSearch() {

    const searchBox = document.getElementById("searchBox");

    if (searchBox.style.display === "block") {
        searchBox.style.display = "none";
    } else {
        searchBox.style.display = "block";
        document.getElementById("searchInput").focus();
    }

}

function searchStories() {

    const input = document.getElementById("searchInput").value.toLowerCase();
    const cards = document.querySelectorAll(".story-card");

    cards.forEach(function (card) {

        const title = card.getAttribute("data-title").toLowerCase();

        if (title.includes(input)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }

    });

}


// =========================================
// MOOD FILTER
// =========================================

function filterMood(category) {

    const cards = document.querySelectorAll(".story-card");

    cards.forEach(function (card) {

        const cardCategory = card.getAttribute("data-category");

        if (cardCategory === category) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }

    });

    document.getElementById("stories").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}

function showAllStories() {

    const cards = document.querySelectorAll(".story-card");

    cards.forEach(function (card) {
        card.style.display = "block";
    });

}


// =========================================
// JAM
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

    modal.style.display = "flex";

    modalTitle.textContent = "Join a Jam";
    modalText.textContent = "Enter the 6-character room code shared by your friend.";

    roomCode.style.display = "none";
    joinCode.style.display = "block";
    joinCode.value = "";

    action.textContent = "Join Room";
    action.onclick = connectToRoom;

}

function connectToRoom() {

    const joinCode = document.getElementById("joinCode");
    const code = joinCode.value.trim().toUpperCase();

    if (code.length !== 6) {
        alert("Please enter a valid 6-character room code.");
        return;
    }

    console.log("🔗 Joining room:", code);

    socket.emit("join-room", code);

}


// =========================================
// ROOM JOINED
// =========================================

socket.on("room-joined", (data) => {

    console.log("👥 Successfully joined:", data.roomCode);

    function applyJoinedState() {