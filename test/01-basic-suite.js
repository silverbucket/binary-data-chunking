if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require', './FileHelper.js'], function (require, FH) {
    return [
        {
            desc: 'basic tests',
            setup: function (env, test) {
                env.BDT = require('./../src/index');
                var ab = FH.getFile('test.mp4');
                env.sender = new env.BDT({
                    fileName: 'test.mp4',
                    mimeType: 'video/mp4',
                    arrayBuffer: ab,
                    chunkSize: 16000
                });
                env.totalChunks = env.sender.getTotalChunks();
                test.assertAnd((env.sender.getUID() < 65536) && (env.sender.getUID() > 0), true);
                test.assert(env.sender.getFileSize(), 1055736);
            },
            tests: [
                {
                    desc: '# create receiver',
                    run: function (env, test) {
                        env.receiver = new env.BDT(env.sender.getMetadata());
                        test.assert(env.receiver.getTotalChunks(), env.totalChunks);
                    }
                }
            ]
        }
    ]
});