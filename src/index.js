var ArrayKeys = require('array-keys');

var RESERVED_BYTES = 8;

var files = new ArrayKeys({
    identifier: 'uid'
});

// we reserve 4 bytes for the UID, so we can have a max number of 65535
function genUID() {
    return Math.floor((Math.random() * 65535) + 1);
}

function BDT(metadata) {
    if (typeof metadata !== 'object') { throw new Error('metadata object must be passed in'); }

    var totalChunks, payloadSize;
    
    if (! metadata.fileName) { throw new Error('no fileName specified'); }
    if (! metadata.mimeType) { throw new Error('no mimeType specified'); }
    if (! metadata.chunkSize) { throw new Error('no chunkSize specified'); }
    if ((metadata.arrayBuffer) && 
       ((typeof metadata.arrayBuffer.toString !== 'function') || (metadata.arrayBuffer.toString() !== '[object ArrayBuffer]'))) { 
        throw new Error('arrayBuffer must be an actual ArrayBuffer object'); 
    } else if ((! metadata.arrayBuffer) && (! metadata.uid)) { 
        throw new Error('arrayBuffer or uid must be specified');
    } else if ((metadata.arrayBuffer) && (metadata.uid)) {
        throw new Error('cannot manually assign uid');
    } else if (! metadata.uid) {
        // we have an arrayBuffer, so we create a UID  
        metadata.uid = genUID();
    } else if (metadata.arrayBuffer) {
        // we have an arrayBuffer, so let's calc total number of chunks
        payloadSize = (metadata.chunkSize - RESERVED_BYTES)
        totalChunks = Math.ceil(metadata.arrayBuffer.byteLength / payloadSize);
    }

    this._metadata = {
        uid: metadata.uid,
        fileName: metadata.fileName,
        mimeType: metadata.mimeType,
        chunkSize: metadata.chunkSize,
        payloadSize: payloadSize,
        reservedSize: RESERVED_BYTES,
        fileSize: (metadata.arrayBuffer) ? metadata.arrayBuffer.byteLength : 0,
        totalChunks: (totalChunks) ? totalChunks : (metadata.totalChunks) ? metadata.totalChunks : 0
        // TODO calc checksums for every chunk
    };
    
    this._arrayBuffer = (metadata.arrayBuffer) ? metadata.arrayBuffer : null,
    this._chunksProcessed = 0;
}

BDT.prototype.getUID = function () {
    return this._metadata.uid;
};

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
    var start = (this._metadata.payloadSize * (typeof num === 'number') ? num : this._chunksProcessed) - this._metadata.payloadSize;
    if (start >= this._metadata.fileSize) {
        return undefined;
    }
    var end = start + this._payloadSize;
    end = (end > this._metadata.fileSize) ? this._metadata.fileSize : end;
    
    if (! num) {
        this._chunksProcessed += 1;
    }
    
    var ab = new ArrayBuffer(this._metadata.chunkSize);
    var view = new DataView(ab);
    view.setInt16(0, this._metadata.uid);
    view.setInt16(4, num);
    new Uint8Array(ab, 0, ab.byteLength).set(new Uint8Array(this._arrayBuffer.slice(start, end)), 8);
    
    // TODO add header data before returning chunk
    return ab;
};

module.exports = BDT;