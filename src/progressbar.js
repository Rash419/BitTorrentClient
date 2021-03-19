const cliProgress = require('cli-progress');

const downloadBar = new cliProgress.Bar({}, cliProgress.Presets.shades_grey);

module.exports = {
    startProgressBar: function (totalBlocks) {
        downloadBar.start(totalBlocks,0);
    },

    updateProgressBar: function (downloadedBlocks) {
        downloadBar.update(downloadedBlocks)
    },

    stopProgressBar: function () {
        downloadBar.stop();
    }
}