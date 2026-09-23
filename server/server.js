const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://storyteller-fawn.vercel.app",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

// =====================================================
// STORIES
// =====================================================

const stories = [
    {
        id: "audio-sunday",
        title: "Sunday Suspense",
        category: "Sunday Suspense",
        type: "audio",
        src: "AUDIO/sunday-suspense.mp3"
    },

    {
        id: "audio-mirchi",
        title: "Mirchi Bangla",
        category: "Mirchi Bangla",
        type: "audio",
        src: "AUDIO/mirchi-bangla.mp3"
    },

    {
        id: "audio-love",
        title: "Love Story",
        category: "Love Story",
        type: "audio",
        src: "AUDIO/love-story.mp3"
    },

    {
        id: "audio-horror",
        title: "Horror Story",
        category: "Horror Story",
        type: "audio",
        src: "AUDIO/horror-story.mp3"
    }
];


// =====================================================
// YOUTUBE ID EXTRACTOR
// =====================================================

function getYouTubeId(url) {

    try {

        const parsed = new URL(url);

        // youtube.com/watch?v=XXXXXXXXXXX
        if (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com" ||
            parsed.hostname === "m.youtube.com"
        ) {

            const videoId =
                parsed.searchParams.get("v");

            if (videoId) {
                return videoId;
            }

            // /shorts/VIDEO_ID
            const parts =
                parsed.pathname.split("/");

            if (
                parts[1] === "shorts" &&
                parts[2]
            ) {
                return parts[2];
            }

            // /embed/VIDEO_ID
            if (
                parts[1] === "embed" &&
                parts[2]
            ) {
                return parts[2];
            }
        }


        // youtu.be/VIDEO_ID
        if (
            parsed.hostname === "youtu.be"
        ) {

            return parsed.pathname
                .split("/")[1];
        }

    } catch (error) {

        return null;
    }

    return null;
}


// =====================================================
// GET ALL STORIES
// =====================================================

app.get("/api/stories", (req, res) => {

    res.json(stories);

});


// =====================================================
// ADD YOUTUBE STORY
// =====================================================

app.post("/api/stories", (req, res) => {

    const {
        title,
        category,
        youtubeUrl
    } = req.body;


    if (
        !title ||
        !category ||
        !youtubeUrl
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Please fill all fields."

        });

    }


    const youtubeId =
        getYouTubeId(youtubeUrl);


    if (!youtubeId) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid YouTube URL."

        });

    }


    const newStory = {

        id:
            "youtube-" +
            Date.now(),

        title:
            title.trim(),

        category:
            category,

        type:
            "youtube",

        youtubeId:
            youtubeId,

        youtubeUrl:
            youtubeUrl

    };


    stories.push(newStory);


    console.log(
        "🎧 New story added:",
        newStory
    );


    res.json({

        success: true,

        story:
            newStory

    });

});


// =====================================================
// ROOMS
// =====================================================

const rooms = new Map();


// =====================================================
// ROOM CODE
// =====================================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (
            let i = 0;
            i < 6;
            i++
        ) {

            code +=
                characters[
                    Math.floor(
                        Math.random() *
                        characters.length
                    )
                ];

        }

    } while (rooms.has(code));


    return code;
}


// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {

    console.log(
        "👤 User connected:",
        socket.id
    );


    // =================================================
    // CREATE ROOM
    // =================================================

    socket.on("create-room", () => {

        const roomCode =
            generateRoomCode();


        rooms.set(
            roomCode,
            {

                host:
                    socket.id,

                currentStory:
                    null,

                isPlaying:
                    false,

                currentTime:
                    0,

                lastUpdate:
                    Date.now()

            }
        );


        socket.join(roomCode);

        socket.roomCode =
            roomCode;


        socket.emit(
            "room-created",
            {
                roomCode:
                    roomCode
            }
        );


        io.to(roomCode).emit(
            "user-count",
            {

                count:
                    io.sockets.adapter
                        .rooms
                        .get(roomCode)
                        ?.size || 0

            }
        );


        console.log(
            "🌙 Room created:",
            roomCode
        );

    });


    // =================================================
    // JOIN ROOM
    // =================================================

    socket.on(
        "join-room",
        (roomCode) => {

            roomCode =
                roomCode
                    .toUpperCase()
                    .trim();


            const room =
                rooms.get(roomCode);


            if (!room) {

                socket.emit(
                    "room-error",
                    "Room not found!"
                );

                return;
            }


            let currentTime =
                room.currentTime;


            if (room.isPlaying) {

                const elapsed =
                    (
                        Date.now() -
                        room.lastUpdate
                    ) / 1000;


                currentTime +=
                    elapsed;

            }


            socket.join(roomCode);

            socket.roomCode =
                roomCode;


            socket.emit(
                "room-joined",
                {

                    roomCode:
                        roomCode,

                    currentStory:
                        room.currentStory,

                    isPlaying:
                        room.isPlaying,

                    currentTime:
                        currentTime

                }
            );


            io.to(roomCode).emit(
                "user-count",
                {

                    count:
                        io.sockets.adapter
                            .rooms
                            .get(roomCode)
                            ?.size || 0

                }
            );


            console.log(
                "👥 User joined room:",
                roomCode
            );

        }
    );


    // =================================================
    // CHANGE STORY
    // =================================================

    socket.on(
        "story-change",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            const room =
                rooms.get(roomCode);


            room.currentStory =
                data.story;


            room.currentTime =
                0;


            room.isPlaying =
                false;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-story",
                {

                    story:
                        data.story

                }
            );

        }
    );


    // =================================================
    // PLAY
    // =================================================

    socket.on(
        "play",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            const room =
                rooms.get(roomCode);


            room.isPlaying =
                true;


            room.currentTime =
                Number(data.currentTime) || 0;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-play",
                {

                    currentTime:
                        room.currentTime

                }
            );

        }
    );


    // =================================================
    // PAUSE
    // =================================================

    socket.on(
        "pause",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            const room =
                rooms.get(roomCode);


            room.isPlaying =
                false;


            room.currentTime =
                Number(data.currentTime) || 0;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-pause",
                {

                    currentTime:
                        room.currentTime

                }
            );

        }
    );


    // =================================================
    // SEEK
    // =================================================

    socket.on(
        "seek",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            const room =
                rooms.get(roomCode);


            room.currentTime =
                Number(data.currentTime) || 0;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-seek",
                {

                    currentTime:
                        room.currentTime

                }
            );

        }
    );


    // =================================================
    // REACTION
    // =================================================

    socket.on(
        "reaction",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            socket.to(roomCode).emit(
                "sync-reaction",
                {

                    emoji:
                        data.emoji

                }
            );

        }
    );


    // =================================================
    // CHAT
    // =================================================

    socket.on(
        "chat-message",
        (data) => {

            const roomCode =
                socket.roomCode;


            if (
                !roomCode ||
                !rooms.has(roomCode)
            ) {
                return;
            }


            io.to(roomCode).emit(
                "new-chat-message",
                {

                    message:
                        data.message,

                    senderId:
                        socket.id

                }
            );

        }
    );


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "❌ User disconnected:",
                socket.id
            );


            const roomCode =
                socket.roomCode;


            if (!roomCode) {
                return;
            }


            const room =
                rooms.get(roomCode);


            if (!room) {
                return;
            }


            if (
                room.host ===
                socket.id
            ) {

                setTimeout(
                    () => {

                        const currentRoom =
                            rooms.get(roomCode);


                        if (
                            currentRoom &&
                            currentRoom.host ===
                                socket.id
                        ) {

                            rooms.delete(
                                roomCode
                            );


                            console.log(
                                "🗑️ Room deleted:",
                                roomCode
                            );

                        }

                    },
                    30000
                );

            } else {

                setTimeout(
                    () => {

                        io.to(roomCode).emit(
                            "user-count",
                            {

                                count:
                                    io.sockets.adapter
                                        .rooms
                                        .get(roomCode)
                                        ?.size || 0

                            }
                        );

                    },
                    100
                );

            }

        }
    );

});


// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 3000;


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🌙 SleepStory server running on port ${PORT}`
        );

    }
);