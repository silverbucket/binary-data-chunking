var ArrayKeys = require('array-keys');
var randToken = require('rand-token');

var files = new ArrayKeys({
    identifier: 'uid'
});

function BDT(metadata = {}) {
    var {filename, mimeType, arrayBuffer, chunkSize, uid} = metadata;
    var totalChunks;
    
    if (! filename) { throw new Error('no filename specified'); }
    if (! mimeType) { throw new Error('no mimeType specified'); }
    if (! chunkSize) { throw new Error('no chunkSize specified'); }
    if ((arrayBuffer) && 
       ((typeof arrayBuffer.toString !== 'function') || (arrayBuffer.toString() !== '[object ArrayBuffer]'))) { 
        throw new Error('arrayBuffer must be an actual ArrayBuffer object'); 
    } else if ((! arrayBuffer) && (! uid)) { 
        throw new Error('arrayBuffer or uid must be specified');
    } else if ((arrayBuffer) && (uid)) {
        throw new Error('cannot manually assign uid');
    } else if (! uid) {
        // we have an arrayBuffer, so we create a UID  
        uid = randToken.uid(4);
    } else if (arrayBuffer) {
        // we have an arrayBuffer, so let's calc total number of chunks
        totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);
    }

    this._metadata = {
        uid: uid,
        filename: filename,
        mimeType: mimeType,
        chunkSize: chunkSize,
        fileSize: (arrayBuffer) ? arrayBuffer.byteLength : 0,
        arrayBuffer: (arrayBuffer) ? arrayBuffer : null,
        totalChunks: (totalChunks) ? totalChunks : 0
        // TODO calc checksums for every chunk
    };
    
    this._chunksProcessed = 0;
}

BDT.prototype.onChunkReceived = function () {};

BDT.prototype.onCompleted = function () {};

BDT.prototype.getMetadata = function () {
    return this._metadata;
};

BDT.prototype.getFileSize = function () {
    return this._metadata.fileSize;
};

BDT.prototype.getTotalChunks = function () {
    return this._metadata.totalChunks;
};

BDT.prototype.getChecksum = function () {};

BDT.prototype.getChunk = function (num) {
    var start = (this._metadata.chunkSize * (typeof num === 'number') ? num : this._chunksProcessed) - this._metadata.chunkSize;
    if (start >= this._metadata.fileSize) {
        return undefined;
    }
    var end = start + this._chunkSize;
    end = (end > this._metadata.fileSize) ? this._metadata.fileSize : end;
    
    if (! num) {
        this._chunksProcessed += 1;
    }
    
    // TODO add header data before returning chunk
    return this._metadata.arrayBuffer.slice(start, end);
};