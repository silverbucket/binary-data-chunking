var ArrayKeys = require('array-keys');
var SparkMD5 = require('spark-md5');

var RESERVED_BYTES = 8;
var UID_OFFSET = 0;
var POSITION_OFFSET = 4;

var fileChunks = new ArrayKeys({
    identifier: 'uid'
});

// we reserve 4 bytes for the UID, so we can have a max number of 65535
function genUID() {
    return Math.floor((Math.random() * 65535) + 1);
}

function appendBuffer(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set( new Uint8Array(buffer1), 0 );
  tmp.set( new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

function BDC(metadata) {
    var totalChunks, payloadSize, checksum;
    if (typeof metadata !== 'object') { throw new Error('metadata object must be passed in'); }
    if (! metadata.name) { throw new Error('no name specified'); }
    if (! metadata.mimeType) { throw new Error('no mimeType specified'); }
    if (! metadata.chunkSize) { throw new Error('no chunkSize specified'); }
    if ((metadata.arrayBuffer) && 
       ((typeof metadata.arrayBuffer.toString !== 'function') || (metadata.arrayBuffer.toString() !== '[object ArrayBuffer]'))) { 
        throw new Error('arrayBuffer must be an actual ArrayBuffer object'); 
    } else if ((! metadata.arrayBuffer) && (! metadata.uid)) { 
        throw new Error('arrayBuffer or uid must be specified');
    } else if ((metadata.arrayBuffer) && (metadata.uid)) {
        throw new Error('cannot manually assign uid');
    } 
    if (! metadata.uid) {
        // we have an arrayBuffer, so we create a UID  
        metadata.uid = genUID();
    } 
    if (metadata.arrayBuffer) {
        // this is a sender
        // we have an arrayBuffer, so let's calc total number of chunks
        payloadSize = (metadata.chunkSize - RESERVED_BYTES)
        totalChunks = Math.ceil(metadata.arrayBuffer.byteLength / payloadSize);
        checksum = SparkMD5.ArrayBuffer.hash(metadata.arrayBuffer);
    } else {
        checksum = metadata.checksum;
    }

    this.uid = metadata.uid;
    this._metadata = {
        uid: metadata.uid,
        name: metadata.name,
        mimeType: metadata.mimeType,
        chunkSize: metadata.chunkSize,
        payloadSize: payloadSize,
        reservedSize: RESERVED_BYTES,
        fileSize: (metadata.arrayBuffer) ? metadata.arrayBuffer.byteLength : 0,
        totalChunks: (totalChunks) ? totalChunks : (metadata.totalChunks) ? metadata.totalChunks : 0,
        checksum: checksum
        // TODO calc checksums for every chunk
    };
    
    this._arrayBuffer = (metadata.arrayBuffer) ? metadata.arrayBuffer : null,
    this._chunksProcessed = 0;
    this._chunks = [];

    if (! metadata.arrayBuffer) {
        fileChunks.addRecord(this);
    }
}

BDC.prototype.getMetadata = function () {
    return this._metadata;
};

BDC.prototype.getUID = function () {
    return this.uid;
};

BDC.prototype.getFileSize = function () {
    return this._metadata.fileSize;
};

BDC.prototype.getTotalChunks = function () {
    return this._metadata.totalChunks;
};

BDC.prototype.getChecksum = function () {
    return this._metadata.checksum;
};

BDC.prototype.getGeneratedChecksum = function () {
    return this._metadata.generatedChecksum;
};

BDC.prototype.getFile = function (cb) {
    this._arrayBuffer = this._chunks[0];
    for (var i = 1; i < this._chunks.length; i += 1) {
        // console.log('buffer; ' + this._arrayBuffer.byteLength);
        this._arrayBuffer = appendBuffer(this._arrayBuffer, this._chunks[i]);
    }
    this._metadata.generatedChecksum = SparkMD5.ArrayBuffer.hash(this._arrayBuffer);
    cb(this._arrayBuffer, this._metadata.generatedChecksum);
};

BDC.prototype.onChunkReceived = function () {};

BDC.prototype.onCompleted = function () {};

BDC.prototype.getPosition = function () {
    return this._chunksProcessed;    
};

BDC.prototype.forEachChunk = function (cb, end) {
    var chunk;
    for (var i = 0; i < this._metadata.totalChunks; i += 1) {
        if (chunk = this.getChunk()) {
            cb(chunk, this.getPosition());
        } else {
            end();
        }
    }
};

BDC.prototype.getChunk = function (num) {
    var _adjustedPosition = this._chunksProcessed + 1
    if (typeof num === 'number') {
        if (num <= 0) {
            return undefined;
        } else {
            _adjustedPosition = num;
        }    
    } else {
        num = undefined;
    }
    
    var start = (this._metadata.payloadSize * _adjustedPosition) - this._metadata.payloadSize;
    if (start >= this._metadata.fileSize) {
        return undefined;
    }
    var end = start + this._metadata.payloadSize;
    end = (end > this._metadata.fileSize) ? this._metadata.fileSize : end;
    
    var payload = this._arrayBuffer.slice(start, end);
    var chunk = BDC.__pack(this._metadata.uid, _adjustedPosition, payload);
    
    if (! num) {
        this._chunksProcessed += 1;
    }
    
    return chunk;
};

BDC.prototype.clearData = function () {
    fileChunks.removeRecord(this.uid);
    delete this._arrayBuffer;
    delete this._metadata;  
    delete this;
};

BDC.__pack = function (uid, pos, ab) {
    var chunk = new ArrayBuffer(ab.byteLength + RESERVED_BYTES);
    var view = new DataView(chunk);
    view.setInt32(UID_OFFSET, uid);
    view.setInt32(POSITION_OFFSET, pos);
    new Uint8Array(chunk, 0, chunk.byteLength).set(new Uint8Array(ab), RESERVED_BYTES);
    return chunk;
}

BDC.__unpack = function (chunk) {
    var view = new DataView(chunk);
    var uid = view.getInt32(UID_OFFSET);
    var pos = view.getInt32(POSITION_OFFSET);
    // var ab = new Buffer( new Uint8Array(chunk.slice(RESERVED_BYTES)) );
    var ab = new Uint8Array(chunk.slice(RESERVED_BYTES));
    return [ uid, pos, ab ];
};

// 
// BDC Factory methods
//
BDC.submitChunk = function (chunk) {
    var unpacked = this.__unpack(chunk);
    var uid = unpacked[0],
        pos = unpacked[1],
        ab  = unpacked[2];
    
    var file = fileChunks.getRecord(uid);
    if (! file) {
        return false;
    }

    file._chunks[pos - 1] = ab;
    file._chunksProcessed += 1;
    file.onChunkReceived(ab, pos);
    
    if (file.getPosition() === file.getTotalChunks()) {
        // TODO 
        // - add merged ArrayBuffer 
        // - verify checksum
        // - call onComplete with ab and metdata as params
        file.onCompleted(); 
    }
    fileChunks.addRecord(file);
    return true;
};

module.exports = BDC;