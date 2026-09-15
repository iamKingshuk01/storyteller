/* =========================================================
   SLEEPSTORY — COMPLETE SCRIPT
   Compatible with current index.html
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const BACKEND_URL =
    "https://storyteller-backend-us3a.onrender.com";


/* =========================================================
   SOCKET.IO
========================================================= */

let socket = null;

try {
    if (typeof io !== "undefined") {
        socket = io(BACKEND_URL, {
            transports: ["websocket", "polling"]
        });
    }
} catch (error) {
    console.error("Socket connection error:", error);
}


/* =========================================================
   AUDIO
========================================================= */

const audioPlayer = document.getElementById("audioPlayer");

const playerTitle = document.getElementById("playerTitle");

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
   YOUTUBE PLAYER
========================================================= */

let youtubePlayer = null;
let youtubeReady = false;
let youtubeStoryActive = false;


/*
   YouTube API calls this automatically
*/

window.onYouTubeIframeAPIReady = function () {

    youtubePlayer = new YT.Player("youtubePlayer", {

        width: "100%",
        height: "450",

        playerVars: {
            playsinline: 1,
            controls: 1,
            rel: 0
        },

        events: {

            onReady: function () {

                youtubeReady = true;

                console.log("YouTube Player Ready");

                const container =
                    document.getElementById(
                        "youtubePlayerContainer"
                    );

                if (container) {
                    container.style.display = "none";
                }
            },

            onStateChange: function (event) {

                if (!youtubeStoryActive) return;

                if (event.data === YT.PlayerState.PLAYING) {

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

                if (
                    event.data ===
                    YT.PlayerState.ENDED
                ) {

                    updatePlayButtons(false);
                }
            }
        }
    });
};


/* =========================================================
   STORIES
========================================================= */

const stories = [

    {
        title: "SleepStory",
        category: "Bedtime Stories",
        type: "local",
        src: "AUDIO/the-last-star.mp3"
    }

];


/*
   YouTube story library

   IMPORTANT:
   These are example entries.
   Replace/add official YouTube video IDs
   that you are allowed to embed.
*/

const storyCategories = {

    "Sunday Suspense": [

        {
            title: "Sunday Suspense",
            description:
                "Bengali suspense and thriller stories",
            type: "youtube",
            videoId: "AWQ-7O4jFIk"
        },

        {
            title: "Sunday Suspense Story",
            description:
                "Mystery and suspense audio",
            type: "youtube",
            videoId: "w9W-LbYbeNs"
        }

    ],


    "Mirchi Bangla": [

        {
            title: "Mirchi Bangla",
            description:
                "Bengali audio storytelling",
            type: "youtube",
            videoId: "Ut5pYfY1YnY"
        },

        {
            title: "Mirchi Bangla Story",
            description:
                "Popular Bengali story",
            type: "youtube",
            videoId: "AWQ-7O4jFIk"
        }

    ],


    "Love Stories": [

        {
            title: "Love Stories",
            description:
                "Romantic Bengali stories",
            type: "youtube",
            videoId: ""
        }

    ],


    "Horror Stories": [

        {
            title: "Horror Stories",
            description:
                "Ghost and paranormal stories",
            type: "youtube",
            videoId: ""
        }

    ],


    "Mystery & Thriller": [

        {
            title: "Mystery & Thriller",
            description:
                "Mystery and investigation",
            type: "youtube",
            videoId: ""
        }

    ],


    "Crime Stories": [

        {
            title: "Crime Stories",
            description:
                "Crime and detective stories",
            type: "youtube",
            videoId: ""
        }

    ],


    "Emotional Stories": [

        {
            title: "Emotional Stories",
            description:
                "Emotional and life stories",
            type: "youtube",
            videoId: ""
        }

    ],


    "Bedtime Stories": [

        {
            title: "SleepStory",
            description:
                "Calm and relaxing bedtime audio",
            type: "local",
            src: "AUDIO/the-last-star.mp3"
        }

    ],


    "Bengali Stories": [

        {
            title: "Bengali Stories",
            description:
                "Bengali audio stories",
            type: "youtube",
            videoId: ""
        }

    ],


    "English Stories": [

        {
            title: "English Stories",
            description:
                "English audio stories",
            type: "youtube",
            videoId: ""
        }

    ]

};


/* =========================================================
   CURRENT STORY
========================================================= */

let currentStory = null;

let currentCategoryStories = [];

let currentStoryIndex = 0;


/* =========================================================
   INITIAL SETUP
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    if (audioPlayer) {

        audioPlayer.volume = 1;

        audioPlayer.addEventListener(
            "loadedmetadata",
            updateDuration
        );

        audioPlayer.addEventListener(
            "timeupdate",
            updateProgress
        );

        audioPlayer.addEventListener(
            "play",
            function () {

                youtubeStoryActive = false;

                updatePlayButtons(true);

                syncJamPlay();
            }
        );

        audioPlayer.addEventListener(
            "pause",
            function () {

                if (!audioPlayer.ended) {

                    updatePlayButtons(false);

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


    /*
       Hide YouTube player initially
    */

    const youtubeContainer =
        document.getElementById(
            "youtubePlayerContainer"
        );

    if (youtubeContainer) {
        youtubeContainer.style.display = "none";
    }


    /*
       Enter key for chat
    */

    const chatInput =
        document.getElementById("chatInput");

    if (chatInput) {

        chatInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {
                    sendChatMessage();
                }

            }
        );
    }


    /*
       Socket events
    */

    setupSocketEvents();

});


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {

    if (
        !seconds ||
        isNaN(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );
}


/* =========================================================
   UPDATE DURATION
========================================================= */

function updateDuration() {

    if (!audioPlayer) return;

    const duration =
        audioPlayer.duration;

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
   UPDATE PROGRESS
========================================================= */

function updateProgress() {

    if (!audioPlayer) return;

    const current =
        audioPlayer.currentTime;

    const duration =
        audioPlayer.duration;


    if (currentTimeElement) {

        currentTimeElement.textContent =
            formatTime(current);
    }


    if (fullCurrentTime) {

        fullCurrentTime.textContent =
            formatTime(current);
    }


    if (
        progressBar &&
        duration
    ) {

        progressBar.value =
            (current / duration) * 100;
    }


    if (
        fullProgressBar &&
        duration
    ) {

        fullProgressBar.value =
            (current / duration) * 100;
    }
}


/* =========================================================
   PLAY LOCAL STORY
========================================================= */

function playLocalStory(story) {

    if (!audioPlayer) return;

    youtubeStoryActive = false;


    /*
       Hide YouTube
    */

    const youtubeContainer =
        document.getElementById(
            "youtubePlayerContainer"
        );

    if (youtubeContainer) {

        youtubeContainer.style.display =
            "none";
    }


    /*
       Stop YouTube
    */

    if (
        youtubePlayer &&
        youtubeReady
    ) {

        try {
            youtubePlayer.stopVideo();
        } catch (error) {
            console.log(error);
        }
    }


    /*
       Set local audio
    */

    audioPlayer.src = story.src;

    audioPlayer.load();


    currentStory = story;


    updateStoryInfo(story);


    audioPlayer.play()
        .then(function () {

            updatePlayButtons(true);

        })
        .catch(function (error) {

            console.log(
                "Browser blocked autoplay:",
                error
            );

        });
}


/* =========================================================
   PLAY YOUTUBE STORY
========================================================= */

function playYouTubeStory(story) {

    if (
        !youtubePlayer ||
        !youtubeReady
    ) {

        alert(
            "YouTube player is still loading. Please try again."
        );

        return;
    }


    if (!story.videoId) {

        alert(
            "এই category-তে এখনও কোনো YouTube story যোগ করা হয়নি।"
        );

        return;
    }


    /*
       Pause local audio
    */

    if (audioPlayer) {

        audioPlayer.pause();
    }


    youtubeStoryActive = true;


    /*
       Show YouTube player
    */

    const youtubeContainer =
        document.getElementById(
            "youtubePlayerContainer"
        );

    if (youtubeContainer) {

        youtubeContainer.style.display =
            "block";
    }


    /*
       Load video
    */

    youtubePlayer.loadVideoById(
        story.videoId
    );


    currentStory = story;


    updateStoryInfo(story);


    /*
       Scroll player into view
    */

    if (youtubeContainer) {

        youtubeContainer.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =========================================================
   PLAY STORY
========================================================= */

function playStory(story) {

    if (!story) return;

    if (story.type === "youtube") {

        playYouTubeStory(story);

    } else {

        playLocalStory(story);

    }
}


/* =========================================================
   UPDATE STORY INFO
========================================================= */

function updateStoryInfo(story) {

    if (!story) return;


    if (playerTitle) {

        playerTitle.textContent =
            story.title;
    }


    if (fullPlayerTitle) {

        fullPlayerTitle.textContent =
            story.title;
    }
}


/* =========================================================
   TOGGLE PLAY
========================================================= */

function togglePlay() {

    /*
       YouTube
    */

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


    /*
       Local audio
    */

    if (!audioPlayer) return;


    if (audioPlayer.paused) {

        audioPlayer.play()
            .then(function () {

                updatePlayButtons(true);

            })
            .catch(function (error) {

                console.error(error);

            });

    } else {

        audioPlayer.pause();

        updatePlayButtons(false);
    }
}


/* =========================================================
   UPDATE PLAY BUTTONS
========================================================= */

function updatePlayButtons(isPlaying) {

    const icon =
        isPlaying ? "❚❚" : "▶";


    if (fullPlayButton) {

        fullPlayButton.textContent =
            icon;
    }


    if (playButton) {

        playButton.textContent =
            icon;
    }
}


/* =========================================================
   PROGRESS BAR
========================================================= */

function changeProgress() {

    if (!audioPlayer) return;

    const duration =
        audioPlayer.duration;


    if (!duration) return;


    const percentage =
        Number(progressBar.value);


    audioPlayer.currentTime =
        (percentage / 100) * duration;
}


/* =========================================================
   FULL PLAYER PROGRESS
========================================================= */

function changeProgressFull() {

    if (!audioPlayer) return;

    const duration =
        audioPlayer.duration;


    if (!duration) return;


    const percentage =
        Number(fullProgressBar.value);


    audioPlayer.currentTime =
        (percentage / 100) * duration;
}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

    if (!audioPlayer) return;


    audioPlayer.muted =
        !audioPlayer.muted;
}


/* =========================================================
   SLEEP TIMER
========================================================= */

let sleepTimerTimeout = null;


function setSleepTimer() {

    const select =
        document.getElementById(
            "sleepTimer"
        );


    if (!select) return;


    const minutes =
        Number(select.value);


    /*
       Cancel existing timer
    */

    if (sleepTimerTimeout) {

        clearTimeout(
            sleepTimerTimeout
        );

        sleepTimerTimeout = null;
    }


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


    console.log(
        `Sleep timer set for ${minutes} minutes`
    );
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


    playStory(
        currentCategoryStories[
            currentStoryIndex
        ]
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


    playStory(
        currentCategoryStories[
            currentStoryIndex
        ]
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


    if (!searchBox) return;


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


/*
   Works with:
   searchStories()
   and
   searchStories("text")
*/

function searchStories(query) {

    if (
        typeof query !== "string"
    ) {

        const input =
            document.getElementById(
                "searchInput"
            );

        query =
            input ?
            input.value :
            "";
    }


    query =
        query
            .trim()
            .toLowerCase();


    if (!query) return;


    /*
       Search categories
    */

    const category =
        Object.keys(
            storyCategories
        ).find(function (name) {

            return name
                .toLowerCase()
                .includes(query);

        });


    if (category) {

        openCategory(category);

        return;
    }


    /*
       Search stories
    */

    for (
        const categoryName
        of Object.keys(storyCategories)
    ) {

        const list =
            storyCategories[
                categoryName
            ];


        const index =
            list.findIndex(function (story) {

                return (
                    story.title
                        .toLowerCase()
                        .includes(query)
                );

            });


        if (index !== -1) {

            openCategory(
                categoryName
            );

            return;
        }
    }


    console.log(
        "No story found for:",
        query
    );
}


/* =========================================================
   OPEN CATEGORY
========================================================= */

function openCategory(category) {

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


    if (!modal || !title || !library) {

        return;
    }


    title.textContent =
        category;


    library.innerHTML = "";


    const categoryStories =
        storyCategories[
            category
        ] || [];


    currentCategoryStories =
        categoryStories;


    currentStoryIndex = 0;


    if (
        categoryStories.length === 0
    ) {

        library.innerHTML = `
            <div class="story-library-item">
                <div class="story-library-info">
                    <h3>No stories yet</h3>
                    <p>Stories will be added here soon.</p>
                </div>
            </div>
        `;

    } else {

        categoryStories.forEach(
            function (story, index) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "story-library-item";


                let image = "🎧";


                if (
                    category ===
                    "Horror Stories"
                ) {

                    image = "👻";

                } else if (
                    category ===
                    "Love Stories"
                ) {

                    image = "❤️";

                } else if (
                    category ===
                    "Mystery & Thriller"
                ) {

                    image = "🔍";

                } else if (
                    category ===
                    "Crime Stories"
                ) {

                    image = "🕵️";

                } else if (
                    category ===
                    "Bedtime Stories"
                ) {

                    image = "🌙";
                }


                item.innerHTML = `

                    <div class="story-library-image">

                        <div
                            style="
                                width:100%;
                                height:100%;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                font-size:42px;
                                background:linear-gradient(
                                    135deg,
                                    #111,
                                    #252525
                                );
                            "
                        >
                            ${image}
                        </div>

                    </div>


                    <div class="story-library-info">

                        <h3>
                            ${escapeHTML(
                                story.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                story.description ||
                                "Audio story"
                            )}
                        </p>

                        <div class="story-meta">

                            <span>
                                ${
                                    story.type ===
                                    "youtube"
                                    ? "▶ YouTube"
                                    : "🎧 Audio"
                                }
                            </span>

                        </div>

                    </div>


                    <button
                        class="story-library-play"
                        onclick="
                            playCategoryStory(
                                '${escapeAttribute(category)}',
                                ${index}
                            )
                        "
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
   PLAY CATEGORY STORY
========================================================= */

function playCategoryStory(
    category,
    index
) {

    const list =
        storyCategories[
            category
        ];


    if (!list || !list[index]) {

        return;
    }


    currentCategoryStories =
        list;


    currentStoryIndex =
        index;


    playStory(
        list[index]
    );


    closeCategory();


    /*
       Open full player
    */

    openFullPlayer();
}


/* =========================================================
   CLOSE CATEGORY
========================================================= */

function closeCategory() {

    const modal =
        document.getElementById(
            "categoryModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   JAM
========================================================= */

let roomCode = null;
let isHost = false;


/* =========================================================
   OPEN JAM CHOICE
========================================================= */

function openJamChoice() {

    const modal =
        document.getElementById(
            "jamChoiceModal"
        );


    if (modal) {

        modal.style.display =
            "flex";
    }
}


/* =========================================================
   CLOSE JAM CHOICE
========================================================= */

function closeJamChoice() {

    const modal =
        document.getElementById(
            "jamChoiceModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
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


    socket.emit(
        "create-room",
        function (response) {

            if (!response) {

                alert(
                    "Could not create room."
                );

                return;
            }


            if (
                response.success === false
            ) {

                alert(
                    response.message ||
                    "Could not create room."
                );

                return;
            }


            roomCode =
                response.roomCode ||
                response.code;


            isHost = true;


            showRoomModal(
                true
            );


            updateRoomInfo();

        }
    );
}


/* =========================================================
   SHOW ROOM MODAL
========================================================= */

function showRoomModal(isCreating) {

    const modal =
        document.getElementById(
            "roomModal"
        );

    const title =
        document.getElementById(
            "modalTitle"
        );

    const text =
        document.getElementById(
            "modalText"
        );

    const code =
        document.getElementById(
            "roomCode"
        );

    const input =
        document.getElementById(
            "joinCode"
        );

    const action =
        document.getElementById(
            "modalAction"
        );


    if (!modal) return;


    if (isCreating) {

        if (title) {

            title.textContent =
                "Your Jam Room";
        }


        if (text) {

            text.textContent =
                "Share this code with your friend.";
        }


        if (code) {

            code.textContent =
                roomCode ||
                "------";
        }


        if (input) {

            input.style.display =
                "none";
        }


        if (action) {

            action.textContent =
                "Close";

            action.onclick =
                closeModal;
        }

    } else {

        if (title) {

            title.textContent =
                "Join a Jam";
        }


        if (text) {

            text.textContent =
                "Enter your friend's 6-character room code.";
        }


        if (code) {

            code.textContent =
                "------";
        }


        if (input) {

            input.style.display =
                "block";

            input.value = "";

            input.focus();
        }


        if (action) {

            action.textContent =
                "Join Room";

            action.onclick =
                joinRoom;
        }
    }


    modal.style.display =
        "flex";
}


/* =========================================================
   JOIN ROOM
========================================================= */

function joinRoom() {

    /*
       If modal is not open,
       open Join modal
    */

    const modal =
        document.getElementById(
            "roomModal"
        );


    if (
        !modal ||
        modal.style.display !==
        "flex"
    ) {

        showRoomModal(false);

        return;
    }


    const input =
        document.getElementById(
            "joinCode"
        );


    if (!input) return;


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


    socket.emit(
        "join-room",
        {
            roomCode: code
        },
        function (response) {

            if (
                response &&
                response.success === false
            ) {

                alert(
                    response.message ||
                    "Could not join room."
                );

                return;
            }


            roomCode =
                code;


            isHost = false;


            showRoomModal(
                true
            );


            updateRoomInfo();

        }
    );
}


/* =========================================================
   CLOSE ROOM MODAL
========================================================= */

function closeModal() {

    const modal =
        document.getElementById(
            "roomModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   ROOM INFO
========================================================= */

function updateRoomInfo() {

    const info =
        document.getElementById(
            "fullPlayerRoomInfo"
        );


    if (!info) return;


    if (roomCode) {

        info.textContent =
            `Jam: ${roomCode}`;

    } else {

        info.textContent =
            "";
    }
}


/* =========================================================
   JAM SYNC
========================================================= */

function syncJamPlay() {

    if (
        !socket ||
        !roomCode
    ) {

        return;
    }


    let currentTime = 0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            youtubePlayer.getCurrentTime();

    } else if (audioPlayer) {

        currentTime =
            audioPlayer.currentTime;
    }


    socket.emit(
        "play",
        {
            roomCode:
                roomCode,

            currentTime:
                currentTime
        }
    );
}


/* =========================================================
   JAM PAUSE
========================================================= */

function syncJamPause() {

    if (
        !socket ||
        !roomCode
    ) {

        return;
    }


    let currentTime = 0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            youtubePlayer.getCurrentTime();

    } else if (audioPlayer) {

        currentTime =
            audioPlayer.currentTime;
    }


    socket.emit(
        "pause",
        {
            roomCode:
                roomCode,

            currentTime:
                currentTime
        }
    );
}


/* =========================================================
   JAM SEEK
========================================================= */

function syncJamSeek() {

    if (
        !socket ||
        !roomCode
    ) {

        return;
    }


    let currentTime = 0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            youtubePlayer.getCurrentTime();

    } else if (audioPlayer) {

        currentTime =
            audioPlayer.currentTime;
    }


    socket.emit(
        "seek",
        {
            roomCode:
                roomCode,

            currentTime:
                currentTime
        }
    );
}


/* =========================================================
   SOCKET EVENTS
========================================================= */

function setupSocketEvents() {

    if (!socket) return;


    /*
       Connected
    */

    socket.on(
        "connect",
        function () {

            console.log(
                "Connected to SleepStory backend:",
                socket.id
            );

        }
    );


    /*
       Room created
    */

    socket.on(
        "room-created",
        function (data) {

            if (!data) return;

            roomCode =
                data.roomCode ||
                data.code ||
                roomCode;

            isHost = true;

            updateRoomInfo();

        }
    );


    /*
       Room joined
    */

    socket.on(
        "room-joined",
        function (data) {

            if (!data) return;

            roomCode =
                data.roomCode ||
                roomCode;

            isHost = false;

            updateRoomInfo();

        }
    );


    /*
       Play from host
    */

    socket.on(
        "play",
        function (data) {

            if (!data) return;


            /*
               Don't replay our own event
               when already playing
            */

            const time =
                Number(
                    data.currentTime ||
                    0
                );


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

                } catch (error) {

                    console.log(error);
                }


            } else if (audioPlayer) {

                audioPlayer.currentTime =
                    time;

                audioPlayer.play()
                    .catch(function () {});

            }


            updatePlayButtons(true);
        }
    );


    /*
       Pause
    */

    socket.on(
        "pause",
        function (data) {

            if (!data) return;


            const time =
                Number(
                    data.currentTime ||
                    0
                );


            if (
                youtubeStoryActive &&
                youtubePlayer &&
                youtubeReady
            ) {

                youtubePlayer.seekTo(
                    time,
                    true
                );

                youtubePlayer.pauseVideo();


            } else if (audioPlayer) {

                audioPlayer.currentTime =
                    time;

                audioPlayer.pause();
            }


            updatePlayButtons(false);
        }
    );


    /*
       Seek
    */

    socket.on(
        "seek",
        function (data) {

            if (!data) return;


            const time =
                Number(
                    data.currentTime ||
                    0
                );


            if (
                youtubeStoryActive &&
                youtubePlayer &&
                youtubeReady
            ) {

                youtubePlayer.seekTo(
                    time,
                    true
                );


            } else if (audioPlayer) {

                audioPlayer.currentTime =
                    time;
            }
        }
    );


    /*
       User count
    */

    socket.on(
        "user-count",
        function (count) {

            updateUserCount(
                count
            );
        }
    );


    socket.on(
        "room-users",
        function (count) {

            updateUserCount(
                count
            );
        }
    );


    /*
       Reaction
    */

    socket.on(
        "reaction",
        function (data) {

            if (!data) return;

            showReaction(
                data.emoji ||
                data
            );
        }
    );


    /*
       Chat
    */

    socket.on(
        "chat-message",
        function (data) {

            if (!data) return;


            addChatMessage(
                data.message ||
                data.text ||
                "",
                data.username ||
                "Listener"
            );
        }
    );


    socket.on(
        "disconnect",
        function () {

            console.log(
                "Disconnected from backend"
            );
        }
    );
}


/* =========================================================
   USER COUNT
========================================================= */

function updateUserCount(count) {

    const element =
        document.getElementById(
            "userCount"
        );


    if (!element) return;


    const number =
        Number(count) || 1;


    element.textContent =
        `👥 ${number} ${
            number === 1
            ? "listener"
            : "listeners"
        }`;
}


/* =========================================================
   REACTIONS
========================================================= */

function sendReaction(emoji) {

    if (!emoji) return;


    /*
       Local visual
    */

    showReaction(emoji);


    /*
       Send to room
    */

    if (
        socket &&
        roomCode
    ) {

        socket.emit(
            "reaction",
            {
                roomCode:
                    roomCode,

                emoji:
                    emoji
            }
        );
    }
}


/* =========================================================
   SHOW REACTION
========================================================= */

function showReaction(emoji) {

    const container =
        document.getElementById(
            "reactionContainer"
        );


    if (!container) return;


    const reaction =
        document.createElement(
            "div"
        );


    reaction.className =
        "floating-reaction";


    reaction.textContent =
        emoji;


    reaction.style.position =
        "fixed";

    reaction.style.left =
        Math.floor(
            Math.random() * 80 + 10
        ) + "%";

    reaction.style.bottom =
        "100px";

    reaction.style.fontSize =
        "30px";

    reaction.style.zIndex =
        "9999";

    reaction.style.pointerEvents =
        "none";


    container.appendChild(
        reaction
    );


    setTimeout(
        function () {

            reaction.style.transition =
                "all 2s ease";

            reaction.style.transform =
                "translateY(-250px)";

            reaction.style.opacity =
                "0";

        },
        50
    );


    setTimeout(
        function () {

            reaction.remove();

        },
        2100
    );
}


/* =========================================================
   CHAT
========================================================= */

function sendChatMessage() {

    const input =
        document.getElementById(
            "chatInput"
        );


    if (!input) return;


    const message =
        input.value.trim();


    if (!message) return;


    /*
       If connected to room
    */

    if (
        socket &&
        roomCode
    ) {

        socket.emit(
            "chat-message",
            {
                roomCode:
                    roomCode,

                message:
                    message
            }
        );

    } else {

        /*
           Local preview
        */

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


    if (!container) return;


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-message";


    item.innerHTML = `

        <strong>
            ${escapeHTML(
                username
            )}
        </strong>

        <span>
            ${escapeHTML(
                message
            )}
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

function showTab(tab) {

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

    const reactionButton =
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

            chatButton.classList.add(
                "active"
            );
        }


        if (reactionButton) {

            reactionButton.classList.remove(
                "active"
            );
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

            chatButton.classList.remove(
                "active"
            );
        }


        if (reactionButton) {

            reactionButton.classList.add(
                "active"
            );
        }
    }
}


/* =========================================================
   FULL PLAYER
========================================================= */

function openFullPlayer() {

    if (fullPlayer) {

        fullPlayer.classList.add(
            "active"
        );

        fullPlayer.style.display =
            "flex";
    }
}


function closeFullPlayer() {

    if (fullPlayer) {

        fullPlayer.classList.remove(
            "active"
        );

        fullPlayer.style.display =
            "none";
    }
}


/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
========================================================= */

window.addEventListener(
    "click",
    function (event) {

        const categoryModal =
            document.getElementById(
                "categoryModal"
            );

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
            categoryModal
        ) {

            closeCategory();
        }


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

            closeModal();
        }

    }
);


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value || "")
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
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return String(value || "")
        .replace(
            /'/g,
            "\\'"
        );
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        /*
           Space = play/pause
        */

        if (
            event.code ===
            "Space"
        ) {

            const tag =
                document.activeElement
                    ?.tagName
                    ?.toLowerCase();


            if (
                tag === "input" ||
                tag === "textarea" ||
                tag === "select"
            ) {

                return;
            }


            event.preventDefault();

            togglePlay();
        }


        /*
           Escape = close modals
        */

        if (
            event.key ===
            "Escape"
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
    "🌙 SleepStory script loaded successfully."
);