// =====================================================
// CONFIG
// =====================================================

const BACKEND_URL =
    "https://storyteller-backend-us3a.onrender.com";


// =====================================================
// SOCKET
// =====================================================

const socket =
    io(BACKEND_URL);


// =====================================================
// STORIES
// =====================================================

let stories = [];

let currentStoryIndex = 0;

let currentStory = null;


// =====================================================
// AUDIO
// =====================================================

const audio =
    document.getElementById("audioPlayer");

const playButton =
    document.getElementById("playButton");

const playerTitle =
    document.getElementById("playerTitle");

const progressBar =
    document.getElementById("progressBar");

const currentTimeEl =
    document.getElementById("currentTime");

const durationEl =
    document.getElementById("duration");

const fullProgressBar =
    document.getElementById(
        "fullProgressBar"
    );

const fullCurrentTime =
    document.getElementById(
        "fullCurrentTime"
    );

const fullDuration =
    document.getElementById(
        "fullDuration"
    );

const fullPlayButton =
    document.getElementById(
        "fullPlayButton"
    );


// =====================================================
// YOUTUBE
// =====================================================

let youtubePlayer = null;

let youtubeReady = false;

let youtubeChangingFromSync = false;


// =====================================================
// YOUTUBE API READY
// =====================================================

function onYouTubeIframeAPIReady() {

    youtubePlayer =
        new YT.Player(
            "youtubePlayer",
            {

                height: "100%",

                width: "100%",

                videoId: "",

                playerVars: {

                    playsinline: 1,

                    rel: 0

                },

                events: {

                    onReady:
                        function () {

                            youtubeReady =
                                true;

                        },

                    onStateChange:
                        handleYouTubeState

                }

            }
        );

}


// =====================================================
// LOAD STORIES
// =====================================================

async function loadStories() {

    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/stories`
            );


        if (!response.ok) {
            throw new Error(
                "Failed to load stories"
            );
        }


        stories =
            await response.json();


        renderStories();


    } catch (error) {

        console.error(
            "Story loading error:",
            error
        );

    }

}


// =====================================================
// RENDER STORIES
// =====================================================

function renderStories(
    category = "all"
) {

    const container =
        document.getElementById(
            "storiesGrid"
        );


    if (!container) return;


    container.innerHTML = "";


    const filteredStories =
        category === "all"
            ? stories
            : stories.filter(
                story =>
                    story.category ===
                    category
            );


    if (
        filteredStories.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-stories">

                No stories found.

            </div>

        `;

        return;
    }


    filteredStories.forEach(
        (story) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "story-card";


            card.dataset.category =
                story.category;


            card.innerHTML = `

                <div class="story-image">

                    <div class="story-icon">

                        ${
                            getCategoryIcon(
                                story.category
                            )
                        }

                    </div>

                    <div class="play-overlay">
                        ▶
                    </div>

                </div>


                <div class="story-info">

                    <h3>
                        ${escapeHtml(
                            story.title
                        )}
                    </h3>


                    <p>
                        ${escapeHtml(
                            story.category
                        )}
                    </p>


                    <span class="story-type">

                        ${
                            story.type ===
                            "youtube"
                                ? "▶ YouTube"
                                : "🎧 Audio"
                        }

                    </span>

                </div>

            `;


            card.addEventListener(
                "click",
                () => {

                    const realIndex =
                        stories.findIndex(
                            item =>
                                item.id ===
                                story.id
                        );


                    if (
                        realIndex !== -1
                    ) {

                        playStoryByIndex(
                            realIndex
                        );

                    }

                }
            );


            container.appendChild(
                card
            );

        }
    );

}


// =====================================================
// CATEGORY ICON
// =====================================================

function getCategoryIcon(
    category
) {

    switch (category) {

        case "Sunday Suspense":
            return "🕵️";

        case "Mirchi Bangla":
            return "🎙️";

        case "Love Story":
            return "❤️";

        case "Horror Story":
            return "👻";

        default:
            return "📖";

    }

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


// =====================================================
// PLAY STORY BY INDEX
// =====================================================

function playStoryByIndex(
    index,
    notifyJam = true
) {

    if (
        !stories[index]
    ) {
        return;
    }


    currentStoryIndex =
        index;


    currentStory =
        stories[index];


    playerTitle.textContent =
        currentStory.title;


    const fullTitle =
        document.getElementById(
            "fullPlayerTitle"
        );


    if (fullTitle) {

        fullTitle.textContent =
            currentStory.title;

    }


    // ================================================
    // AUDIO STORY
    // ================================================

    if (
        currentStory.type ===
        "audio"
    ) {

        showAudioPlayer();


        audio.pause();


        audio.src =
            currentStory.src;


        audio.load();


        audio.play()
            .then(() => {

                updatePlayButtons(
                    true
                );

            })
            .catch(
                error => {

                    console.error(
                        error
                    );

                }
            );

    }


    // ================================================
    // YOUTUBE STORY
    // ================================================

    else if (
        currentStory.type ===
        "youtube"
    ) {

        showYouTubePlayer();


        if (
            youtubeReady &&
            youtubePlayer
        ) {

            youtubeChangingFromSync =
                true;


            youtubePlayer.loadVideoById(
                currentStory.youtubeId
            );


            setTimeout(
                () => {

                    youtubeChangingFromSync =
                        false;

                },
                1000
            );

        }

    }


    openFullPlayer();


    // ================================================
    // JAM
    // ================================================

    if (
        notifyJam &&
        socket.roomCode
    ) {

        socket.emit(
            "story-change",
            {
                story:
                    currentStory
            }
        );

    }

}


// =====================================================
// OLD FUNCTION SUPPORT
// =====================================================

function playStory(
    storyName
) {

    const index =
        stories.findIndex(
            story =>
                story.title ===
                storyName
        );


    if (
        index === -1
    ) {

        console.log(
            "Story not found:",
            storyName
        );

        return;

    }


    playStoryByIndex(
        index
    );

}


// =====================================================
// AUDIO / YOUTUBE DISPLAY
// =====================================================

function showAudioPlayer() {

    audio.style.display =
        "block";


    const box =
        document.getElementById(
            "youtubePlayerBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


function showYouTubePlayer() {

    audio.style.display =
        "none";


    const box =
        document.getElementById(
            "youtubePlayerBox"
        );


    if (box) {

        box.style.display =
            "block";

    }

}


// =====================================================
// TOGGLE PLAY
// =====================================================

function togglePlay() {

    if (!currentStory) {
        return;
    }


    // AUDIO

    if (
        currentStory.type ===
        "audio"
    ) {

        if (
            audio.paused
        ) {

            audio.play();

            socket.emit(
                "play",
                {
                    currentTime:
                        audio.currentTime
                }
            );

        } else {

            audio.pause();

            socket.emit(
                "pause",
                {
                    currentTime:
                        audio.currentTime
                }
            );

        }

    }


    // YOUTUBE

    else if (
        currentStory.type ===
        "youtube"
    ) {

        if (
            !youtubePlayer ||
            !youtubeReady
        ) {
            return;
        }


        const state =
            youtubePlayer.getPlayerState();


        if (
            state ===
            YT.PlayerState.PLAYING
        ) {

            const time =
                youtubePlayer
                    .getCurrentTime();


            youtubePlayer.pauseVideo();


            socket.emit(
                "pause",
                {
                    currentTime:
                        time
                }
            );

        } else {

            const time =
                youtubePlayer
                    .getCurrentTime();


            youtubePlayer.playVideo();


            socket.emit(
                "play",
                {
                    currentTime:
                        time
                }
            );

        }

    }

}


// =====================================================
// AUDIO EVENTS
// =====================================================

audio.addEventListener(
    "timeupdate",
    () => {

        if (
            !audio.duration
        ) {
            return;
        }


        const percent =
            (
                audio.currentTime /
                audio.duration
            ) * 100;


        progressBar.value =
            percent;


        fullProgressBar.value =
            percent;


        currentTimeEl.textContent =
            formatTime(
                audio.currentTime
            );


        fullCurrentTime.textContent =
            formatTime(
                audio.currentTime
            );

    }
);


audio.addEventListener(
    "loadedmetadata",
    () => {

        durationEl.textContent =
            formatTime(
                audio.duration
            );


        fullDuration.textContent =
            formatTime(
                audio.duration
            );

    }
);


audio.addEventListener(
    "play",
    () => {

        updatePlayButtons(
            true
        );

    }
);


audio.addEventListener(
    "pause",
    () => {

        updatePlayButtons(
            false
        );

    }
);


audio.addEventListener(
    "ended",
    () => {

        updatePlayButtons(
            false
        );

    }
);


// =====================================================
// YOUTUBE STATE
// =====================================================

function handleYouTubeState(event) {

    if (!youtubePlayer) {
        return;
    }

    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        updatePlayButtons(true);

    }

    if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        updatePlayButtons(false);

    }

    if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        updatePlayButtons(false);

    }

}


// =====================================================
// NEXT STORY
// =====================================================

function nextStory() {

    if (
        stories.length === 0
    ) {
        return;
    }


    let nextIndex =
        currentStoryIndex + 1;


    if (
        nextIndex >=
        stories.length
    ) {

        nextIndex = 0;

    }


    playStoryByIndex(
        nextIndex
    );

}


// =====================================================
// PREVIOUS STORY
// =====================================================

function previousStory() {

    if (
        stories.length === 0
    ) {
        return;
    }


    let previousIndex =
        currentStoryIndex - 1;


    if (
        previousIndex < 0
    ) {

        previousIndex =
            stories.length - 1;

    }


    playStoryByIndex(
        previousIndex
    );

}


// =====================================================
// PROGRESS
// =====================================================

function changeProgress(
    value
) {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        if (
            audio.duration
        ) {

            const time =
                (
                    value / 100
                ) *
                audio.duration;


            audio.currentTime =
                time;


            socket.emit(
                "seek",
                {
                    currentTime:
                        time
                }
            );

        }

    }


    else if (
        currentStory.type ===
        "youtube"
    ) {

        if (
            youtubePlayer &&
            youtubeReady
        ) {

            const duration =
                youtubePlayer
                    .getDuration();


            const time =
                (
                    value / 100
                ) *
                duration;


            youtubePlayer.seekTo(
                time,
                true
            );


            socket.emit(
                "seek",
                {
                    currentTime:
                        time
                }
            );

        }

    }

}


// =====================================================
// FULL PROGRESS
// =====================================================

function changeProgressFull(
    value
) {

    changeProgress(
        value
    );

}


// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(
    seconds
) {

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


    const secs =
        Math.floor(
            seconds % 60
        );


    return (
        minutes +
        ":" +
        secs
            .toString()
            .padStart(2, "0")
    );

}


// =====================================================
// SKIP BACKWARD
// =====================================================

function skipBackward() {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        audio.currentTime =
            Math.max(
                0,
                audio.currentTime - 10
            );

    } else {

        const time =
            youtubePlayer
                .getCurrentTime();


        youtubePlayer.seekTo(
            Math.max(
                0,
                time - 10
            ),
            true
        );

    }

}


// =====================================================
// SKIP FORWARD
// =====================================================

function skipForward() {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        audio.currentTime =
            Math.min(
                audio.duration,
                audio.currentTime + 10
            );

    } else {

        const time =
            youtubePlayer
                .getCurrentTime();


        youtubePlayer.seekTo(
            time + 10,
            true
        );

    }

}


// =====================================================
// MUTE
// =====================================================

function toggleMute() {

    audio.muted =
        !audio.muted;

}


// =====================================================
// CATEGORY FILTER
// =====================================================

function filterMood(
    category
) {

    renderStories(
        category
    );

}


// =====================================================
// SEARCH
// =====================================================

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
            .toLowerCase()
            .trim();


    const cards =
        document.querySelectorAll(
            ".story-card"
        );


    cards.forEach(
        card => {

            const title =
                card
                    .querySelector(
                        "h3"
                    )
                    ?.textContent
                    .toLowerCase() ||
                "";


            card.style.display =
                title.includes(query)
                    ? ""
                    : "none";

        }
    );

}


// =====================================================
// FULL PLAYER
// =====================================================

function openFullPlayer() {

    const player =
        document.getElementById(
            "fullPlayer"
        );


    if (player) {

        player.classList.add(
            "active"
        );

    }

}


function closeFullPlayer() {

    const player =
        document.getElementById(
            "fullPlayer"
        );


    if (player) {

        player.classList.remove(
            "active"
        );

    }

}


// =====================================================
// ADD STORY MODAL
// =====================================================

function openAddStoryModal() {

    const modal =
        document.getElementById(
            "addStoryModal"
        );


    modal.style.display =
        "flex";

}


function closeAddStoryModal() {

    const modal =
        document.getElementById(
            "addStoryModal"
        );


    modal.style.display =
        "none";

}


// =====================================================
// ADD YOUTUBE STORY
// =====================================================

async function addYouTubeStory() {

    const title =
        document.getElementById(
            "storyTitle"
        ).value.trim();


    const category =
        document.getElementById(
            "storyCategory"
        ).value;


    const youtubeUrl =
        document.getElementById(
            "youtubeUrl"
        ).value.trim();


    const message =
        document.getElementById(
            "addStoryMessage"
        );


    if (
        !title ||
        !category ||
        !youtubeUrl
    ) {

        message.textContent =
            "❌ Please fill all fields.";

        return;

    }


    message.textContent =
        "Adding story...";


    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/stories`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            title:
                                title,

                            category:
                                category,

                            youtubeUrl:
                                youtubeUrl

                        })

                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            message.textContent =
                "❌ " +
                (
                    result.message ||
                    "Failed to add story."
                );

            return;

        }


        message.textContent =
            "✅ Story added successfully!";


        document.getElementById(
            "storyTitle"
        ).value = "";


        document.getElementById(
            "youtubeUrl"
        ).value = "";


        await loadStories();


        setTimeout(
            () => {

                closeAddStoryModal();

            },
            1000
        );


    } catch (error) {

        console.error(
            error
        );


        message.textContent =
            "❌ Server connection failed.";

    }

}


// =====================================================
// JAM - CREATE
// =====================================================

function createRoom() {

    socket.emit(
        "create-room"
    );

}


// =====================================================
// ROOM CREATED
// =====================================================

socket.on(
    "room-created",
    (data) => {

        socket.roomCode = data.roomCode;

        alert(
            "Your Jam Room Code: " +
            data.roomCode
        );

        openFullPlayer();

    }
);


// =====================================================
// JOIN ROOM
// =====================================================

function joinRoom() {

    closeModal();


    const modal =
        document.getElementById(
            "roomModal"
        );


    modal.style.display =
        "flex";

}


function connectToRoom() {

    const input =
        document.getElementById(
            "roomCodeInput"
        );


    const code =
        input.value
            .trim()
            .toUpperCase();


    if (
        code.length !== 6
    ) {

        alert(
            "Enter a valid 6 character room code."
        );

        return;

    }


    socket.emit(
        "join-room",
        code
    );

}


// =====================================================
// ROOM JOINED
// =====================================================

socket.on(
    "room-joined",
    (data) => {

        socket.roomCode = data.roomCode;

        closeModal();

        // বাকি code আগের মতো থাকবে

        if (
            data.currentStory
        ) {

            const index =
                stories.findIndex(
                    story =>
                        story.id ===
                        data.currentStory.id
                );


            if (
                index !== -1
            ) {

                playStoryByIndex(
                    index,
                    false
                );


                setTimeout(
                    () => {

                        seekCurrentMedia(
                            data.currentTime
                        );


                        if (
                            data.isPlaying
                        ) {

                            playCurrentMedia();

                        }

                    },
                    1500
                );

            }

        }


        openFullPlayer();

    }
);


// =====================================================
// SYNC STORY
// =====================================================

socket.on(
    "sync-story",
    (data) => {

        if (
            !data.story
        ) {
            return;
        }


        const index =
            stories.findIndex(
                story =>
                    story.id ===
                    data.story.id
            );


        if (
            index === -1
        ) {
            return;
        }


        playStoryByIndex(
            index,
            false
        );

    }
);


// =====================================================
// SYNC PLAY
// =====================================================

socket.on(
    "sync-play",
    (data) => {

        seekCurrentMedia(
            data.currentTime
        );


        setTimeout(
            () => {

                playCurrentMedia();

            },
            200
        );

    }
);


// =====================================================
// SYNC PAUSE
// =====================================================

socket.on(
    "sync-pause",
    (data) => {

        seekCurrentMedia(
            data.currentTime
        );


        pauseCurrentMedia();

    }
);


// =====================================================
// SYNC SEEK
// =====================================================

socket.on(
    "sync-seek",
    (data) => {

        seekCurrentMedia(
            data.currentTime
        );

    }
);


// =====================================================
// MEDIA HELPERS
// =====================================================

function playCurrentMedia() {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        audio.play();

    } else {

        if (
            youtubePlayer &&
            youtubeReady
        ) {

            youtubePlayer.playVideo();

        }

    }

}


function pauseCurrentMedia() {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        audio.pause();

    } else {

        if (
            youtubePlayer &&
            youtubeReady
        ) {

            youtubePlayer.pauseVideo();

        }

    }

}


function seekCurrentMedia(
    time
) {

    if (!currentStory) {
        return;
    }


    if (
        currentStory.type ===
        "audio"
    ) {

        audio.currentTime =
            Number(time) || 0;

    } else {

        if (
            youtubePlayer &&
            youtubeReady
        ) {

            youtubePlayer.seekTo(
                Number(time) || 0,
                true
            );

        }

    }

}


// =====================================================
// USER COUNT
// =====================================================

socket.on(
    "user-count",
    (data) => {

        const count =
            document.getElementById(
                "userCount"
            );


        if (count) {

            count.textContent =
                data.count;

        }

    }
);


// =====================================================
// ROOM ERROR
// =====================================================

socket.on(
    "room-error",
    (message) => {

        alert(
            message
        );

    }
);


// =====================================================
// REACTION
// =====================================================

function sendReaction(
    emoji
) {

    socket.emit(
        "reaction",
        {
            emoji:
                emoji
        }
    );

}


socket.on(
    "sync-reaction",
    (data) => {

        console.log(
            "Reaction:",
            data.emoji
        );

    }
);


// =====================================================
// CHAT
// =====================================================

function sendChatMessage() {

    const input =
        document.getElementById(
            "chatInput"
        );


    const message =
        input.value.trim();


    if (!message) {
        return;
    }


    socket.emit(
        "chat-message",
        {
            message:
                message
        }
    );


    input.value =
        "";

}


function handleChatKey(
    event
) {

    if (
        event.key ===
        "Enter"
    ) {

        sendChatMessage();

    }

}


socket.on(
    "new-chat-message",
    (data) => {

        const container =
            document.getElementById(
                "chatMessages"
            );


        if (!container) {
            return;
        }


        const message =
            document.createElement(
                "div"
            );


        message.className =
            "chat-message";


        message.textContent =
            data.message;


        container.appendChild(
            message
        );


        container.scrollTop =
            container.scrollHeight;

    }
);


// =====================================================
// MODALS
// =====================================================

function openJamChoice() {

    const modal =
        document.getElementById(
            "jamChoiceModal"
        );


    modal.style.display =
        "flex";

}


function closeModal() {

    document
        .querySelectorAll(
            ".modal"
        )
        .forEach(
            modal => {

                modal.style.display =
                    "none";

            }
        );

}


// =====================================================
// INITIAL LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadStories();

    }
);