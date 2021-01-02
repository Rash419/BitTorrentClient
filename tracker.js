'use strict';
const dgram = require('dgram');
const url = require('url');
const crypto = require('crypto');
const util = require('./util');

module.exports.getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4');
    const parsedUrl = url.parse(torrent.announce.toString('utf8'));

    //1. send connect request
    udpSend(socket, buildConnReq(), url);
    if (respType(response) === 'connect') {
        //2. receive and parse response
        const connResp = parseConnResp(response);
        //3. send announce request
        const annouceReq = buildAnnounceReq(connResp.connectionId);
        udpSend(socket, annouceReq, url);
    } else if (respType(response) === 'announce') {
        //4. parse announce response
        const announceResp = parseAnnounceResp(response);
        //5. pass peers to callback
        callback(announceResp.peers);
    }
}

function buildConnReq() {
    const buff = Buffer.alloc(16);
    //connectionId
    buff.writeUInt32BE(0x417, 0);
    buff.writeUInt32BE(0x27101980, 4);
    //action
    buff.writeUInt32BE(0, 8);
    //transactionId
    crypto.randomBytes(4).copy(buff, 12);
    return buff;
}

function parseConnResp(resp) {
    return {
        action: resp.readUInt32BE(0),
        transactionId: resp.readUInt32BE(4),
        connectionId: resp.slice(8),
    }
}

function buildAnnounceReq(connId, torrent, port = 6969) { //Nice ;D
    const buff = Buffer.alloc(98);

    //connectionId
    connId.copy(buff, 0);

    //action
    buff.writeUInt32BE(1, 8);

    //transactionId
    crypto.randomBytes(4).copy(buff, 12);

    //info-hash
    //...

    //peer-Id
    util.genId().copy(buff, 36);

    //downloaded
    buff.alloc(8).copy(buff, 56);

    //left
    buff.alloc(8).copy(buff, 64);

    //uploaded
    buff.alloc(8).copy(buff, 72);

    //event
    buff.writeUInt32BE(0, 80);

    //ip address
    buff.writeUInt32BE(0, 84);

    //key 
    crypto.randomBytes(4).copy(buff, 88);

    //num want
    buff.writeInt32BE(-1, 92);

    //port
    buff.writeInt16BE(port, 96);
    return buff;
}