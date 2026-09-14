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


// Frontend serve করবে
app.use(express.static(path.join(__dirname, "..")));

// Room storage
const rooms = new Map();

// 6-character room code
function generateRoomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {
        code = "";

        for (let i = 0; i < 6; i++) {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }

    } while (rooms.has(code));

    return code;
}


// ================= SOCKET CONNECTION =================

io.on("connection", (socket) => {

    console.log("👤 User connected:", socket.id);


    // ================= CREATE ROOM =================

    socket.on("create-room", () => {

        const roomCode = generateRoomCode();

        rooms.set(roomCode, {
            host: socket.id,

            isPlaying: false,

            currentTime: 0,

            // কখন currentTime update হয়েছে
            lastUpdate: Date.now()
        });

        socket.join(roomCode);

        socket.roomCode = roomCode;

        socket.emit("room-created", {
            roomCode: roomCode
        });

        io.to(roomCode).emit("user-count", {
            count:
                io.sockets.adapter.rooms.get(roomCode)?.size || 0
        });

        console.log("🌙 Room created:", roomCode);
    });


    // ================= JOIN ROOM =================

    socket.on("join-room", (roomCode) => {

        roomCode = roomCode.toUpperCase();

        const room = rooms.get(roomCode);

        if (!room) {

            socket.emit(
                "room-error",
                "Room not found!"
            );

            return;
        }


        // যদি room এখন playing থাকে,
        // তাহলে last update-এর পর যত সময় গেছে
        // সেটা currentTime-এর সাথে যোগ হবে।

        let currentTime = room.currentTime;

        if (room.isPlaying) {

            const elapsed =
                (Date.now() - room.lastUpdate) / 1000;

            currentTime += elapsed;
        }


        socket.join(roomCode);

        socket.roomCode = roomCode;


        // নতুন user-কে current অবস্থার তথ্য পাঠানো
        socket.emit("room-joined", {

            roomCode: roomCode,

            isPlaying: room.isPlaying,

            currentTime: currentTime
        });


        // সবাইকে updated user count
        io.to(roomCode).emit("user-count", {

            count:
                io.sockets.adapter.rooms.get(roomCode)?.size || 0
        });


        console.log(
            "👥 User joined room:",
            roomCode
        );
    });


    // ================= PLAY =================

    socket.on("play", (data) => {

        const roomCode = socket.roomCode;

        if (!roomCode || !rooms.has(roomCode)) {
            return;
        }


        const room = rooms.get(roomCode);


        room.isPlaying = true;

        room.currentTime = data.currentTime;

        room.lastUpdate = Date.now();


        socket.to(roomCode).emit(
            "sync-play",
            {
                currentTime: data.currentTime
            }
        );
    });


    // ================= PAUSE =================

    socket.on("pause", (data) => {

        const roomCode = socket.roomCode;

        if (!roomCode || !rooms.has(roomCode)) {
            return;
        }


        const room = rooms.get(roomCode);


        room.isPlaying = false;

        room.currentTime = data.currentTime;

        room.lastUpdate = Date.now();


        socket.to(roomCode).emit(
            "sync-pause",
            {
                currentTime: data.currentTime
            }
        );
    });


    // ================= SEEK =================

    socket.on("seek", (data) => {

        const roomCode = socket.roomCode;

        if (!roomCode || !rooms.has(roomCode)) {
            return;
        }


        const room = rooms.get(roomCode);


        room.currentTime = data.currentTime;

        room.lastUpdate = Date.now();


        socket.to(roomCode).emit(
            "sync-seek",
            {
                currentTime: data.currentTime
            }
        );
    });



        socket.on("reaction", (data) => {
        const roomCode = socket.roomCode;

        if (!roomCode || !rooms.has(roomCode)) return;

        socket.to(roomCode).emit("sync-reaction", {
            emoji: data.emoji
        });
    });

    
    socket.on("chat-message", (data) => {
        const roomCode = socket.roomCode;

        if (!roomCode || !rooms.has(roomCode)) return;

        io.to(roomCode).emit("new-chat-message", {
            message: data.message,
            senderId: socket.id
        });
    });

    // ================= DISCONNECT =================

    socket.on("disconnect", () => {

        console.log(
            "❌ User disconnected:",
            socket.id
        );


        const roomCode = socket.roomCode;

        if (!roomCode) {
            return;
        }


        const room = rooms.get(roomCode);

        if (!room) {
            return;
        }


        // Host চলে গেলে room delete
        if (room.host === socket.id) {

            rooms.delete(roomCode);

            console.log(
                "🗑️ Room deleted:",
                roomCode
            );

        } else {

            setTimeout(() => {

                io.to(roomCode).emit(
                    "user-count",
                    {
                        count:
                            io.sockets.adapter.rooms.get(
                                roomCode
                            )?.size || 0
                    }
                );

            }, 100);
        }
    });

});


// ================= START SERVER =================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌙 SleepStory server running on port ${PORT}`);
});