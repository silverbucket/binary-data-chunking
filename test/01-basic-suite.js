if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require', './FileHelper.js'], function (require, FH) {
    return [
        {
            desc: 'basic tests',
            setup: function (env, test) {
                if (typeof BinaryDataChunking === 'function') {
                    env.BDC = BinaryDataChunking;
                } else {
                    env.BDC = require('./../src/index'); 
                }

                // 16000 chunk size, 67 chunks
                FH.getFile('test.mp4', function (ab) {
                    env.sender = new env.BDC({
                        name: 'test.mp4',
                        mimeType: 'video/mp4',
                        arrayBuffer: ab,
                        chunkSize: 16000
                    });
                    env.totalChunks = 67;
                    test.assertType(env.sender.getMetadata, 'function');
                });
            },
            tests: [
                {
                    desc: '# verify sender properties',
                    run: function (env, test) {
                        test.assertAnd((env.sender.getUID() < 65536) && (env.sender.getUID() > 0), true);
                        // console.log('UID: ' + env.sender.getUID());
                        test.assertAnd(env.sender.getChecksum(), 'd55bddf8d62910879ed9f605522149a8');
                        test.assertAnd(env.sender.getFileSize(), 1055736);
                        test.assert(env.sender.getTotalChunks(), env.totalChunks);    
                    }
                },
                {
                    desc: '# create receiver',
                    run: function (env, test) {
                        env.receiver = new env.BDC(env.sender.getMetadata());
                        test.assert(env.receiver.getTotalChunks(), env.totalChunks);
                    }
                },
                {
                    desc: '# get first chunk and verify positioning',
                    run: function (env, test) {
                        var chunk = env.sender.getChunk();
                        test.assertAnd(chunk.byteLength, 16000)
                        env.BDC.submitChunk(chunk);
                        test.assert(env.sender.getPosition(), 1);      
                    }
                },
                {
                    desc: '# check receiver position',
                    run: function (env, test) {
                        test.assert(env.receiver.getPosition(), 1);
                    }
                },
                {
                    desc: '# get ordered chunks',
                    run: function (env, test) {
                        env.sender.forEachChunk(function (chunk, pos) {
                            if (pos < 67) {
                                test.assertAnd(chunk.byteLength, 16000);
                            }
                            env.BDC.submitChunk(chunk);
                        }, function () {
                            // done
                            test.assert(env.sender.getPosition(), env.totalChunks);
                        });
                    }
                },
                {
                    desc: '# check receiver position number',
                    run: function (env, test) {
                        test.assert(env.receiver.getPosition(), 67);
                    }
                },
                {
                    desc: '# check receiver position number',
                    run: function (env, test) {
                        test.assert(env.receiver.getPosition(), 67);
                    }
                },
                {
                    desc: '# get file and get md5sum',
                    run: function (env, test) {
                        env.receiver.getFile(function (file, checksum) {
                            test.assertAnd(file.byteLength, env.sender._arrayBuffer.byteLength);
                            test.assert(checksum, env.sender.getChecksum());
                        });
                    }
                },
                {
                    desc: '# delete',
                    run: function (env, test) {
                        env.receiver.getFile(function (file, checksum) {
                            try {
                                env.sender.clearData();
                            } catch (e) {
                                test.fail(e);
                            }
                            try {
                                env.receiver.clearData();
                            } catch (e) {
                                test.fail(e);
                            }
                            test.assertType(env.sender._arrayBuffer, 'undefined');
                        });
                    }
                }
            ]
        }
    ]
});