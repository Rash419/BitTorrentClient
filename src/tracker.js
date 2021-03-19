'use strict';
const dgram = require('dgram');
const url = require('url');
const crypto = require('crypto');
const util = require('./util');
const torrentParser = require('./torrent-parser');

//TODO : make a function that repeats both announce and connection request, right now it is implemented for connection request

module.exports.getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4');
    const trackerUrl = torrent.announce.toString('utf8');

    function changeTimeInterval(n) {
        return 15 * Math.pow(2, n) * 1000;
    }
    //1. send connect request
    let delay = 0;
    let n = 0;
    let timerId = setTimeout(function sendUdp() {
        udpSend(socket, buildConnReq(), trackerUrl, 'Connection');
        delay = changeTimeInterval(n);
        n++;
        timerId = setTimeout(sendUdp, delay);
    }, delay);

    socket.on('listening', () => {
        const address = socket.address();
        console.log(`socket listening ${address.address}:${address.port}`);
    });

    socket.on('error', (err) => {
        console.log(`server error:\n${err.stack}`);
        server.close();
    });

    socket.on('message', (response, rinfo) => {
        //console.log(`server got: ${response} from ${rinfo.address}:${rinfo.port}`);
        if (respType(response) === 'connect') {
            clearTimeout(timerId);
            //2. receive and parse response
            console.log('Received connection response');
            const connResp = parseConnResp(response);
            //3. send announce request
            const annouceReq = buildAnnounceReq(connResp.connectionId, torrent);
            udpSend(socket, annouceReq, trackerUrl, 'Announce');

        } else if (respType(response) === 'announce') {
            console.log('Received announce response');
            //4. parse announce response
            const announceResp = parseAnnounceResp(response);
            //5. pass peers to callback
            callback(announceResp.peers);
        }
    })
}

function udpSend(socket, message, rawUrl, requestType, callback = (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`${requestType} request has been sent successfully`);
    }
}) {
    const parsedUrl = url.parse(rawUrl);
    // console.log(parsedUrl);
    // console.log(message);
    socket.send(message, 0, message.length, parsedUrl.port, parsedUrl.hostname, callback);
}

function buildConnReq() {
    const buff = Buffer.allocUnsafe(16);
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

function buildAnnounceReq(connId, torrent, port = 6881) { //Nice ;D
    const buff = Buffer.allocUnsafe(98);

    //connectionId
    connId.copy(buff, 0);

    //action
    buff.writeUInt32BE(1, 8);

    //transactionId
    crypto.randomBytes(4).copy(buff, 12);

    //info-hash
    torrentParser.infoHash(torrent).copy(buff, 16);

    //peer-Id
    util.genId().copy(buff, 36);

    //downloaded
    Buffer.allocUnsafe(8).copy(buff, 56);

    //left
    torrentParser.size(torrent).copy(buff, 64);

    //uploaded
    Buffer.allocUnsafe(8).copy(buff, 72);

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

function parseAnnounceResp(resp) {
    return {
        action: resp.readUInt32BE(0),
        transactionId: resp.readUInt32BE(4),
        interval: resp.readUInt32BE(8),
        leechers: resp.readUInt32BE(12),
        seeders: resp.readUInt32BE(16),
        peers: util.group(resp.slice(20), 6).map(address => {
            return {
                ip: address.slice(0, 4).join(','),
                port: address.readUInt16BE(4),
            }
        })
    }
}

function respType(resp) {
    const action = resp.readUInt32BE(0);
    if (action === 0) return 'connect';
    else if (action === 1) return 'announce';
}