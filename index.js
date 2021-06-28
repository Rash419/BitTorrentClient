"use strict";
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const askTorrentFilePath = () => {
    const questions = [
      {
        name: 'torrentPath',
        type: 'input',
        message: 'Enter the path to your torrent file:',
        validate: function( value ) {
          if (value.length && fs.existsSync(value)) {
            return true;
          } else {
            return 'Entered path is invalid';
          }
        }
      },
    ];
    return inquirer.prompt(questions);
}
clear();

console.log(
  chalk.yellow(
    figlet.textSync('Bitorrent Client', { horizontalLayout: 'full' })
  )
);

const run = async () => {
    const ans = await askTorrentFilePath();
    const torrentParser = require('./src/torrent-parser');
    const download = require('./src/download');
    const torrent = torrentParser.open(ans.torrentPath);
    download(torrent,torrent.info.name);
};

run();


