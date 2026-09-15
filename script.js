/* =========================================================
   SLEEPSTORY — COMPLETE SCRIPT
   Jam + Local Audio + YouTube
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

            transports: [
                "websocket",
                "polling"
            ],

            reconnection: true,

            reconnectionAttempts: Infinity,

            reconnectionDelay: 1000

        });

    }

} catch (error) {

    console.error(
        "Socket connection error:",
        error
    );

}


/* =========================================================
   AUDIO ELEMENTS
========================================================= */

const audioPlayer =
    document.getElementById(
        "audioPlayer"
    );

const playerTitle =
    document.getElementById(
        "playerTitle"
    );

const currentTimeElement =
    document.getElementById(
        "currentTime"
    );

const durationElement =
    document.getElementById(
        "duration"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const fullCurrentTime =
    document.getElementById(
        "fullCurrentTime"
    );

const fullDuration =
    document.getElementById(
        "fullDuration"
    );

const fullProgressBar =
    document.getElementById(
        "fullProgressBar"
    );

const fullPlayerTitle =
    document.getElementById(
        "fullPlayerTitle"
    );

const fullPlayer =
    document.getElementById(
        "fullPlayer"
    );

const fullPlayButton =
    document.getElementById(
        "fullPlayButton"
    );

const playButton =
    document.getElementById(
        "playButton"
    );


/* =========================================================
   YOUTUBE
========================================================= */

let youtubePlayer = null;

let youtubeReady = false;

let youtubeStoryActive = false;


/* =========================================================
   JAM
========================================================= */

let roomCode = null;

let isHost = false;

let jamSyncing = false;

let suppressJamEvents = false;


/* =========================================================
   YOUTUBE API READY
========================================================= */

window.onYouTubeIframeAPIReady =
function () {

    const element =
        document.getElementById(
            "youtubePlayer"
        );


    if (!element) {

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

                    onReady: function () {

                        youtubeReady =
                            true;


                        console.log(
                            "🎬 YouTube Player Ready"
                        );


                        const container =
                            document.getElementById(
                                "youtubePlayerContainer"
                            );


                        if (container) {

                            container.style.display =
                                "none";

                        }

                    },


                    onStateChange:
                    function (event) {

                        if (
                            !youtubeStoryActive
                        ) {

                            return;

                        }


                        /*
                           Ignore events caused
                           by remote Jam sync.
                        */

                        if (
                            suppressJamEvents
                        ) {

                            return;

                        }


                        if (
                            event.data ===
                            YT.PlayerState.PLAYING
                        ) {

                            updatePlayButtons(
                                true
                            );


                            syncJamPlay();

                        }


                        if (
                            event.data ===
                            YT.PlayerState.PAUSED
                        ) {

                            updatePlayButtons(
                                false
                            );


                            syncJamPause();

                        }


                        if (
                            event.data ===
                            YT.PlayerState.ENDED
                        ) {

                            updatePlayButtons(
                                false
                            );

                        }

                    }

                }

            }
        );

};


/* =========================================================
   STORIES
========================================================= */

const stories = [

    {

        title:
            "SleepStory",

        category:
            "Bedtime Stories",

        type:
            "local",

        src:
            "AUDIO/the-last-star.mp3"

    }

];


/* =========================================================
   CATEGORY LIBRARY
========================================================= */

const storyCategories = {

    "Sunday Suspense": [

        {

            title:
                "Sunday Suspense",

            description:
                "Bengali suspense and thriller stories",

            type:
                "youtube",

            videoId:
                "AWQ-7O4jFIk"

        },

        {

            title:
                "Sunday Suspense Story",

            description:
                "Mystery and suspense audio",

            type:
                "youtube",

            videoId:
                "w9W-LbYbeNs"

        }

    ],


    "Mirchi Bangla": [

        {

            title:
                "Mirchi Bangla",

            description:
                "Bengali audio storytelling",

            type:
                "youtube",

            videoId:
                "Ut5pYfY1YnY"

        },

        {

            title:
                "Mirchi Bangla Story",

            description:
                "Popular Bengali story",

            type:
                "youtube",

            videoId:
                "AWQ-7O4jFIk"

        }

    ],


    "Love Stories": [

        {

            title:
                "Love Stories",

            description:
                "Romantic Bengali stories",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "Horror Stories": [

        {

            title:
                "Horror Stories",

            description:
                "Ghost and paranormal stories",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "Mystery & Thriller": [

        {

            title:
                "Mystery & Thriller",

            description:
                "Mystery and investigation",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "Crime Stories": [

        {

            title:
                "Crime Stories",

            description:
                "Crime and detective stories",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "Emotional Stories": [

        {

            title:
                "Emotional Stories",

            description:
                "Emotional and life stories",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "Bedtime Stories": [

        {

            title:
                "SleepStory",

            description:
                "Calm and relaxing bedtime audio",

            type:
                "local",

            src:
                "AUDIO/the-last-star.mp3"

        }

    ],


    "Bengali Stories": [

        {

            title:
                "Bengali Stories",

            description:
                "Bengali audio stories",

            type:
                "youtube",

            videoId:
                ""

        }

    ],


    "English Stories": [

        {

            title:
                "English Stories",

            description:
                "English audio stories",

            type:
                "youtube",

            videoId:
                ""

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

document.addEventListener(
    "DOMContentLoaded",
    function () {

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

                    if (
                        suppressJamEvents
                    ) {

                        return;

                    }


                    youtubeStoryActive =
                        false;


                    updatePlayButtons(
                        true
                    );


                    syncJamPlay();

                }
            );


            audioPlayer.addEventListener(
                "pause",
                function () {

                    if (
                        suppressJamEvents
                    ) {

                        return;

                    }


                    if (
                        !audioPlayer.ended
                    ) {

                        updatePlayButtons(
                            false
                        );


                        syncJamPause();

                    }

                }
            );


            audioPlayer.addEventListener(
                "ended",
                function () {

                    updatePlayButtons(
                        false
                    );

                }
            );

        }


        const youtubeContainer =
            document.getElementById(
                "youtubePlayerContainer"
            );


        if (youtubeContainer) {

            youtubeContainer.style.display =
                "none";

        }


        const chatInput =
            document.getElementById(
                "chatInput"
            );


        if (chatInput) {

            chatInput.addEventListener(
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


        setupSocketEvents();

    }
);


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {

    if (
        !Number.isFinite(
            Number(seconds)
        ) ||
        Number(seconds) < 0
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(
            Number(seconds) / 60
        );


    const secs =
        Math.floor(
            Number(seconds) % 60
        );


    return (
        minutes +
        ":" +
        String(secs).padStart(
            2,
            "0"
        )
    );

}


/* =========================================================
   UPDATE DURATION
========================================================= */

function updateDuration() {

    if (!audioPlayer) {

        return;

    }


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

    if (!audioPlayer) {

        return;

    }


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
        duration > 0
    ) {

        progressBar.value =
            (
                current /
                duration
            ) * 100;

    }


    if (
        fullProgressBar &&
        duration > 0
    ) {

        fullProgressBar.value =
            (
                current /
                duration
            ) * 100;

    }

}


/* =========================================================
   PLAY LOCAL STORY
========================================================= */

function playLocalStory(story) {

    if (
        !audioPlayer ||
        !story
    ) {

        return;

    }


    youtubeStoryActive =
        false;


    const youtubeContainer =
        document.getElementById(
            "youtubePlayerContainer"
        );


    if (youtubeContainer) {

        youtubeContainer.style.display =
            "none";

    }


    if (
        youtubePlayer &&
        youtubeReady
    ) {

        try {

            suppressJamEvents = true;

            youtubePlayer.stopVideo();

        } catch (error) {

            console.log(error);

        } finally {

            setTimeout(
                function () {

                    suppressJamEvents =
                        false;

                },
                300
            );

        }

    }


    currentStory =
        story;


    updateStoryInfo(
        story
    );


    suppressJamEvents =
        true;


    audioPlayer.src =
        story.src;


    audioPlayer.load();


    audioPlayer.currentTime =
        0;


    audioPlayer.play()
        .then(
            function () {

                suppressJamEvents =
                    false;


                updatePlayButtons(
                    true
                );


                syncStoryToJam();

            }
        )
        .catch(
            function (error) {

                suppressJamEvents =
                    false;

                console.log(
                    "Autoplay blocked:",
                    error
                );

            }
        );

}


/* =========================================================
   PLAY YOUTUBE STORY
========================================================= */

function playYouTubeStory(story) {

    if (!story) {

        return;

    }


    if (!story.videoId) {

        alert(
            "এই category-তে এখনও কোনো YouTube story যোগ করা হয়নি।"
        );

        return;

    }


    if (
        !youtubePlayer ||
        !youtubeReady
    ) {

        alert(
            "YouTube player is still loading. Please try again."
        );

        return;

    }


    if (audioPlayer) {

        suppressJamEvents =
            true;

        audioPlayer.pause();

        suppressJamEvents =
            false;

    }


    youtubeStoryActive =
        true;


    currentStory =
        story;


    updateStoryInfo(
        story
    );


    const youtubeContainer =
        document.getElementById(
            "youtubePlayerContainer"
        );


    if (youtubeContainer) {

        youtubeContainer.style.display =
            "block";

    }


    suppressJamEvents =
        true;


    youtubePlayer.loadVideoById(
        story.videoId
    );


    setTimeout(
        function () {

            suppressJamEvents =
                false;

        },
        1000
    );


    if (youtubeContainer) {

        youtubeContainer.scrollIntoView({

            behavior:
                "smooth",

            block:
                "center"

        });

    }


    syncStoryToJam();

}


/* =========================================================
   PLAY STORY
========================================================= */

function playStory(story) {

    if (!story) {

        return;

    }


    if (
        story.type ===
        "youtube"
    ) {

        playYouTubeStory(
            story
        );

    } else {

        playLocalStory(
            story
        );

    }

}


/* =========================================================
   UPDATE STORY INFO
========================================================= */

function updateStoryInfo(story) {

    if (!story) {

        return;

    }


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

    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        const state =
            youtubePlayer.getPlayerState();


        suppressJamEvents =
            false;


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

                    console.error(
                        error
                    );

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
    isPlaying
) {

    const icon =
        isPlaying
            ? "❚❚"
            : "▶";


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
   LOCAL PROGRESS
========================================================= */

function changeProgress() {

    if (!audioPlayer) {

        return;

    }


    const duration =
        audioPlayer.duration;


    if (!duration) {

        return;

    }


    const percentage =
        Number(
            progressBar.value
        );


    const time =
        (
            percentage /
            100
        ) * duration;


    audioPlayer.currentTime =
        time;


    syncJamSeek();

}


/* =========================================================
   FULL PROGRESS
========================================================= */

function changeProgressFull() {

    if (!audioPlayer) {

        return;

    }


    const duration =
        audioPlayer.duration;


    if (!duration) {

        return;

    }


    const percentage =
        Number(
            fullProgressBar.value
        );


    const time =
        (
            percentage /
            100
        ) * duration;


    audioPlayer.currentTime =
        time;


    syncJamSeek();

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


    if (!select) {

        return;

    }


    const minutes =
        Number(
            select.value
        );


    if (sleepTimerTimeout) {

        clearTimeout(
            sleepTimerTimeout
        );

        sleepTimerTimeout =
            null;

    }


    if (minutes === 0) {

        return;

    }


    sleepTimerTimeout =
        setTimeout(
            function () {

                suppressJamEvents =
                    false;


                if (
                    youtubeStoryActive &&
                    youtubePlayer &&
                    youtubeReady
                ) {

                    youtubePlayer.pauseVideo();

                } else if (audioPlayer) {

                    audioPlayer.pause();

                }


                select.value =
                    "0";


                alert(
                    "🌙 Sleep timer finished."
                );

            },
            minutes *
            60 *
            1000
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


    if (
        currentStoryIndex < 0
    ) {

        currentStoryIndex =
            currentCategoryStories.length -
            1;

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

        currentStoryIndex =
            0;

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


function searchStories(query) {

    if (
        typeof query !==
        "string"
    ) {

        const input =
            document.getElementById(
                "searchInput"
            );


        query =
            input
                ? input.value
                : "";

    }


    query =
        query
            .trim()
            .toLowerCase();


    if (!query) {

        return;

    }


    const category =
        Object.keys(
            storyCategories
        ).find(
            function (name) {

                return name
                    .toLowerCase()
                    .includes(
                        query
                    );

            }
        );


    if (category) {

        openCategory(
            category
        );

        return;

    }


    for (
        const categoryName
        of Object.keys(
            storyCategories
        )
    ) {

        const list =
            storyCategories[
                categoryName
            ];


        const index =
            list.findIndex(
                function (story) {

                    return story.title
                        .toLowerCase()
                        .includes(
                            query
                        );

                }
            );


        if (index !== -1) {

            openCategory(
                categoryName
            );

            return;

        }

    }


    console.log(
        "No story found:",
        query
    );

}


/* =========================================================
   CATEGORY MODAL
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


    if (
        !modal ||
        !title ||
        !library
    ) {

        return;

    }


    title.textContent =
        category;


    library.innerHTML =
        "";


    const categoryStories =
        storyCategories[
            category
        ] || [];


    currentCategoryStories =
        categoryStories;


    currentStoryIndex =
        0;


    if (
        categoryStories.length ===
        0
    ) {

        library.innerHTML = `

            <div class="story-library-item">

                <div class="story-library-info">

                    <h3>No stories yet</h3>

                    <p>
                        Stories will be added here soon.
                    </p>

                </div>

            </div>

        `;

    } else {

        categoryStories.forEach(
            function (
                story,
                index
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "story-library-item";


                let image =
                    "🎧";


                if (
                    category ===
                    "Horror Stories"
                ) {

                    image =
                        "👻";

                } else if (
                    category ===
                    "Love Stories"
                ) {

                    image =
                        "❤️";

                } else if (
                    category ===
                    "Mystery & Thriller"
                ) {

                    image =
                        "🔍";

                } else if (
                    category ===
                    "Crime Stories"
                ) {

                    image =
                        "🕵️";

                } else if (
                    category ===
                    "Bedtime Stories"
                ) {

                    image =
                        "🌙";

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
                                '${escapeAttribute(
                                    category
                                )}',
                                ${index}
                            )
                        "
                    >
                        ▶
                    </button>

                `;


                library.appendChild(
                    item
                );

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


    if (
        !list ||
        !list[index]
    ) {

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
   JAM — OPEN CHOICE
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
   JAM — CREATE ROOM
========================================================= */

function createRoom() {

    if (!socket) {

        alert(
            "Backend connection unavailable."
        );

        return;

    }


    if (
        !socket.connected
    ) {

        alert(
            "Connecting to SleepStory server. Please try again in a moment."
        );

        return;

    }


    socket.emit(
        "create-room",
        function (response) {

            console.log(
                "Create room response:",
                response
            );


            if (
                !response
            ) {

                alert(
                    "Server did not return a room code."
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
                (
                    response.roomCode ||
                    response.code ||
                    ""
                )
                    .toUpperCase();


            if (
                roomCode.length !==
                6
            ) {

                alert(
                    "Invalid room code received from server."
                );

                return;

            }


            isHost =
                true;


            console.log(
                "🌙 Created Jam:",
                roomCode
            );


            showRoomModal(
                true
            );


            updateRoomInfo();

        }
    );

}


/* =========================================================
   JAM — SHOW ROOM MODAL
========================================================= */

function showRoomModal(
    isCreating
) {

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


    if (!modal) {

        return;

    }


    if (isCreating) {

        if (title) {

            title.textContent =
                "Your Jam Room";

        }


        if (text) {

            text.textContent =
                "Share this 6-character code with your friend.";

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
                function () {

                    closeModal();

                };

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

            input.value =
                "";

        }


        if (action) {

            action.textContent =
                "Join Room";


            action.onclick =
                function () {

                    joinRoom();

                };

        }

    }


    modal.style.display =
        "flex";


    if (
        !isCreating &&
        input
    ) {

        setTimeout(
            function () {

                input.focus();

            },
            100
        );

    }

}


/* =========================================================
   JAM — JOIN ROOM
========================================================= */

function joinRoom() {

    const modal =
        document.getElementById(
            "roomModal"
        );


    if (
        !modal ||
        modal.style.display !==
        "flex"
    ) {

        showRoomModal(
            false
        );

        return;

    }


    const input =
        document.getElementById(
            "joinCode"
        );


    if (!input) {

        return;

    }


    const code =
        input.value
            .trim()
            .toUpperCase();


    if (
        code.length !==
        6
    ) {

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


    if (
        !socket.connected
    ) {

        alert(
            "Connecting to SleepStory server. Please wait a moment."
        );

        return;

    }


    socket.emit(
        "join-room",
        {
            roomCode:
                code
        },
        function (response) {

            console.log(
                "Join room response:",
                response
            );


            if (
                !response
            ) {

                alert(
                    "Server did not respond."
                );

                return;

            }


            if (
                response.success ===
                false
            ) {

                alert(
                    response.message ||
                    "Could not join room."
                );

                return;

            }


            roomCode =
                (
                    response.roomCode ||
                    code
                )
                    .toUpperCase();


            isHost =
                false;


            updateRoomInfo();


            /*
               Room state will also arrive
               through room-joined event.
            */

            applyJamRoomState(
                response
            );


            showRoomModal(
                true
            );

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


    if (!info) {

        return;

    }


    if (roomCode) {

        info.textContent =
            `Jam: ${roomCode}`;

    } else {

        info.textContent =
            "";

    }

}


/* =========================================================
   SEND STORY TO JAM
========================================================= */

function syncStoryToJam() {

    if (
        !socket ||
        !roomCode ||
        !currentStory
    ) {

        return;

    }


    socket.emit(
        "story-change",
        {

            story: {

                title:
                    currentStory.title,

                type:
                    currentStory.type,

                src:
                    currentStory.src ||
                    null,

                videoId:
                    currentStory.videoId ||
                    null

            }

        }
    );

}


/* =========================================================
   JAM PLAY
========================================================= */

function syncJamPlay() {

    if (
        suppressJamEvents
    ) {

        return;

    }


    if (
        !socket ||
        !roomCode
    ) {

        return;

    }


    let currentTime =
        0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            Number(
                youtubePlayer.getCurrentTime()
            ) || 0;

    } else if (
        audioPlayer
    ) {

        currentTime =
            Number(
                audioPlayer.currentTime
            ) || 0;

    }


    socket.emit(
        "play",
        {

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
        suppressJamEvents
    ) {

        return;

    }


    if (
        !socket ||
        !roomCode
    ) {

        return;

    }


    let currentTime =
        0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            Number(
                youtubePlayer.getCurrentTime()
            ) || 0;

    } else if (
        audioPlayer
    ) {

        currentTime =
            Number(
                audioPlayer.currentTime
            ) || 0;

    }


    socket.emit(
        "pause",
        {

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
        suppressJamEvents
    ) {

        return;

    }


    if (
        !socket ||
        !roomCode
    ) {

        return;

    }


    let currentTime =
        0;


    if (
        youtubeStoryActive &&
        youtubePlayer &&
        youtubeReady
    ) {

        currentTime =
            Number(
                youtubePlayer.getCurrentTime()
            ) || 0;

    } else if (
        audioPlayer
    ) {

        currentTime =
            Number(
                audioPlayer.currentTime
            ) || 0;

    }


    socket.emit(
        "seek",
        {

            currentTime:
                currentTime

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


    /* -----------------------------------------------------
       CONNECT
    ----------------------------------------------------- */

    socket.on(
        "connect",
        function () {

            console.log(
                "🟢 Connected to SleepStory:",
                socket.id
            );

        }
    );


    /* -----------------------------------------------------
       CONNECT ERROR
    ----------------------------------------------------- */

    socket.on(
        "connect_error",
        function (error) {

            console.error(
                "🔴 Socket connection error:",
                error.message
            );

        }
    );


    /* -----------------------------------------------------
       ROOM CREATED
    ----------------------------------------------------- */

    socket.on(
        "room-created",
        function (data) {

            if (!data) {

                return;

            }


            roomCode =
                (
                    data.roomCode ||
                    data.code ||
                    roomCode
                )
                    .toUpperCase();


            isHost =
                true;


            updateRoomInfo();

        }
    );


    /* -----------------------------------------------------
       ROOM JOINED
    ----------------------------------------------------- */

    socket.on(
        "room-joined",
        function (data) {

            if (!data) {

                return;

            }


            roomCode =
                (
                    data.roomCode ||
                    roomCode
                )
                    .toUpperCase();


            isHost =
                false;


            updateRoomInfo();


            applyJamRoomState(
                data
            );

        }
    );


    /* -----------------------------------------------------
       ROOM ERROR
    ----------------------------------------------------- */

    socket.on(
        "room-error",
        function (message) {

            alert(
                message ||
                "Room error."
            );

        }
    );


    /* -----------------------------------------------------
       SYNC PLAY
    ----------------------------------------------------- */

    socket.on(
        "sync-play",
        function (data) {

            if (!data) {

                return;

            }


            const time =
                Number(
                    data.currentTime
                ) || 0;


            applyRemotePlay(
                time
            );

        }
    );


    /* -----------------------------------------------------
       SYNC PAUSE
    ----------------------------------------------------- */

    socket.on(
        "sync-pause",
        function (data) {

            if (!data) {

                return;

            }


            const time =
                Number(
                    data.currentTime
                ) || 0;


            applyRemotePause(
                time
            );

        }
    );


    /* -----------------------------------------------------
       SYNC SEEK
    ----------------------------------------------------- */

    socket.on(
        "sync-seek",
        function (data) {

            if (!data) {

                return;

            }


            const time =
                Number(
                    data.currentTime
                ) || 0;


            applyRemoteSeek(
                time
            );

        }
    );


    /* -----------------------------------------------------
       SYNC STORY
    ----------------------------------------------------- */

    socket.on(
        "sync-story",
        function (data) {

            if (!data) {

                return;

            }


            if (
                data.story
            ) {

                applyRemoteStory(
                    data.story,
                    data.currentTime || 0,
                    data.isPlaying || false
                );

            }

        }
    );


    /* -----------------------------------------------------
       USER COUNT
    ----------------------------------------------------- */

    socket.on(
        "user-count",
        function (count) {

            updateUserCount(
                count
            );

        }
    );


    /* -----------------------------------------------------
       REACTION
    ----------------------------------------------------- */

    socket.on(
        "sync-reaction",
        function (data) {

            if (!data) {

                return;

            }


            showReaction(
                data.emoji
            );

        }
    );


    /* -----------------------------------------------------
       CHAT
    ----------------------------------------------------- */

    socket.on(
        "new-chat-message",
        function (data) {

            if (!data) {

                return;

            }


            addChatMessage(
                data.message ||
                "",
                "Listener"
            );

        }
    );


    /* -----------------------------------------------------
       DISCONNECT
    ----------------------------------------------------- */

    socket.on(
        "disconnect",
        function () {

            console.log(
                "🔴 Disconnected from SleepStory server"
            );

        }
    );

}


/* =========================================================
   APPLY ROOM STATE
========================================================= */

function applyJamRoomState(
    data
) {

    if (!data) {

        return;

    }


    /*
       Story
    */

    if (
        data.story
    ) {

        applyRemoteStory(
            data.story,
            Number(
                data.currentTime
            ) || 0,
            Boolean(
                data.isPlaying
            )
        );

        return;

    }


    /*
       No story information
       but playback state exists.
    */

    const time =
        Number(
            data.currentTime
        ) || 0;


    if (
        data.isPlaying
    ) {

        applyRemotePlay(
            time
        );

    } else {

        applyRemotePause(
            time
        );

    }

}


/* =========================================================
   APPLY REMOTE STORY
========================================================= */

function applyRemoteStory(
    story,
    currentTime,
    shouldPlay
) {

    if (!story) {

        return;

    }


    suppressJamEvents =
        true;


    currentStory =
        story;


    updateStoryInfo(
        story
    );


    if (
        story.type ===
        "youtube" &&
        story.videoId
    ) {

        youtubeStoryActive =
            true;


        const youtubeContainer =
            document.getElementById(
                "youtubePlayerContainer"
            );


        if (youtubeContainer) {

            youtubeContainer.style.display =
                "block";

        }


        if (
            youtubePlayer &&
            youtubeReady
        ) {

            youtubePlayer.loadVideoById(
                story.videoId
            );


            setTimeout(
                function () {

                    if (
                        !youtubePlayer ||
                        !youtubeReady
                    ) {

                        suppressJamEvents =
                            false;

                        return;

                    }


                    try {

                        youtubePlayer.seekTo(
                            Number(
                                currentTime
                            ) || 0,
                            true
                        );


                        if (shouldPlay) {

                            youtubePlayer.playVideo();

                        } else {

                            youtubePlayer.pauseVideo();

                        }

                    } catch (
                        error
                    ) {

                        console.error(
                            error
                        );

                    }


                    suppressJamEvents =
                        false;

                },
                700
            );

        } else {

            suppressJamEvents =
                false;

        }


    } else if (
        story.type ===
        "local" &&
        story.src
    ) {

        youtubeStoryActive =
            false;


        const youtubeContainer =
            document.getElementById(
                "youtubePlayerContainer"
            );


        if (youtubeContainer) {

            youtubeContainer.style.display =
                "none";

        }


        if (audioPlayer) {

            audioPlayer.src =
                story.src;


            audioPlayer.load();


            const targetTime =
                Number(
                    currentTime
                ) || 0;


            audioPlayer.addEventListener(
                "loadedmetadata",
                function onLoaded() {

                    audioPlayer.removeEventListener(
                        "loadedmetadata",
                        onLoaded
                    );


                    audioPlayer.currentTime =
                        targetTime;


                    if (shouldPlay) {

                        audioPlayer.play()
                            .catch(
                                function () {}
                            );

                    } else {

                        audioPlayer.pause();

                    }


                    suppressJamEvents =
                        false;

                }
            );

        } else {

            suppressJamEvents =
                false;

        }

    } else {

        suppressJamEvents =
            false;

    }

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

        } catch (
            error
        ) {

            console.error(
                error
            );

        }


        setTimeout(
            function () {

                suppressJamEvents =
                    false;

            },
            500
        );


    } else if (
        audioPlayer
    ) {

        audioPlayer.currentTime =
            time;


        audioPlayer.play()
            .catch(
                function () {}
            );


        setTimeout(
            function () {

                suppressJamEvents =
                    false;

            },
            300
        );

    } else {

        suppressJamEvents =
            false;

    }


    updatePlayButtons(
        true
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

        } catch (
            error
        ) {

            console.error(
                error
            );

        }


    } else if (
        audioPlayer
    ) {

        audioPlayer.currentTime =
            time;


        audioPlayer.pause();

    }


    updatePlayButtons(
        false
    );


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

        } catch (
            error
        ) {

            console.error(
                error
            );

        }

    } else if (
        audioPlayer
    ) {

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
   REACTIONS
========================================================= */

function sendReaction(
    emoji
) {

    if (!emoji) {

        return;

    }


    /*
       Show locally
    */

    showReaction(
        emoji
    );


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

                emoji:
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
        (
            Math.floor(
                Math.random() *
                80 +
                10
            )
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

                message:
                    message

            }
        );

    } else {

        addChatMessage(
            message,
            "You"
        );

    }


    input.value =
        "";

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

    const reactionButton =
        document.getElementById(
            "tabReactionsBtn"
        );


    if (
        tab ===
        "chat"
    ) {

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

    if (!fullPlayer) {

        return;

    }


    fullPlayer.classList.add(
        "active"
    );


    fullPlayer.style.display =
        "flex";

}


function closeFullPlayer() {

    if (!fullPlayer) {

        return;

    }


    fullPlayer.classList.remove(
        "active"
    );


    fullPlayer.style.display =
        "none";

}


/* =========================================================
   CLOSE MODALS
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
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return String(
        value || ""
    )
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