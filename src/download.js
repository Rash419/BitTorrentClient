'use strict';
const net = require('net');
const tracker = require('./tracker');
const message = require('./message');
const Pieces = require('./Pieces');
const Queue = require('./Queue');
const fs = require('fs');
const progressBar = require('./progressbar');
let firstPiece = false;

module.exports = (torrent, path) => {
    tracker.getPeers(torrent, peers => {
        const pieces = new Pieces(torrent);
        const file = fs.openSync(path, 'w');
        peers.forEach(peer => download(peer, torrent, pieces, file));
    });
};

function download(peer, torrent, pieces, file) {
    const queue = new Queue(torrent);
    const socket = new net.Socket();
    socket.on('error', err => {
        //console.log(err);
    });

    socket.connect(peer.port, peer.ip.replace(/,/g, '.'), () => {
        socket.write(message.buildHandshake(torrent));
        //console.log('Handshake has been done');
    });
    onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue, torrent, file));
}

function msgHandler(msg, socket, pieces, queue, torrent, file) {
    if (isHandshake(msg)) {
        socket.write(message.buildInterested());
        //console.log('Interested request has been sent');
    } else {
        const m = message.parse(msg);
        if (m.id === 0) chokeHandler(socket);
        if (m.id === 1) unchokeHandler(socket, pieces, queue);
        if (m.id === 4) haveHandler(m.payload, socket, pieces, queue);
        if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
        if (m.id === 7) pieceHandler(socket, pieces, queue, torrent, file, m.payload);
    }
}
function haveHandler(payload, socket, pieces, queue) {
    const pieceIndex = payload.readUInt32BE(0);
    const queueEmpty = queue.length === 0;
    queue.queue(pieceIndex);
    if (queueEmpty) {
        requestPiece(socket, pieces, queue);
    }
}
function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
    //console.log(pieceResp);
    pieces.addReceived(pieceResp);

    const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
    fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => { });

    if (pieces.isDone()) {
        socket.end();
        console.log('DONE!');
        progressBar.stopProgressBar();
    } else {
        requestPiece(socket, pieces, queue);
    }
    if (!firstPiece) {
        progressBar.startProgressBar(pieces.getTotalBlocks());
        firstPiece = true;
    } else {
        progressBar.updateProgressBar(pieces.getDownloadedBlocks());
    }
}
function chokeHandler(socket) {
    socket.end();
}
function unchokeHandler(socket, pieces, queue) {
    queue.choked = false;
    requestPiece(socket, pieces, queue);
}
function requestPiece(socket, pieces, queue) {
    if (queue.choked) return null;

    while (queue.length()) {
        const pieceBlock = queue.deque();
        if (pieces.needed(pieceBlock)) {
            socket.write(message.buildRequest(pieceBlock));
            pieces.addRequested(pieceBlock);
            break;
        }
    }
}
function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1, 20) === 'BitTorrent protocol';
}

function onWholeMsg(socket, callback) {
    let savedBuff = Buffer.alloc(0);
    let handshake = true;

    socket.on('data', recvBuff => {
        //console.log('got some data');
        //msgLen calculates the length of whole message
        const msgLen = () => handshake ? savedBuff.readUInt8(0) + 49 : savedBuff.readUInt32BE(0) + 4;
        savedBuff = Buffer.concat([savedBuff, recvBuff]);

        while (savedBuff.length >= 4 && savedBuff.length >= msgLen()) {
            callback(savedBuff.slice(0, msgLen()));
            savedBuff = savedBuff.slice(msgLen());
            handshake = false;
        }
    });
}

function bitfieldHandler(socket, pieces, queue, payload) {
    const queueEmpty = queue.length === 0;
    payload.forEach((byte, i) => {
        for (let j = 0; j < 8; j++) {
            if (byte % 2) queue.queue(i * 8 + 7 - j);
            byte = Math.floor(byte / 2);
        }
    });
    if (queueEmpty) requestPiece(socket, pieces, queue);
}
