'use strict';

const crypto = require('crypto');

let id = null;

module.exports = {
    genId :() => {
        if(!id) {
           id = crypto.randomBytes(20);
           Buffer.from('-RP0001-').copy(id,0);
        }
        return id;
    },
    group : (iterable,groupSize)=> {
        let groups = [];
        for(let i=0;i< iterable.length;i+=groupSize) {
            groups.push(iterable.slice(i,i+groupSize));
        }
        return groups;
    }

}
