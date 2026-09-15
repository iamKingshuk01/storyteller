const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "https://storyteller-fawn.vercel.app",
            "http://localhost:3000"
        ],
        methods: ["GET", "POST"]
    }
});


// =========================================================
// BASIC
// =========================================================

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "SleepStory Backend"
    });
});


// =========================================================
// ROOM STORAGE
// =========================================================

const rooms = new Map();


// =========================================================
// ROOM CODE
// =========================================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (let i = 0; i < 6; i++) {

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


// =========================================================
// GET ROOM
// =========================================================

function getRoomCount(roomCode) {

    return (
        io.sockets.adapter.rooms.get(roomCode)?.size ||
        0
    );

}


function emitUserCount(roomCode) {

    io.to(roomCode).emit(
        "user-count",
        {
            count: getRoomCount(roomCode)
        }
    );

}


// =========================================================
// SOCKET CONNECTION
// =========================================================

io.on("connection", (socket) => {

    console.log(
        "👤 User connected:",
        socket.id
    );


    // =====================================================
    // CREATE ROOM
    // =====================================================

    socket.on(
        "create-room",
        () => {

            const roomCode =
                generateRoomCode();


            rooms.set(
                roomCode,
                {

                    host: socket.id,

                    hostConnected: true,

                    isPlaying: false,

                    currentTime: 0,

                    lastUpdate: Date.now(),

                    currentStory: {

                        title: "The Last Star",

                        category: "Bedtime Stories",

                        type: "local",

                        src:
                            "AUDIO/the-last-star.mp3"

                    }

                }
            );


            socket.join(roomCode);

            socket.roomCode =
                roomCode;

            socket.isRoomHost =
                true;


            console.log(
                "🌙 Room created:",
                roomCode
            );


            socket.emit(
                "room-created",
                {
                    roomCode
                }
            );


            emitUserCount(
                roomCode
            );

        }
    );


    // =====================================================
    // JOIN ROOM
    // =====================================================

    socket.on(
        "join-room",
        (payload) => {

            let roomCode = "";

            let hostRequest = false;


            /*
             Supports BOTH:

             socket.emit("join-room", "ABC123")

             and

             socket.emit("join-room", {
                 roomCode: "ABC123",
                 host: true
             })
            */

            if (
                typeof payload === "string"
            ) {

                roomCode =
                    payload
                        .trim()
                        .toUpperCase();

            } else if (
                payload &&
                typeof payload === "object"
            ) {

                roomCode =
                    String(
                        payload.roomCode ||
                        payload.code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                hostRequest =
                    payload.host === true;

            }


            if (
                roomCode.length !== 6
            ) {

                socket.emit(
                    "room-error",
                    "Invalid Jam room."
                );

                return;

            }


            const room =
                rooms.get(roomCode);


            if (!room) {

                console.log(
                    "❌ Room not found:",
                    roomCode
                );


                socket.emit(
                    "room-error",
                    "Room not found!"
                );

                return;

            }


            /*
             Calculate current playback
             position if the room is playing.
            */

            let currentTime =
                Number(
                    room.currentTime
                ) || 0;


            if (
                room.isPlaying
            ) {

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


            /*
             If the original host opens
             jam.html again, transfer host
             ownership to the new socket.
            */

            if (
                hostRequest
            ) {

                room.host =
                    socket.id;

                room.hostConnected =
                    true;

                socket.isRoomHost =
                    true;

                console.log(
                    "👑 Host transferred:",
                    roomCode,
                    socket.id
                );

            }


            socket.emit(
                "room-joined",
                {

                    roomCode,

                    isPlaying:
                        room.isPlaying,

                    currentTime,

                    currentStory:
                        room.currentStory

                }
            );


            emitUserCount(
                roomCode
            );


            console.log(
                "👥 User joined:",
                roomCode,
                socket.id
            );

        }
    );


    // =====================================================
    // STORY CHANGE
    // =====================================================

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


            if (
                !data ||
                !data.story
            ) {

                return;

            }


            room.currentStory =
                data.story;


            room.currentTime = 0;

            room.isPlaying = false;

            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-story",
                {

                    story:
                        data.story,

                    currentTime: 0,

                    isPlaying: false

                }
            );


            console.log(
                "📖 Story changed:",
                roomCode,
                data.story.title
            );

        }
    );


    // =====================================================
    // PLAY
    // =====================================================

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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.currentTime =
                currentTime;

            room.isPlaying =
                true;

            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-play",
                {
                    currentTime
                }
            );

        }
    );


    // =====================================================
    // PAUSE
    // =====================================================

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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.currentTime =
                currentTime;

            room.isPlaying =
                false;

            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-pause",
                {
                    currentTime
                }
            );

        }
    );


    // =====================================================
    // SEEK
    // =====================================================

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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.currentTime =
                currentTime;

            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-seek",
                {
                    currentTime
                }
            );

        }
    );


    // =====================================================
    // REACTION
    // =====================================================

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
                        data?.emoji || "❤️"
                }
            );

        }
    );


    // =====================================================
    // CHAT
    // =====================================================

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


            const message =
                String(
                    data?.message || ""
                ).trim();


            if (!message) {

                return;

            }


            io.to(roomCode).emit(
                "new-chat-message",
                {

                    message,

                    senderId:
                        socket.id

                }
            );

        }
    );


    // =====================================================
    // DISCONNECT
    // =====================================================

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


            /*
             IMPORTANT:

             Do NOT immediately delete the room.

             Host leaves index.html and opens
             jam.html, which creates a NEW socket.

             Give the host enough time to reconnect.
            */

            if (
                room.host === socket.id
            ) {

                room.hostConnected =
                    false;


                console.log(
                    "⏳ Host temporarily disconnected:",
                    roomCode
                );


                setTimeout(
                    () => {

                        const currentRoom =
                            rooms.get(roomCode);


                        if (!currentRoom) {

                            return;

                        }


                        /*
                         If the same host has not
                         returned, keep the room
                         alive for now.

                         The room is only removed
                         when there are no sockets
                         left.
                        */

                        if (
                            getRoomCount(roomCode) === 0
                        ) {

                            rooms.delete(
                                roomCode
                            );


                            console.log(
                                "🗑️ Empty room deleted:",
                                roomCode
                            );

                        }

                    },
                    120000
                );

            }


            setTimeout(
                () => {

                    if (
                        rooms.has(roomCode)
                    ) {

                        emitUserCount(
                            roomCode
                        );

                    }

                },
                100
            );

        }
    );

});


// =========================================================
// START SERVER
// =========================================================

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