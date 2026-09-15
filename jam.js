/* =========================================================
   SLEEPSTORY JAM PAGE
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const BACKEND_URL =
    "https://storyteller-backend-us3a.onrender.com";


/* =========================================================
   ROOM FROM URL
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const roomCode =
    (
        params.get("room") ||
        ""
    )
        .trim()
        .toUpperCase();


const hostMode =
    params.get("host") === "1";


/* =========================================================
   SOCKET
========================================================= */

let socket = null;


/* =========================================================
   PLAYER STATE
========================================================= */

let audioPlayer =
    document.getElementById(
        "jamAudioPlayer"
    );


let currentStory = {

    title: "The Last Star",

    category: "Bedtime Stories",

    type: "local",

    src: "AUDIO/the-last-star.mp3"

};


let isPlaying = false;

let suppressEvents = false;

let sleepTimer = null;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeJam();

    }
);


/* =========================================================
   INITIALIZE JAM
========================================================= */

function initializeJam() {

    if (
        !roomCode ||
        roomCode.length !== 6
    ) {

        alert(
            "Invalid Jam room."
        );


        window.location.href =
            "index.html";


        return;

    }


    document.getElementById(
        "jamRoomCode"
    ).textContent =
        roomCode;


    document.getElementById(
        "jamRole"
    ).textContent =
        hostMode
            ? "Host"
            : "Listener";


    connectToJam();


    setupAudio();


    setupChat();


    restoreStory();

}


/* =========================================================
   CONNECT
========================================================= */

function connectToJam() {

    try {

        socket =
            io(
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


    } catch (error) {

        console.error(
            error
        );

        setConnectionStatus(
            false
        );

        return;

    }


    socket.on(
        "connect",
        function () {

            console.log(
                "🟢 Jam connected:",
                socket.id
            );


            setConnectionStatus(
                true
            );


            /*
               VERY IMPORTANT

               New page creates a NEW socket.

               Therefore we must join the room again.
            */

            socket.emit(
                "join-room",
                roomCode
            );

        }
    );


    socket.on(
        "connect_error",
        function (error) {

            console.error(
                "Jam connection error:",
                error
            );


            setConnectionStatus(
                false
            );

        }
    );


    socket.on(
        "disconnect",
        function () {

            setConnectionStatus(
                false
            );

        }
    );


    /* =========================================
       ROOM JOINED
    ========================================= */

    socket.on(
        "room-joined",
        function (data) {

            console.log(
                "🌙 Joined Jam:",
                data
            );


            if (
                data &&
                typeof data.currentTime !==
                "undefined"
            ) {

                applyRoomState(
                    data
                );

            }


            setJamStatus(
                "Connected"
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
                "This Jam no longer exists."
            );


            window.location.href =
                "index.html";

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


            updateUserCount(
                count
            );

        }
    );


    /* =========================================
       PLAY
    ========================================= */

    socket.on(
        "sync-play",
        function (data) {

            if (!data) {

                return;

            }


            applyRemotePlay(
                Number(
                    data.currentTime
                ) || 0
            );

        }
    );


    /* =========================================
       PAUSE
    ========================================= */

    socket.on(
        "sync-pause",
        function (data) {

            if (!data) {

                return;

            }


            applyRemotePause(
                Number(
                    data.currentTime
                ) || 0
            );

        }
    );


    /* =========================================
       SEEK
    ========================================= */

    socket.on(
        "sync-seek",
        function (data) {

            if (!data) {

                return;

            }


            applyRemoteSeek(
                Number(
                    data.currentTime
                ) || 0
            );

        }
    );


    /* =========================================
       REACTION
    ========================================= */

    socket.on(
        "sync-reaction",
        function (data) {

            if (!data) {

                return;

            }


            showFloatingReaction(
                data.emoji
            );

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
                data.message ||
                "",
                "Listener"
            );

        }
    );

}


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

            if (
                suppressEvents
            ) {

                return;

            }


            isPlaying =
                true;


            updatePlayButton();


            setJamStatus(
                "Playing together"
            );


            if (
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "play",
                    {
                        currentTime:
                            audioPlayer.currentTime
                    }
                );

            }

        }
    );


    audioPlayer.addEventListener(
        "pause",
        function () {

            if (
                suppressEvents
            ) {

                return;

            }


            isPlaying =
                false;


            updatePlayButton();


            setJamStatus(
                "Paused"
            );


            if (
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "pause",
                    {
                        currentTime:
                            audioPlayer.currentTime
                    }
                );

            }

        }
    );

}


/* =========================================================
   APPLY ROOM STATE
========================================================= */

function applyRoomState(
    data
) {

    const time =
        Number(
            data.currentTime
        ) || 0;


    suppressEvents =
        true;


    audioPlayer.currentTime =
        time;


    if (
        data.isPlaying
    ) {

        audioPlayer.play()
            .catch(
                function () {}
            );


        isPlaying =
            true;

    } else {

        audioPlayer.pause();

        isPlaying =
            false;

    }


    setTimeout(
        function () {

            suppressEvents =
                false;

            updatePlayButton();

            updateProgress();

        },
        500
    );

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function toggleJamPlay() {

    if (!audioPlayer) {

        return;

    }


    if (
        audioPlayer.paused
    ) {

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
   UPDATE PLAY BUTTON
========================================================= */

function updatePlayButton() {

    const button =
        document.getElementById(
            "jamPlayButton"
        );


    if (!button) {

        return;

    }


    button.textContent =
        isPlaying
            ? "❚❚"
            : "▶";

}


/* =========================================================
   REMOTE PLAY
========================================================= */

function applyRemotePlay(
    time
) {

    suppressEvents =
        true;


    audioPlayer.currentTime =
        time;


    audioPlayer.play()
        .catch(
            function () {}
        );


    isPlaying =
        true;


    updatePlayButton();


    setJamStatus(
        "Playing together"
    );


    setTimeout(
        function () {

            suppressEvents =
                false;

        },
        600
    );

}


/* =========================================================
   REMOTE PAUSE
========================================================= */

function applyRemotePause(
    time
) {

    suppressEvents =
        true;


    audioPlayer.currentTime =
        time;


    audioPlayer.pause();


    isPlaying =
        false;


    updatePlayButton();


    setJamStatus(
        "Paused"
    );


    setTimeout(
        function () {

            suppressEvents =
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

    suppressEvents =
        true;


    audioPlayer.currentTime =
        time;


    updateProgress();


    setTimeout(
        function () {

            suppressEvents =
                false;

        },
        300
    );

}


/* =========================================================
   PROGRESS
========================================================= */

const progressBar =
    document.getElementById(
        "jamProgressBar"
    );


if (progressBar) {

    progressBar.addEventListener(
        "input",
        function () {

            if (!audioPlayer.duration) {

                return;

            }


            const percentage =
                Number(
                    progressBar.value
                );


            const newTime =
                (
                    percentage /
                    100
                ) *
                audioPlayer.duration;


            suppressEvents =
                true;


            audioPlayer.currentTime =
                newTime;


            suppressEvents =
                false;


            if (
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "seek",
                    {
                        currentTime:
                            newTime
                    }
                );

            }

        }
    );

}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgress() {

    if (!audioPlayer) {

        return;

    }


    const current =
        audioPlayer.currentTime ||
        0;


    const duration =
        audioPlayer.duration ||
        0;


    const currentElement =
        document.getElementById(
            "jamCurrentTime"
        );


    const durationElement =
        document.getElementById(
            "jamDuration"
        );


    if (
        currentElement
    ) {

        currentElement.textContent =
            formatTime(
                current
            );

    }


    if (
        durationElement
    ) {

        durationElement.textContent =
            formatTime(
                duration
            );

    }


    if (
        progressBar &&
        duration > 0
    ) {

        progressBar.value =
            (
                current /
                duration
            ) *
            100;

    }

}


/* =========================================================
   DURATION
========================================================= */

function updateDuration() {

    if (!audioPlayer) {

        return;

    }


    const duration =
        audioPlayer.duration ||
        0;


    const element =
        document.getElementById(
            "jamDuration"
        );


    if (element) {

        element.textContent =
            formatTime(
                duration
            );

    }

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    seconds
) {

    seconds =
        Number(
            seconds
        ) || 0;


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
        String(
            secs
        ).padStart(
            2,
            "0"
        )
    );

}


/* =========================================================
   MUTE
========================================================= */

function toggleJamMute() {

    if (!audioPlayer) {

        return;

    }


    audioPlayer.muted =
        !audioPlayer.muted;


    const button =
        document.getElementById(
            "jamMuteButton"
        );


    if (button) {

        button.textContent =
            audioPlayer.muted
                ? "🔇"
                : "🔊";

    }

}


/* =========================================================
   SLEEP TIMER
========================================================= */

function setJamSleepTimer() {

    const select =
        document.getElementById(
            "jamSleepTimer"
        );


    if (!select) {

        return;

    }


    if (
        sleepTimer
    ) {

        clearTimeout(
            sleepTimer
        );

    }


    const minutes =
        Number(
            select.value
        );


    if (
        minutes <= 0
    ) {

        return;

    }


    sleepTimer =
        setTimeout(
            function () {

                audioPlayer.pause();

                select.value =
                    "0";

            },
            minutes *
            60 *
            1000
        );

}


/* =========================================================
   REACTIONS
========================================================= */

function sendJamReaction(
    emoji
) {

    showFloatingReaction(
        emoji
    );


    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "reaction",
            {
                emoji
            }
        );

    }

}


function showFloatingReaction(
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


    element.textContent =
        emoji;


    element.style.position =
        "fixed";


    element.style.left =
        (
            Math.random() *
            80 +
            10
        ) + "%";


    element.style.bottom =
        "100px";


    element.style.fontSize =
        "32px";


    element.style.zIndex =
        "99999";


    element.style.pointerEvents =
        "none";


    element.style.transition =
        "all 2s ease";


    container.appendChild(
        element
    );


    requestAnimationFrame(
        function () {

            element.style.transform =
                "translateY(-220px) scale(1.4)";

            element.style.opacity =
                "0";

        }
    );


    setTimeout(
        function () {

            element.remove();

        },
        2100
    );

}


/* =========================================================
   CHAT
========================================================= */

function setupChat() {

    const input =
        document.getElementById(
            "jamChatInput"
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

                sendJamChat();

            }

        }
    );

}


function sendJamChat() {

    const input =
        document.getElementById(
            "jamChatInput"
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
        socket.connected
    ) {

        socket.emit(
            "chat-message",
            {
                message
            }
        );

    }


    input.value =
        "";

}


function addChatMessage(
    message,
    sender
) {

    const container =
        document.getElementById(
            "jamChatMessages"
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
            ${escapeHTML(sender)}
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
   USER COUNT
========================================================= */

function updateUserCount(
    count
) {

    const element =
        document.getElementById(
            "jamUserCount"
        );


    if (!element) {

        return;

    }


    count =
        Math.max(
            Number(count) || 1,
            1
        );


    element.textContent =
        `${count} ${
            count === 1
                ? "listener"
                : "listeners"
        }`;

}


/* =========================================================
   CONNECTION STATUS
========================================================= */

function setConnectionStatus(
    connected
) {

    const dot =
        document.getElementById(
            "connectionDot"
        );


    const text =
        document.getElementById(
            "connectionText"
        );


    if (connected) {

        if (dot) {

            dot.style.background =
                "#22c55e";

        }


        if (text) {

            text.textContent =
                "Connected";

        }

    } else {

        if (dot) {

            dot.style.background =
                "#ef4444";

        }


        if (text) {

            text.textContent =
                "Reconnecting...";

        }

    }

}


/* =========================================================
   JAM STATUS
========================================================= */

function setJamStatus(
    status
) {

    const element =
        document.getElementById(
            "jamStatus"
        );


    if (element) {

        element.textContent =
            status;

    }

}


/* =========================================================
   COPY ROOM CODE
========================================================= */

function copyRoomCode() {

    if (!roomCode) {

        return;

    }


    navigator.clipboard
        .writeText(
            roomCode
        )
        .then(
            function () {

                const button =
                    document.querySelector(
                        ".jam-room-card .outline-btn"
                    );


                if (button) {

                    const oldText =
                        button.textContent;


                    button.textContent =
                        "Copied ✓";


                    setTimeout(
                        function () {

                            button.textContent =
                                oldText;

                        },
                        1500
                    );

                }

            }
        )
        .catch(
            function () {

                alert(
                    `Room Code: ${roomCode}`
                );

            }
        );

}


/* =========================================================
   RESTORE STORY
========================================================= */

function restoreStory() {

    try {

        const saved =
            localStorage.getItem(
                "sleepstory-current-story"
            );


        if (!saved) {

            return;

        }


        const story =
            JSON.parse(
                saved
            );


        if (
            story &&
            story.title
        ) {

            currentStory =
                story;


            const title =
                document.getElementById(
                    "jamStoryTitle"
                );


            const category =
                document.getElementById(
                    "jamStoryCategory"
                );


            if (title) {

                title.textContent =
                    story.title;

            }


            if (category) {

                category.textContent =
                    story.category ||
                    "Story";

            }


            if (
                story.type ===
                "local" &&
                story.src
            ) {

                audioPlayer.src =
                    story.src;

                audioPlayer.load();

            }

        }

    } catch (error) {

        console.warn(
            "Could not restore story.",
            error
        );

    }

}


/* =========================================================
   PREVIOUS / NEXT
========================================================= */

function previousJamStory() {

    /*
       For now the Jam uses the current story.
       Story switching can be connected to the
       complete story library later.
    */

    console.log(
        "Previous story"
    );

}


function nextJamStory() {

    console.log(
        "Next story"
    );

}


/* =========================================================
   LEAVE JAM
========================================================= */

function leaveJam() {

    if (
        socket
    ) {

        socket.disconnect();

    }


    window.location.href =
        "index.html";

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
   DEBUG
========================================================= */

console.log(
    "🌙 SleepStory Jam page ready.",
    roomCode
);