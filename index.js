"use strict";

const torrentParser = require('./src/torrent-parser');
const download = require('./src/download');
const torrent = torrentParser.open('./manjaro.torrent');
//console.log(torrent);
download(torrent,torrent.info.name);

