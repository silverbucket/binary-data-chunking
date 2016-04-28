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
                    test.assertType(env.sender.getFile, 'function');
                });
            },
            tests: [
                {
                    desc: '# verify sender properties',
                    run: function (env, test) {
                        test.assertAnd((env.sender.uid < 65536) && (env.sender.uid > 0), true);
                        // console.log('UID: ' + env.sender.getUID());
                        test.assertAnd(env.sender.checksum, 'd55bddf8d62910879ed9f605522149a8');
                        test.assertAnd(env.sender.fileSize, 1055736);
                        test.assert(env.sender.totalChunks, env.totalChunks);    
                    }
                },
                {
                    desc: '# create receiver',
                    run: function (env, test) {
                        env.receiver = new env.BDC(env.sender.getMetadata());
                        test.assert(env.receiver.totalChunks, env.totalChunks);
                    }
                },
                {
                    desc: '# create transfer object',
                    run: function (env, test) {
                        env.sto = env.sender.getTransferObject();
                        test.assertTypeAnd(env.sto, 'object');
                        test.assertType(env.sto.currentIndex, 'number');
                    }
                },
                {
                    desc: '# get first chunk, verify positioning, packed size and payload size',
                    run: function (env, test) {
                        var chunk = env.sto.getChunk();
                        test.assertAnd(chunk.byteLength, 16000)
                        env.BDC.submitChunk(chunk);
                        test.assertAnd(env.sto.currentIndex, 1);      
                        test.assertAnd(env.sender.chunkSize, chunk.byteLength);  
                        // get payload
                        var payload = env.BDC.unpack(chunk)[2];
                        test.assert(env.sender.payloadSize, payload.byteLength);         
                    }
                },
                {
                    desc: '# check receiver position',
                    run: function (env, test) {
                        test.assert(env.receiver.chunksReceived, 1);
                    }
                },
                {
                    desc: '# get ordered chunks',
                    run: function (env, test) {
                        env.sto.forEachChunk(function (chunk, pos) {
                            console.log('foreach [' + pos + '] ' + chunk.byteLength);
                            if (pos < env.totalChunks - 1) {
                                test.assertAnd(chunk.byteLength, 16000);
                            }
                            env.BDC.submitChunk(chunk);
                        }, function () {
                            // done
                            test.assert(env.sto.currentIndex, env.totalChunks);
                        });
                    }
                },
                {
                    desc: '# check receiver position number',
                    run: function (env, test) {
                        test.assert(env.receiver.chunksReceived, 67);
                    }
                },
                {
                    desc: '# get file and get md5sum',
                    run: function (env, test) {
                        env.receiver.getFile(function (file, checksum) {
                            test.assertAnd(file.byteLength, env.sender._arrayBuffer.byteLength);
                            test.assert(checksum, env.sender.checksum);
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