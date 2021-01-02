'use strict';
const dgram = require('dgram');
const buffer = require('buffer');
const url = require('url');

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
    } else if( respType(response) === 'announce') {
        //4. parse announce response
        const announceResp = parseAnnounceResp(response);
        //5. pass peers to callback
        callback(announceResp.peers);
    }
}