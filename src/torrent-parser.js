const bencode = require('bencode');
const fs = require('fs');
const crypto = require('crypto');
const bignum = require('bignum');

module.exports = {
    open : function(filepath) {
        return bencode.decode(fs.readFileSync(filepath));
    },

    infoHash: function(torrent) {
        const info = bencode.encode(torrent.info);
        return crypto.createHash('sha1').update(info).digest();
    },

    size: function(torrent) {
        const size = torrent.info.files ?
            torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
            torrent.info.length;

        return bignum.toBuffer(size, { size: 8 });
    },

    BLOCK_LEN: Math.pow(2, 14),

    pieceLen: function(torrent, pieceIndex) {
        const pieceLength = torrent.info['piece length'];
        const totalLength = bignum.fromBuffer(this.size(torrent)).toNumber();
        const lastPieceLength = totalLength % pieceLength;
        const lastPieceIndex = Math.floor(totalLength / pieceLength);

        return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
    },

    blockLen: function(torrent, pieceIndex, blockIndex) {
        const pieceLength = this.pieceLen(torrent, pieceIndex);
        const lastPieceLength = pieceLength % this.BLOCK_LEN;
        const lastPieceIndex = Math.floor(pieceLength / this.BLOCK_LEN);

        return blockIndex === lastPieceIndex ? lastPieceLength : this.BLOCK_LEN;
    },

    blocksPerPiece: function(torrent, pieceIndex) {
        const pieceLength = this.pieceLen(torrent, pieceIndex);
        return Math.ceil(pieceLength / this.BLOCK_LEN);
    }
}