'use strict';
const torrentParser = require('./torrent-parser');
const util = require('./util');

module.exports = {
    buildHandshake: torrent => {
        const buff = Buffer.alloc(68);
        //pstrlen
        buff.writeUInt8(19, 0);
        //pstr
        buff.write('BitTorrent protocol', 1);
        //reserved
        buff.writeUInt32BE(0, 20);
        buff.writeUInt32BE(0, 24);
        //infohash
        torrentParser.infoHash(torrent).copy(buff, 28);
        //peer id
        util.genId().copy(buff, 48);
        return buff;
    },

    buildKeepAlive: () => Buffer.alloc(4),

    buildChoke: () => {
        const buff = Buffer.alloc(5);
        //len
        buff.writeUInt32BE(1, 0);
        //id
        buff.writeUInt8(0, 4);
        return buff;
    },

    buildUnchoke: () => {
        const buff = Buffer.alloc(5);
        //len
        buff.writeUInt32BE(1, 0);
        //id
        buff.writeUInt8(1, 4);
        return buff;
    },

    buildInterested: () => {
        const buff = Buffer.alloc(5);
        //len
        buff.writeUInt32BE(1, 0);
        //id
        buff.writeUInt8(2, 4);
        return buff;
    },

    buildUninterested: () => {
        const buff = Buffer.alloc(5);
        //len
        buff.writeUInt32BE(1, 0);
        //id
        buff.writeUInt8(3, 4);
        return buff;
    },

    buildHave: payload => {
        const buff = Buffer.alloc(9);
        //len
        buff.writeUInt32BE(5, 0);
        //id
        buff.writeUInt8(4, 4);
        //piece index
        buff.writeUInt32BE(payload, 5);
        return buff;
    },

    buildBitfield: (bitfield, payload) => {
        const buff = Buffer.alloc(14);
        // length
        buff.writeUInt32BE(payload.length + 1, 0);
        // id
        buff.writeUInt8(5, 4);
        // bitfield
        bitfield.copy(buff, 5);
        return buff;
    },

    buildRequest: payload => {
        const buff = Buffer.alloc(17);
        // length
        buff.writeUInt32BE(13, 0);
        // id
        buff.writeUInt8(6, 4);
        // piece index
        buff.writeUInt32BE(payload.index, 5);
        // begin
        buff.writeUInt32BE(payload.begin, 9);
        // length
        buff.writeUInt32BE(payload.length, 13);
        return buff;
    },

    buildPiece: payload => {
        const buff = Buffer.alloc(13 + payload.block.length);
        // length
        buff.writeUInt32BE(payload.block.length + 9, 0);
        // id
        buff.writeUInt8(7, 4);
        // piece index
        buff.writeUInt32BE(payload.index, 5);
        // begin
        buff.writeUInt32BE(payload.begin, 9);
        // block
        payload.block.copy(buff, 13);
        return buff;
    },

    buildCancel: payload => {
        const buff = Buffer.alloc(17);
        //length
        buff.writeUInt32BE(13, 0);
        //id
        buff.writeUInt8(8, 4);
        //index
        buff.writeUInt32BE(payload.index, 5);
        //begin
        buff.writeUInt32BE(payload.begin, 9);
        //payload length
        buff.writeUInt32BE(payload.length, 13);
        return buff;
    },

    buildPort: payload => {
        const buff = Buffer.alloc(7);
        //len
        buff.writeUInt32BE(3, 0);
        //id
        buff.writeUInt8(9, 4);
        //listen port
        buff.writeUInt16BE(payload, 5);
        return buff;
    },

    parse: msg => {
        const id = msg.length > 4 ? msg.readInt8(4) : null;
        let payload = msg.length > 5 ? msg.slice(5) : null;
        if (id === 6 || id === 7 || id === 8) {
            const rest = payload.slice(8);
            payload = {
                index: payload.readInt32BE(0),
                begin: payload.readInt32BE(4)
            };
            payload[id === 7 ? 'block' : 'length'] = rest;
        }

        return {
            size: msg.readInt32BE(0),
            id: id,
            payload: payload
        }
    }
}