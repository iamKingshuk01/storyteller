const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);


// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
    cors: {
        origin: "https://storyteller-fawn.vercel.app",
        methods: ["GET", "POST"]
    }
});


// =====================================================
// SERVE FRONTEND
// =====================================================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


// =====================================================
// ROOMS
// =====================================================

const rooms = new Map();


// =====================================================
// ROOM CODE GENERATOR
// =====================================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (let i = 0; i < 6; i++) {

            code += characters[
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

    socket.on(
        "create-room",
        () => {

            const roomCode =
                generateRoomCode();


            rooms.set(
                roomCode,
                {
                    host: socket.id,

                    isPlaying: false,

                    currentTime: 0,

                    lastUpdate: Date.now()
                }
            );


            socket.join(roomCode);

            socket.roomCode =
                roomCode;


            socket.emit(
                "room-created",
                {
                    roomCode: roomCode
                }
            );


            sendUserCount(roomCode);


            console.log(
                "🌙 Room created:",
                roomCode
            );

        }
    );


    // =================================================
    // JOIN ROOM
    // =================================================

    socket.on(
        "join-room",
        (roomCode) => {

            roomCode =
                String(roomCode)
                    .trim()
                    .toUpperCase();


            const room =
                rooms.get(roomCode);


            if (!room) {

                socket.emit(
                    "room-error",
                    "Room not found!"
                );

                return;
            }


            // -----------------------------------------
            // Calculate latest playback position
            // -----------------------------------------

            let currentTime =
                room.currentTime;


            if (room.isPlaying) {

                const elapsed =
                    (
                        Date.now() -
                        room.lastUpdate
                    ) / 1000;


                currentTime += elapsed;

            }


            // -----------------------------------------
            // Join socket room
            // -----------------------------------------

            socket.join(roomCode);

            socket.roomCode =
                roomCode;


            // -----------------------------------------
            // Send current room state
            // -----------------------------------------

            socket.emit(
                "room-joined",
                {
                    roomCode: roomCode,

                    isPlaying:
                        room.isPlaying,

                    currentTime:
                        currentTime
                }
            );


            sendUserCount(roomCode);


            console.log(
                "👥 User joined room:",
                roomCode
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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.isPlaying = true;

            room.currentTime =
                currentTime;

            room.lastUpdate =
                Date.now();


            socket
                .to(roomCode)
                .emit(
                    "sync-play",
                    {
                        currentTime:
                            currentTime
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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.isPlaying = false;

            room.currentTime =
                currentTime;

            room.lastUpdate =
                Date.now();


            socket
                .to(roomCode)
                .emit(
                    "sync-pause",
                    {
                        currentTime:
                            currentTime
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


            const currentTime =
                Number(
                    data?.currentTime
                ) || 0;


            room.currentTime =
                currentTime;

            room.lastUpdate =
                Date.now();


            socket
                .to(roomCode)
                .emit(
                    "sync-seek",
                    {
                        currentTime:
                            currentTime
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


            if (
                !data ||
                !data.emoji
            ) {
                return;
            }


            socket
                .to(roomCode)
                .emit(
                    "sync-reaction",
                    {
                        emoji:
                            data.emoji
                    }
                );

        }
    );


    // =================================================
    // CHAT MESSAGE
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


            if (
                !data ||
                !data.message
            ) {
                return;
            }


            io
                .to(roomCode)
                .emit(
                    "new-chat-message",
                    {
                        message:
                            String(
                                data.message
                            ).slice(
                                0,
                                500
                            ),

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


            // -----------------------------------------
            // Host disconnected
            // -----------------------------------------

            if (
                room.host ===
                socket.id
            ) {

                /*
                 * Keep the room alive for 30 seconds.
                 * This prevents accidental deletion
                 * during temporary disconnection.
                 */

                setTimeout(
                    () => {

                        const stillExists =
                            rooms.get(
                                roomCode
                            );


                        if (
                            stillExists &&
                            stillExists.host ===
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

            }


            // -----------------------------------------
            // Update user count
            // -----------------------------------------

            setTimeout(
                () => {

                    sendUserCount(
                        roomCode
                    );

                },
                100
            );

        }
    );

});


// =====================================================
// USER COUNT
// =====================================================

function sendUserCount(roomCode) {

    const room =
        io.sockets.adapter
            .rooms
            .get(roomCode);


    const count =
        room
            ? room.size
            : 0;


    io
        .to(roomCode)
        .emit(
            "user-count",
            {
                count: count
            }
        );

}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",
    (req, res) => {

        res.json(
            {
                status: "ok",

                service:
                    "SleepStory Backend",

                rooms:
                    rooms.size
            }
        );

    }
);


// =====================================================
// SERVER
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