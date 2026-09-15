const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

/* =========================================================
   SOCKET.IO
========================================================= */

const io = new Server(server, {
    cors: {
        origin: "https://storyteller-fawn.vercel.app",
        methods: ["GET", "POST"]
    }
});


/* =========================================================
   FRONTEND
========================================================= */

app.use(express.static(path.join(__dirname, "..")));


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "SleepStory Backend"
    });
});


/* =========================================================
   ROOMS
========================================================= */

const rooms = new Map();


/* =========================================================
   ROOM CODE GENERATOR
========================================================= */

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


/* =========================================================
   USER COUNT
========================================================= */

function getRoomUserCount(roomCode) {

    return (
        io.sockets.adapter.rooms.get(roomCode)?.size ||
        0
    );
}


/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on("connection", (socket) => {

    console.log(
        "👤 User connected:",
        socket.id
    );


    /* =====================================================
       CREATE ROOM
    ===================================================== */

    socket.on("create-room", (callback) => {

        const roomCode =
            generateRoomCode();


        rooms.set(roomCode, {

            host: socket.id,

            isPlaying: false,

            currentTime: 0,

            lastUpdate: Date.now(),

            story: null

        });


        socket.join(roomCode);

        socket.roomCode = roomCode;

        socket.isHost = true;


        /* ---------------------------------------------
           Event notification
        --------------------------------------------- */

        socket.emit("room-created", {

            roomCode: roomCode

        });


        /* ---------------------------------------------
           Callback response
        --------------------------------------------- */

        if (typeof callback === "function") {

            callback({

                success: true,

                roomCode: roomCode

            });

        }


        /* ---------------------------------------------
           User count
        --------------------------------------------- */

        io.to(roomCode).emit(
            "user-count",
            getRoomUserCount(roomCode)
        );


        console.log(
            "🌙 Room created:",
            roomCode
        );

    });


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
        "join-room",
        (data, callback) => {

            let code = "";


            /*
               Support both:

               socket.emit("join-room", "ABC123")

               and

               socket.emit(
                   "join-room",
                   { roomCode: "ABC123" }
               )
            */

            if (typeof data === "string") {

                code =
                    data
                        .trim()
                        .toUpperCase();

            } else if (data && data.roomCode) {

                code =
                    data.roomCode
                        .trim()
                        .toUpperCase();

            }


            /* -----------------------------------------
               Validate code
            ----------------------------------------- */

            if (code.length !== 6) {

                const response = {

                    success: false,

                    message:
                        "Invalid room code."

                };


                socket.emit(
                    "room-error",
                    response.message
                );


                if (
                    typeof callback ===
                    "function"
                ) {

                    callback(response);

                }

                return;
            }


            /* -----------------------------------------
               Find room
            ----------------------------------------- */

            const room =
                rooms.get(code);


            if (!room) {

                const response = {

                    success: false,

                    message:
                        "Room not found. Please check the code."

                };


                socket.emit(
                    "room-error",
                    response.message
                );


                if (
                    typeof callback ===
                    "function"
                ) {

                    callback(response);

                }

                return;
            }


            /* -----------------------------------------
               Leave previous room if any
            ----------------------------------------- */

            if (
                socket.roomCode &&
                socket.roomCode !== code
            ) {

                socket.leave(
                    socket.roomCode
                );

            }


            /* -----------------------------------------
               Calculate current time
            ----------------------------------------- */

            let currentTime =
                Number(
                    room.currentTime
                ) || 0;


            if (room.isPlaying) {

                const elapsed =
                    (
                        Date.now() -
                        room.lastUpdate
                    ) / 1000;


                currentTime += elapsed;

            }


            /* -----------------------------------------
               Join socket room
            ----------------------------------------- */

            socket.join(code);

            socket.roomCode = code;

            socket.isHost = false;


            /* -----------------------------------------
               Send current room state
            ----------------------------------------- */

            socket.emit(
                "room-joined",
                {

                    roomCode: code,

                    isPlaying:
                        room.isPlaying,

                    currentTime:
                        currentTime,

                    story:
                        room.story

                }
            );


            /* -----------------------------------------
               Callback
            ----------------------------------------- */

            if (
                typeof callback ===
                "function"
            ) {

                callback({

                    success: true,

                    roomCode: code,

                    isPlaying:
                        room.isPlaying,

                    currentTime:
                        currentTime,

                    story:
                        room.story

                });

            }


            /* -----------------------------------------
               Update everyone
            ----------------------------------------- */

            io.to(code).emit(
                "user-count",
                getRoomUserCount(code)
            );


            console.log(
                "👥 User joined room:",
                code
            );

        }
    );


    /* =====================================================
       STORY CHANGE
    ===================================================== */

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


            /*
               Only host controls the story
            */

            if (
                room.host !== socket.id
            ) {

                return;

            }


            room.story =
                data?.story || null;


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
                        room.story,

                    currentTime:
                        0,

                    isPlaying:
                        false

                }
            );

        }
    );


    /* =====================================================
       PLAY
    ===================================================== */

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


            room.isPlaying =
                true;


            room.currentTime =
                currentTime;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-play",
                {

                    currentTime:
                        currentTime

                }
            );

        }
    );


    /* =====================================================
       PAUSE
    ===================================================== */

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


            room.isPlaying =
                false;


            room.currentTime =
                currentTime;


            room.lastUpdate =
                Date.now();


            socket.to(roomCode).emit(
                "sync-pause",
                {

                    currentTime:
                        currentTime

                }
            );

        }
    );


    /* =====================================================
       SEEK
    ===================================================== */

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

                    currentTime:
                        currentTime

                }
            );

        }
    );


    /* =====================================================
       REACTION
    ===================================================== */

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


            const emoji =
                data?.emoji;


            if (!emoji) {

                return;

            }


            socket.to(roomCode).emit(
                "sync-reaction",
                {

                    emoji: emoji

                }
            );

        }
    );


    /* =====================================================
       CHAT
    ===================================================== */

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

                    message:
                        message,

                    senderId:
                        socket.id

                }
            );

        }
    );


    /* =====================================================
       DISCONNECT
    ===================================================== */

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


            /* -----------------------------------------
               Host disconnected
            ----------------------------------------- */

            if (
                room.host === socket.id
            ) {

                /*
                   Give host 30 seconds to reconnect.
                */

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

            }


            /* -----------------------------------------
               Update user count
            ----------------------------------------- */

            setTimeout(
                () => {

                    if (
                        rooms.has(roomCode)
                    ) {

                        io.to(roomCode).emit(
                            "user-count",
                            getRoomUserCount(
                                roomCode
                            )
                        );

                    }

                },
                100
            );

        }
    );

});


/* =========================================================
   START SERVER
========================================================= */

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