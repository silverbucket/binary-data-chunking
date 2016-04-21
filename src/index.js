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

function BDC(md) {
    var totalChunks, payloadSize, checksum;
    if (typeof md !== 'object') { throw new Error('metadata object must be passed in'); }
    if (! md.name) { throw new Error('no name specified'); }
    if (! md.mimeType) { throw new Error('no mimeType specified'); }
    if (! md.chunkSize) { throw new Error('no chunkSize specified'); }
    if ((md.arrayBuffer) && 
       ((typeof md.arrayBuffer.toString !== 'function') || (md.arrayBuffer.toString() !== '[object ArrayBuffer]'))) { 
        throw new Error('arrayBuffer must be an actual ArrayBuffer object'); 
    } else if ((! md.arrayBuffer) && (! md.uid)) { 
        throw new Error('arrayBuffer or uid must be specified');
    } else if ((md.arrayBuffer) && (md.uid)) {
        throw new Error('cannot manually assign uid');
    } 
    if (! md.uid) {
        // we have an arrayBuffer, so we create a UID  
        md.uid = genUID();
    } 
    if (md.arrayBuffer) {
        // this is a sender
        // we have an arrayBuffer, so let's calc total number of chunks
        payloadSize = (md.chunkSize - RESERVED_BYTES)
        totalChunks = Math.ceil(md.arrayBuffer.byteLength / payloadSize);
        checksum = SparkMD5.ArrayBuffer.hash(md.arrayBuffer);
    } else {
        checksum = md.checksum;
    }

    this.uid = md.uid;
    this.name = md.name;
    this.mimeType = md.mimeType;
    this.chunkSize = md.chunkSize;
    this.payloadSize = payloadSize;
    this.reservedSize = RESERVED_BYTES;
    this.fileSize = (md.arrayBuffer) ? md.arrayBuffer.byteLength : 0;
    this.totalChunks = (totalChunks) ? totalChunks : (md.totalChunks) ? md.totalChunks : 0;
    this.checksum = checksum;
    this.generatedChecksum;
    this.chunksProcessed = 0;
    // TODO calc checksums for every chunk
    
    this._arrayBuffer = (md.arrayBuffer) ? md.arrayBuffer : null,
    this._chunks = [];

    if (! md.arrayBuffer) {
        fileChunks.addRecord(this);
    }
}

BDC.prototype.getMetadata = function () {
    return {
        uid: this.uid,
        name: this.name,
        mimeType: this.mimeType,
        chunkSize: this.chunkSize,
        payloadSize: this.payloadSize,
        reservedSize: this.reservedSize,
        fileSize: this.fileSize,
        totalChunks: this.totalChunks,
        checksum: this.checksum
    };    
};

BDC.prototype.getFile = function (cb) {
    this._arrayBuffer = this._chunks[0];
    for (var i = 1; i < this._chunks.length; i += 1) {
        // console.log('buffer; ' + this._arrayBuffer.byteLength);
        this._arrayBuffer = appendBuffer(this._arrayBuffer, this._chunks[i]);
    }
    this.generatedChecksum = SparkMD5.ArrayBuffer.hash(this._arrayBuffer);
    cb(this._arrayBuffer, this.generatedChecksum);
};

BDC.prototype.onChunkReceived = function () {};

BDC.prototype.onCompleted = function () {};

BDC.prototype.forEachChunk = function (cb, end) {
    var chunk;
    for (var i = 0; i < this.totalChunks; i += 1) {
        if (chunk = this.getChunk()) {
            cb(chunk, this.chunksProcessed);
        } else {
            end();
        }
    }
};

BDC.prototype.getChunk = function (num) {
    var _adjustedPosition = this.chunksProcessed + 1
    if (typeof num === 'number') {
        if (num <= 0) {
            return undefined;
        } else {
            _adjustedPosition = num;
        }    
    } else {
        num = undefined;
    }
    
    var start = (this.payloadSize * _adjustedPosition) - this.payloadSize;
    if (start >= this.fileSize) {
        return undefined;
    }
    var end = start + this.payloadSize;
    end = (end > this.fileSize) ? this.fileSize : end;
    
    var payload = this._arrayBuffer.slice(start, end);
    var chunk = BDC.__pack(this.uid, _adjustedPosition, payload);
    
    if (! num) {
        this.chunksProcessed += 1;
    }
    
    return chunk;
};

BDC.prototype.clearData = function () {
    fileChunks.removeRecord(this.uid);
    delete this._arrayBuffer;
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

BDC.unpack = function (chunk) {
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
    var unpacked = this.unpack(chunk);
    var uid = unpacked[0],
        pos = unpacked[1],
        ab  = unpacked[2];
    
    var file = fileChunks.getRecord(uid);
    if (! file) {
        return false;
    }

    file._chunks[pos - 1] = ab;
    file.chunksProcessed += 1;
    file.onChunkReceived(ab, pos);
    
    if (file.chunksProcessed === file.totalChunks) {
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