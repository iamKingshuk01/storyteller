/* =========================================================
   SLEEPSTORY - MAIN SCRIPT
   Home Page + Stories + Player + Jam
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const BACKEND_URL =
    "https://storyteller-backend-us3a.onrender.com";

const JAM_PAGE =
    "jam.html";


/* =========================================================
   SOCKET
========================================================= */

let socket = null;

try {

    if (typeof io !== "undefined") {

        socket = io(
            BACKEND_URL,
            {
                transports: [
                    "websocket",
                    "polling"
                ],

                reconnection: true,

                reconnectionAttempts: Infinity,

                reconnectionDelay: 1000
            }
        );

    }

} catch (error) {

    console.error(
        "Socket connection error:",
        error
    );

}


/* =========================================================
   DOM ELEMENTS
========================================================= */

const audioPlayer =
    document.getElementById("audioPlayer");

const playerTitle =
    document.getElementById("playerTitle");

const currentTimeElement =
    document.getElementById("currentTime");

const durationElement =
    document.getElementById("duration");

const progressBar =
    document.getElementById("progressBar");

const fullCurrentTime =
    document.getElementById("fullCurrentTime");

const fullDuration =
    document.getElementById("fullDuration");

const fullProgressBar =
    document.getElementById("fullProgressBar");

const fullPlayerTitle =
    document.getElementById("fullPlayerTitle");

const fullPlayer =
    document.getElementById("fullPlayer");

const fullPlayButton =
    document.getElementById("fullPlayButton");

const playButton =
    document.getElementById("playButton");


/* =========================================================
   YOUTUBE
========================================================= */

let youtubePlayer = null;

let youtubeReady = false;

let youtubeStoryActive = false;

let suppressJamEvents = false;


/* =========================================================
   JAM STATE
========================================================= */

let roomCode = null;

let isHost = false;

let pendingJoinRoom = null;


/* =========================================================
   STORY STATE
========================================================= */

let currentStory = null;

let currentCategoryStories = [];

let currentStoryIndex = 0;


/* =========================================================
   STORY LIBRARY
========================================================= */

const stories = [

    {
        title: "The Last Star",

        category: "Bedtime Stories",

        type: "local",

        src: "AUDIO/the-last-star.mp3",

        description:
            "A peaceful journey through a quiet universe."
    },

    {
        title: "Sunday Suspense 1",

        category: "Sunday Suspense",

        type: "youtube",

        videoId: "AWQ-7O4jFIk",

        description:
            "A thrilling Bengali audio story."
    },

    {
        title: "Sunday Suspense 2",

        category: "Sunday Suspense",

        type: "youtube",

        videoId: "w9W-LbYbeNs",

        description:
            "Another suspenseful journey."
    },

    {
        title: "Mirchi Bangla 1",

        category: "Mirchi Bangla",

        type: "youtube",

        videoId: "Ut5pYfY1YnY",

        description:
            "A Bengali audio experience."
    },

    {
        title: "Mirchi Bangla 2",

        category: "Mirchi Bangla",

        type: "youtube",

        videoId: "AWQ-7O4jFIk",

        description:
            "A story from the Bengali audio world."
    }

];


/* =========================================================
   INITIAL STORY
========================================================= */

if (stories.length > 0) {

    currentStory = stories[0];

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupAudio();

        setupSocketEvents();

        setupChat();

        restoreLastStory();

        console.log(
            "🌙 SleepStory loaded."
        );

    }
);


/* =========================================================
   YOUTUBE API
========================================================= */

window.onYouTubeIframeAPIReady =
function () {

    const youtubeElement =
        document.getElementById("youtubePlayer");

    if (!youtubeElement) {

        return;

    }

    youtubePlayer =
        new YT.Player(
            "youtubePlayer",
            {

                width: "100%",

                height: "450",

                playerVars: {

                    playsinline: 1,

                    controls: 1,

                    rel: 0

                },

                events: {

                    onReady:
                    function () {

                        youtubeReady = true;

                        console.log(
                            "🎬 YouTube player ready."
                        );

                    },

                    onStateChange:
                    function (event) {

                        if (!youtubeStoryActive) {

                            return;

                        }

                        if (suppressJamEvents) {

                            return;

                        }

                        if (
                            event.data ===
                            YT.PlayerState.PLAYING
                        ) {

                            updatePlayButtons(true);

                            syncJamPlay();

                        }

                        if (
                            event.data ===
                            YT.PlayerState.PAUSED
                        ) {

                            updatePlayButtons(false);

                            syncJamPause();

                        }

                    }

                }

            }
        );

};


/* =========================================================
   AUDIO SETUP
========================================================= */

function setupAudio() {

    if (!audioPlayer) {

        return;

    }

    audioPlayer.addEventListener(
        "loadedmetadata",
        function () {

            updateDuration();

            updateProgress();

        }
    );

    audioPlayer.addEventListener(
        "timeupdate",
        function () {

            updateProgress();

        }
    );

    audioPlayer.addEventListener(
        "play",
        function () {

            updatePlayButtons(true);

            if (suppressJamEvents) {

                return;

            }

            syncJamPlay();

        }
    );

    audioPlayer.addEventListener(
        "pause",
        function () {

            updatePlayButtons(false);

            if (suppressJamEvents) {

                return;

            }

            if (!audioPlayer.ended) {

                syncJamPause();

            }

        }
    );

    audioPlayer.addEventListener(
        "ended",
        function () {

            updatePlayButtons(false);

        }
    );

}


/* =========================================================
   SOCKET EVENTS
========================================================= */

function setupSocketEvents() {

    if (!socket) {

        return;

    }


    /* =========================================
       CONNECT
    ========================================= */

    socket.on(
        "connect",
        function () {

            console.log(
                "🟢 Connected to SleepStory server:",
                socket.id
            );

        }
    );


    /* =========================================
       CONNECTION ERROR
    ========================================= */

    socket.on(
        "connect_error",
        function (error) {

            console.error(
                "Socket connection error:",
                error
            );

        }
    );


    /* =========================================
       ROOM CREATED
    ========================================= */

    socket.on(
        "room-created",
        function (data) {

            if (!data) {

                return;

            }

            const code =
                (
                    data.roomCode ||
                    data.code ||
                    ""
                )
                    .toUpperCase();


            if (code.length !== 6) {

                alert(
                    "Invalid room code received."
                );

                return;

            }


            roomCode = code;

            isHost = true;


            /*
               Save current story before leaving
               the home page.
            */

            saveJamStory();


            console.log(
                "🌙 Jam created:",
                roomCode
            );


            /*
               IMPORTANT:
               Move to REAL NEW PAGE.
            */

            goToJamPage(
                roomCode,
                true
            );

        }
    );


    /* =========================================
       ROOM JOINED
    ========================================= */

    socket.on(
        "room-joined",
        function (data) {

            if (!data) {

                return;

            }


            const joinedRoom =
                (
                    data.roomCode ||
                    pendingJoinRoom ||
                    ""
                )
                    .toUpperCase();


            if (joinedRoom.length !== 6) {

                alert(
                    "Invalid room code."
                );

                return;

            }


            roomCode = joinedRoom;

            isHost = false;


            /*
               Save current story before
               moving to Jam page.
            */

            saveJamStory();


            console.log(
                "👥 Room joined:",
                joinedRoom
            );


            /*
               IMPORTANT:
               Move to REAL NEW PAGE.
            */

            goToJamPage(
                joinedRoom,
                false
            );

        }
    );


    /* =========================================
       ROOM ERROR
    ========================================= */

    socket.on(
        "room-error",
        function (message) {

            alert(
                message ||
                "Room not found!"
            );

        }
    );


    /* =========================================
       USER COUNT
    ========================================= */

    socket.on(
        "user-count",
        function (data) {

            const count =
                typeof data === "object"
                    ? data.count
                    : data;


            updateUserCount(count);

        }
    );


    /* =========================================
       REMOTE PLAY
    ========================================= */

    socket.on(
        "sync-play",
        function (data) {

            if (!data) {

                return;

            }

            applyRemotePlay(
                Number(data.currentTime) || 0
            );

        }
    );


    /* =========================================
       REMOTE PAUSE
    ========================================= */

    socket.on(
        "sync-pause",
        function (data) {

            if (!data) {

                return;

            }

            applyRemotePause(
                Number(data.currentTime) || 0
            );

        }
    );


    /* =========================================
       REMOTE SEEK
    ========================================= */

    socket.on(
        "sync-seek",
        function (data) {

            if (!data) {

                return;

            }

            applyRemoteSeek(
                Number(data.currentTime) || 0
            );

        }
    );


    /* =========================================
       REMOTE REACTION
    ========================================= */

    socket.on(
        "sync-reaction",
        function (data) {

            if (!data) {

                return;

            }

            showReaction(data.emoji);

        }
    );


    /* =========================================
       CHAT
    ========================================= */

    socket.on(
        "new-chat-message",
        function (data) {

            if (!data) {

                return;

            }

            addChatMessage(
                data.message || "",
                "Listener"
            );

        }
    );


    /* =========================================
       DISCONNECT
    ========================================= */

    socket.on(
        "disconnect",
        function () {

            console.log(
                "🔴 Disconnected from server."
            );

        }
    );

}


/* =========================================================
   GO TO JAM PAGE
========================================================= */

function goToJamPage(
    code,
    host
) {

    const cleanCode =
        String(code || "")
            .trim()
            .toUpperCase();


    if (cleanCode.length !== 6) {

        alert(
            "Invalid Jam room code."
        );

        return;

    }


    saveJamStory();


    let url =
        `${JAM_PAGE}?room=${encodeURIComponent(cleanCode)}`;


    if (host) {

        url += "&host=1";

    }


    console.log(
        "➡️ Opening Jam page:",
        url
    );


    window.location.href =
        url;

}


/* =========================================================
   CREATE ROOM
========================================================= */

function createRoom() {

    if (!socket) {

        alert(
            "Backend connection unavailable."
        );

        return;

    }


    if (!socket.connected) {

        alert(
            "Connecting to SleepStory server. Please wait a moment."
        );

        return;

    }


    /*
       Backend expects:

       socket.emit("create-room")

       It returns:

       room-created
    */

    saveJamStory();


    socket.emit(
        "create-room"
    );


    console.log(
        "🌙 Creating Jam..."
    );

}


/* =========================================================
   JOIN ROOM
========================================================= */

function joinRoom() {

    const modal =
        document.getElementById("roomModal");


    /*
       First click:
       open Join modal.
    */

    if (
        !modal ||
        modal.style.display !== "flex"
    ) {

        showRoomModal(false);

        return;

    }


    const input =
        document.getElementById("joinCode");


    if (!input) {

        return;

    }


    const code =
        input.value
            .trim()
            .toUpperCase();


    if (code.length !== 6) {

        alert(
            "Please enter a valid 6-character room code."
        );

        return;

    }


    if (!socket) {

        alert(
            "Backend connection unavailable."
        );

        return;

    }


    if (!socket.connected) {

        alert(
            "Connecting to SleepStory server. Please wait a moment."
        );

        return;

    }


    pendingJoinRoom = code;


    /*
       Backend expects STRING.

       NOT:

       { roomCode: code }
    */

    socket.emit(
        "join-room",
        code
    );


    console.log(
        "👥 Joining Jam:",
        code
    );

}


/* =========================================================
   SHOW ROOM MODAL
========================================================= */

function showRoomModal(
    creating
) {

    const modal =
        document.getElementById("roomModal");

    const title =
        document.getElementById("modalTitle");

    const text =
        document.getElementById("modalText");

    const roomCodeElement =
        document.getElementById("roomCode");

    const input =
        document.getElementById("joinCode");

    const action =
        document.getElementById("modalAction");


    if (!modal) {

        return;

    }


    modal.style.display = "flex";


    if (creating) {

        if (title) {

            title.textContent =
                "Create a Jam";

        }

        if (text) {

            text.textContent =
                "Creating your private listening room...";

        }

        if (roomCodeElement) {

            roomCodeElement.style.display =
                "block";

            roomCodeElement.textContent =
                "------";

        }

        if (input) {

            input.style.display =
                "none";

        }

        if (action) {

            action.style.display =
                "none";

        }

    } else {

        if (title) {

            title.textContent =
                "Join a Jam";

        }

        if (text) {

            text.textContent =
                "Enter the 6-character code shared by your friend.";

        }

        if (roomCodeElement) {

            roomCodeElement.style.display =
                "none";

        }

        if (input) {

            input.style.display =
                "block";

            input.value =
                "";

            setTimeout(
                function () {

                    input.focus();

                },
                100
            );

        }

        if (action) {

            action.style.display =
                "block";

            action.textContent =
                "Join Room";

        }

    }

}


/* =========================================================
   CLOSE ROOM MODAL
========================================================= */

function closeModal() {

    const modal =
        document.getElementById("roomModal");


    if (!modal) {

        return;

    }


    modal.style.display =
        "none";

}


/* =========================================================
   JAM CHOICE
========================================================= */

function openJamChoice() {

    const modal =
        document.getElementById("jamChoiceModal");


    if (!modal) {

        return;

    }


    modal.style.display =
        "flex";

}


function closeJamChoice() {

    const modal =
        document.getElementById("jamChoiceModal");


    if (!modal) {

        return;

    }


    modal.style.display =
        "none";

}


/* =========================================================
   STORY PLAY
========================================================= */

function playStory(
    story
) {

    let selectedStory =
        story;


    if (
        typeof story === "string"
    ) {

        selectedStory =
            stories.find(
                function (item) {

                    return (
                        item.title === story
                    );

                }
            );

    }


    if (!selectedStory) {

        console.warn(
            "Story not found:",
            story
        );

        return;

    }


    currentStory =
        selectedStory;


    updateStoryInfo(
        selectedStory
    );


    saveLastStory(
        selectedStory
    );


    saveJamStory();


    if (
        selectedStory.type ===
        "youtube"
    ) {

        playYouTubeStory(
            selectedStory
        );

    } else {

        playLocalStory(
            selectedStory
        );

    }


    openFullPlayer();

}


/* =========================================================
   LOCAL STORY
========================================================= */

function playLocalStory(
    story
) {

    if (!audioPlayer) {

        return;

    }


    youtubeStoryActive =
        false;


    if (
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            suppressJamEvents = true;

            youtubePlayer.pauseVideo();

            setTimeout(
                function () {

                    suppressJamEvents = false;

                },
                200
            );

        } catch (error) {}

    }


    audioPlayer.src =
        story.src;


    audioPlayer.load();


    audioPlayer.play()
        .catch(
            function (error) {

                console.log(
                    "Playback waiting for user interaction:",
                    error
                );

            }
        );

}


/* =========================================================
   YOUTUBE STORY
========================================================= */

function playYouTubeStory(
    story
) {

    if (!story.videoId) {

        return;

    }


    youtubeStoryActive =
        true;


    if (audioPlayer) {

        suppressJamEvents =
            true;

        audioPlayer.pause();

        setTimeout(
            function () {

                suppressJamEvents =
                    false;

            },
            200
        );

    }


    if (
        youtubePlayer &&
        youtubeReady
    ) {

        youtubePlayer.loadVideoById(
            story.videoId
        );

        youtubePlayer.playVideo();

    } else {

        console.log(
            "Waiting for YouTube API..."
        );

    }

}


/* =========================================================
   UPDATE STORY INFO
========================================================= */

function updateStoryInfo(
    story
) {

    if (!story) {

        return;

    }


    if (playerTitle) {

        playerTitle.textContent =
            story.title ||
            "SleepStory";

    }


    if (fullPlayerTitle) {

        fullPlayerTitle.textContent =
            story.title ||
            "SleepStory";

    }


    const fullRoomInfo =
        document.getElementById(
            "fullPlayerRoomInfo"
        );


    if (fullRoomInfo) {

        if (roomCode) {

            fullRoomInfo.textContent =
                `ROOM ${roomCode}`;

        } else {

            fullRoomInfo.textContent =
                "";

        }

    }

}


/* =========================================================
   TOGGLE PLAY
========================================================= */

function togglePlay() {

    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        const state =
            youtubePlayer.getPlayerState();


        if (
            state ===
            YT.PlayerState.PLAYING
        ) {

            youtubePlayer.pauseVideo();

        } else {

            youtubePlayer.playVideo();

        }


        return;

    }


    if (!audioPlayer) {

        return;

    }


    if (audioPlayer.paused) {

        audioPlayer.play()
            .catch(
                function (error) {

                    console.error(error);

                }
            );

    } else {

        audioPlayer.pause();

    }

}


/* =========================================================
   PLAY BUTTONS
========================================================= */

function updatePlayButtons(
    playing
) {

    if (playButton) {

        playButton.textContent =
            playing
                ? "❚❚"
                : "▶";

    }


    if (fullPlayButton) {

        fullPlayButton.textContent =
            playing
                ? "❚❚"
                : "▶";

    }

}


/* =========================================================
   PROGRESS
========================================================= */

function changeProgress() {

    if (!progressBar) {

        return;

    }


    const duration =
        getCurrentDuration();


    if (
        !duration ||
        !Number.isFinite(duration)
    ) {

        return;

    }


    const percentage =
        Number(progressBar.value);


    const newTime =
        (
            percentage / 100
        ) * duration;


    setCurrentTime(newTime);

    syncJamSeek();

}


function changeProgressFull() {

    if (!fullProgressBar) {

        return;

    }


    const duration =
        getCurrentDuration();


    if (
        !duration ||
        !Number.isFinite(duration)
    ) {

        return;

    }


    const percentage =
        Number(fullProgressBar.value);


    const newTime =
        (
            percentage / 100
        ) * duration;


    setCurrentTime(newTime);

    syncJamSeek();

}


/* =========================================================
   CURRENT TIME
========================================================= */

function getCurrentTime() {

    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            return Number(
                youtubePlayer.getCurrentTime()
            ) || 0;

        } catch (error) {

            return 0;

        }

    }


    return Number(
        audioPlayer?.currentTime
    ) || 0;

}


/* =========================================================
   SET CURRENT TIME
========================================================= */

function setCurrentTime(
    time
) {

    suppressJamEvents =
        true;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            youtubePlayer.seekTo(
                time,
                true
            );

        } catch (error) {}

    } else if (audioPlayer) {

        audioPlayer.currentTime =
            time;

    }


    setTimeout(
        function () {

            suppressJamEvents =
                false;

        },
        150
    );

}


/* =========================================================
   DURATION
========================================================= */

function getCurrentDuration() {

    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            return Number(
                youtubePlayer.getDuration()
            ) || 0;

        } catch (error) {

            return 0;

        }

    }


    return Number(
        audioPlayer?.duration
    ) || 0;

}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgress() {

    const current =
        getCurrentTime();


    const duration =
        getCurrentDuration();


    if (currentTimeElement) {

        currentTimeElement.textContent =
            formatTime(current);

    }


    if (fullCurrentTime) {

        fullCurrentTime.textContent =
            formatTime(current);

    }


    if (durationElement) {

        durationElement.textContent =
            formatTime(duration);

    }


    if (fullDuration) {

        fullDuration.textContent =
            formatTime(duration);

    }


    if (duration > 0) {

        const percentage =
            (
                current / duration
            ) * 100;


        if (progressBar) {

            progressBar.value =
                percentage;

        }


        if (fullProgressBar) {

            fullProgressBar.value =
                percentage;

        }

    }

}


/* =========================================================
   UPDATE DURATION
========================================================= */

function updateDuration() {

    const duration =
        getCurrentDuration();


    if (durationElement) {

        durationElement.textContent =
            formatTime(duration);

    }


    if (fullDuration) {

        fullDuration.textContent =
            formatTime(duration);

    }

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    seconds
) {

    const number =
        Number(seconds);


    if (
        !Number.isFinite(number) ||
        number < 0
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(
            number / 60
        );


    const secs =
        Math.floor(
            number % 60
        );


    return (
        minutes +
        ":" +
        String(secs)
            .padStart(2, "0")
    );

}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

    if (!audioPlayer) {

        return;

    }


    audioPlayer.muted =
        !audioPlayer.muted;


    const buttons =
        document.querySelectorAll(
            '[onclick="toggleMute()"]'
        );


    buttons.forEach(
        function (button) {

            button.textContent =
                audioPlayer.muted
                    ? "🔇"
                    : "🔊";

        }
    );

}


/* =========================================================
   SLEEP TIMER
========================================================= */

let sleepTimerTimeout =
    null;


function setSleepTimer() {

    const select =
        document.getElementById(
            "sleepTimer"
        );


    if (!select) {

        return;

    }


    if (sleepTimerTimeout) {

        clearTimeout(
            sleepTimerTimeout
        );

    }


    const minutes =
        Number(select.value);


    if (minutes === 0) {

        return;

    }


    sleepTimerTimeout =
        setTimeout(
            function () {

                if (
                    youtubeStoryActive &&
                    youtubePlayer &&
                    youtubeReady
                ) {

                    youtubePlayer.pauseVideo();

                } else if (audioPlayer) {

                    audioPlayer.pause();

                }


                select.value = "0";


                alert(
                    "🌙 Sleep timer finished."
                );

            },
            minutes * 60 * 1000
        );

}


/* =========================================================
   FULL PLAYER
========================================================= */

function openFullPlayer() {

    if (!fullPlayer) {

        return;

    }


    fullPlayer.classList.add("active");

    fullPlayer.style.display =
        "flex";


    updateStoryInfo(
        currentStory
    );


    updateProgress();

}


function closeFullPlayer() {

    if (!fullPlayer) {

        return;

    }


    fullPlayer.classList.remove("active");

    fullPlayer.style.display =
        "none";

}


/* =========================================================
   CATEGORY
========================================================= */

function openCategory(
    category
) {

    const modal =
        document.getElementById(
            "categoryModal"
        );

    const title =
        document.getElementById(
            "categoryTitle"
        );

    const library =
        document.getElementById(
            "storyLibrary"
        );


    if (!modal || !library) {

        return;

    }


    currentCategoryStories =
        stories.filter(
            function (story) {

                return (
                    story.category ===
                    category
                );

            }
        );


    currentStoryIndex = 0;


    if (title) {

        title.textContent =
            category;

    }


    library.innerHTML = "";


    if (
        currentCategoryStories.length === 0
    ) {

        library.innerHTML = `
            <div class="empty-state">
                No stories available yet.
            </div>
        `;

    } else {

        currentCategoryStories.forEach(
            function (story, index) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "story-library-item";


                item.innerHTML = `

                    <div class="story-library-info">

                        <h3>
                            ${escapeHTML(
                                story.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                story.description ||
                                story.category
                            )}
                        </p>

                    </div>

                    <button
                        class="play-library-btn"
                        onclick="playCategoryStory(${index})"
                    >
                        ▶
                    </button>

                `;


                library.appendChild(item);

            }
        );

    }


    modal.style.display =
        "flex";

}


/* =========================================================
   CATEGORY STORY PLAY
========================================================= */

function playCategoryStory(
    index
) {

    if (!currentCategoryStories[index]) {

        return;

    }


    currentStoryIndex =
        index;


    const story =
        currentCategoryStories[index];


    playStory(story);

    closeCategory();

}


/* =========================================================
   CLOSE CATEGORY
========================================================= */

function closeCategory() {

    const modal =
        document.getElementById(
            "categoryModal"
        );


    if (!modal) {

        return;

    }


    modal.style.display =
        "none";

}


/* =========================================================
   PREVIOUS STORY
========================================================= */

function previousStory() {

    if (
        currentCategoryStories.length === 0
    ) {

        return;

    }


    currentStoryIndex--;


    if (currentStoryIndex < 0) {

        currentStoryIndex =
            currentCategoryStories.length - 1;

    }


    playCategoryStory(
        currentStoryIndex
    );

}


/* =========================================================
   NEXT STORY
========================================================= */

function nextStory() {

    if (
        currentCategoryStories.length === 0
    ) {

        return;

    }


    currentStoryIndex++;


    if (
        currentStoryIndex >=
        currentCategoryStories.length
    ) {

        currentStoryIndex = 0;

    }


    playCategoryStory(
        currentStoryIndex
    );

}


/* =========================================================
   SEARCH
========================================================= */

function toggleSearch() {

    const searchBox =
        document.getElementById(
            "searchBox"
        );


    if (!searchBox) {

        return;

    }


    if (
        searchBox.style.display ===
        "block"
    ) {

        searchBox.style.display =
            "none";

    } else {

        searchBox.style.display =
            "block";


        const input =
            document.getElementById(
                "searchInput"
            );


        if (input) {

            input.focus();

        }

    }

}


function searchStories() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {

        return;

    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    const cards =
        document.querySelectorAll(
            ".story-card"
        );


    cards.forEach(
        function (card) {

            const title =
                (
                    card.dataset.title ||
                    card.textContent ||
                    ""
                )
                    .toLowerCase();


            card.style.display =
                (
                    !query ||
                    title.includes(query)
                )
                    ? ""
                    : "none";

        }
    );

}


/* =========================================================
   MOOD
========================================================= */

function selectMood(
    mood
) {

    console.log(
        "Selected mood:",
        mood
    );


    const normalized =
        String(mood)
            .toLowerCase();


    const cards =
        document.querySelectorAll(
            ".story-card"
        );


    cards.forEach(
        function (card) {

            const text =
                card.textContent
                    .toLowerCase();


            card.style.display =
                text.includes(normalized)
                    ? ""
                    : "none";

        }
    );

}


/* =========================================================
   REACTION
========================================================= */

function sendReaction(
    emoji
) {

    if (!emoji) {

        return;

    }


    showReaction(emoji);


    if (
        socket &&
        roomCode
    ) {

        socket.emit(
            "reaction",
            {
                emoji
            }
        );

    }

}


/* =========================================================
   SHOW REACTION
========================================================= */

function showReaction(
    emoji
) {

    const container =
        document.getElementById(
            "reactionContainer"
        );


    if (!container) {

        return;

    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "floating-reaction";


    element.textContent =
        emoji;


    element.style.position =
        "fixed";

    element.style.left =
        (
            Math.random() * 80 + 10
        ) + "%";

    element.style.bottom =
        "90px";

    element.style.zIndex =
        "99999";

    element.style.fontSize =
        "30px";

    element.style.pointerEvents =
        "none";

    element.style.transition =
        "transform 2s ease, opacity 2s ease";

    element.style.opacity =
        "1";


    container.appendChild(
        element
    );


    requestAnimationFrame(
        function () {

            element.style.transform =
                "translateY(-180px) scale(1.4)";

            element.style.opacity =
                "0";

        }
    );


    setTimeout(
        function () {

            element.remove();

        },
        2200
    );

}


/* =========================================================
   CHAT SETUP
========================================================= */

function setupChat() {

    const input =
        document.getElementById(
            "chatInput"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendChatMessage();

            }

        }
    );

}


/* =========================================================
   SEND CHAT
========================================================= */

function sendChatMessage() {

    const input =
        document.getElementById(
            "chatInput"
        );


    if (!input) {

        return;

    }


    const message =
        input.value.trim();


    if (!message) {

        return;

    }


    if (
        socket &&
        roomCode
    ) {

        socket.emit(
            "chat-message",
            {
                message
            }
        );

    } else {

        addChatMessage(
            message,
            "You"
        );

    }


    input.value = "";

}


/* =========================================================
   ADD CHAT MESSAGE
========================================================= */

function addChatMessage(
    message,
    username
) {

    const container =
        document.getElementById(
            "chatMessages"
        );


    if (!container) {

        return;

    }


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-message";


    item.innerHTML = `

        <strong>
            ${escapeHTML(username)}
        </strong>

        <span>
            ${escapeHTML(message)}
        </span>

    `;


    container.appendChild(
        item
    );


    container.scrollTop =
        container.scrollHeight;

}


/* =========================================================
   TABS
========================================================= */

function showTab(
    tab
) {

    const chatPanel =
        document.getElementById(
            "chatPanel"
        );

    const reactionsPanel =
        document.getElementById(
            "reactionsPanel"
        );

    const chatButton =
        document.getElementById(
            "tabChatBtn"
        );

    const reactionsButton =
        document.getElementById(
            "tabReactionsBtn"
        );


    if (tab === "chat") {

        if (chatPanel) {

            chatPanel.style.display =
                "block";

        }

        if (reactionsPanel) {

            reactionsPanel.style.display =
                "none";

        }

        if (chatButton) {

            chatButton.classList.add("active");

        }

        if (reactionsButton) {

            reactionsButton.classList.remove("active");

        }

    } else {

        if (chatPanel) {

            chatPanel.style.display =
                "none";

        }

        if (reactionsPanel) {

            reactionsPanel.style.display =
                "block";

        }

        if (chatButton) {

            chatButton.classList.remove("active");

        }

        if (reactionsButton) {

            reactionsButton.classList.add("active");

        }

    }

}


/* =========================================================
   USER COUNT
========================================================= */

function updateUserCount(
    count
) {

    const element =
        document.getElementById(
            "userCount"
        );


    if (!element) {

        return;

    }


    const number =
        Math.max(
            Number(count) || 1,
            1
        );


    element.textContent =
        `👥 ${number} ${
            number === 1
                ? "listener"
                : "listeners"
        }`;

}


/* =========================================================
   SAVE CURRENT STORY FOR JAM PAGE
========================================================= */

function saveJamStory() {

    try {

        if (!currentStory) {

            return;

        }


        localStorage.setItem(
            "sleepstory-current-story",
            JSON.stringify(currentStory)
        );


    } catch (error) {

        console.warn(
            "Could not save current Jam story:",
            error
        );

    }

}


/* =========================================================
   JAM PLAY SYNC
========================================================= */

function syncJamPlay() {

    if (
        suppressJamEvents ||
        !socket ||
        !roomCode
    ) {

        return;

    }


    socket.emit(
        "play",
        {
            currentTime:
                getCurrentTime()
        }
    );

}


/* =========================================================
   JAM PAUSE SYNC
========================================================= */

function syncJamPause() {

    if (
        suppressJamEvents ||
        !socket ||
        !roomCode
    ) {

        return;

    }


    socket.emit(
        "pause",
        {
            currentTime:
                getCurrentTime()
        }
    );

}


/* =========================================================
   JAM SEEK SYNC
========================================================= */

function syncJamSeek() {

    if (
        suppressJamEvents ||
        !socket ||
        !roomCode
    ) {

        return;

    }


    socket.emit(
        "seek",
        {
            currentTime:
                getCurrentTime()
        }
    );

}


/* =========================================================
   REMOTE PLAY
========================================================= */

function applyRemotePlay(
    time
) {

    suppressJamEvents =
        true;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            youtubePlayer.seekTo(
                time,
                true
            );

            youtubePlayer.playVideo();

        } catch (error) {}

    } else if (audioPlayer) {

        audioPlayer.currentTime =
            time;


        audioPlayer.play()
            .catch(
                function () {}
            );

    }


    updatePlayButtons(true);


    setTimeout(
        function () {

            suppressJamEvents =
                false;

        },
        500
    );

}


/* =========================================================
   REMOTE PAUSE
========================================================= */

function applyRemotePause(
    time
) {

    suppressJamEvents =
        true;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            youtubePlayer.seekTo(
                time,
                true
            );

            youtubePlayer.pauseVideo();

        } catch (error) {}

    } else if (audioPlayer) {

        audioPlayer.currentTime =
            time;

        audioPlayer.pause();

    }


    updatePlayButtons(false);


    setTimeout(
        function () {

            suppressJamEvents =
                false;

        },
        500
    );

}


/* =========================================================
   REMOTE SEEK
========================================================= */

function applyRemoteSeek(
    time
) {

    suppressJamEvents =
        true;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            youtubePlayer.seekTo(
                time,
                true
            );

        } catch (error) {}

    } else if (audioPlayer) {

        audioPlayer.currentTime =
            time;

    }


    setTimeout(
        function () {

            suppressJamEvents =
                false;

        },
        300
    );

}


/* =========================================================
   STORY PERSISTENCE
========================================================= */

function saveLastStory(
    story
) {

    try {

        localStorage.setItem(
            "sleepstory-last-story",
            JSON.stringify(story)
        );

    } catch (error) {}

}


function restoreLastStory() {

    try {

        const saved =
            localStorage.getItem(
                "sleepstory-last-story"
            );


        if (!saved) {

            return;

        }


        const story =
            JSON.parse(saved);


        if (
            story &&
            story.title
        ) {

            currentStory =
                story;

        }

    } catch (error) {

        console.warn(
            "Could not restore story."
        );

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   WINDOW CLICK
========================================================= */

window.addEventListener(
    "click",
    function (event) {

        const categoryModal =
            document.getElementById(
                "categoryModal"
            );

        const jamChoiceModal =
            document.getElementById(
                "jamChoiceModal"
            );

        const roomModal =
            document.getElementById(
                "roomModal"
            );


        if (
            event.target ===
            categoryModal
        ) {

            closeCategory();

        }


        if (
            event.target ===
            jamChoiceModal
        ) {

            closeJamChoice();

        }


        if (
            event.target ===
            roomModal
        ) {

            closeModal();

        }

    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        const activeElement =
            document.activeElement;


        const tag =
            activeElement?.tagName
                ?.toLowerCase();


        if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select"
        ) {

            return;

        }


        if (
            event.code === "Space"
        ) {

            event.preventDefault();

            togglePlay();

        }


        if (
            event.key === "Escape"
        ) {

            closeCategory();

            closeJamChoice();

            closeModal();

            closeFullPlayer();

        }

    }
);


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "🌙 SleepStory main script ready."
);