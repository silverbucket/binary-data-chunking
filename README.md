# binary-data-chunking
A simple binary data chunking library that simplifies sending large amounts of chunked binary data. For example via. the WebRTC DataChannel. 

This is useful in the case that you would like to received chunks of data instead of one large file Blob at the end of the transfer **(as in Firefox)**, and avoid the issues with sending large files in Chrome.

Although this was designed for use in WebRTC, it could be used in other environments where you need a custom way to send chunks binary of information.

## Environment
This can be used both in a `node.js` or browser environment *(targeted browsers are the latest: Chrome, Firefox and eventually Edge)*

## Usage
### Include
#### Node 
```javascript
var BDC = require('binary-data-chunking');
```

#### Browser
Include the either the minified, or non-minified files in the `dist/` directory.

```javascript
dist/binary-data-chunking.js
dist/binary-data-chunking.min.js
```

### Initialize
You create a new `BDC` instance for each file you wish to transfer. The initialization parameters give the basic information about your file.

#### Sending client
```javascript
var file = new BDC({ 
    name: 'sample.mp4',
    mimeType: 'video/mp4',
    arrayBuffer: ab, // must be in the ArrayBuffer format
    chunkSize: 16000 // chunkSize to use *before* meta-data additions.
});

file.fileSize;   // returns actual file size based on ArrayBuffer
file.totalChunks; // total number of chunks that will be sent (based on file size and chunk size)
file.checksum;   // checksum based on ArrayBuffer

file.getMetadata();  // to be sent to other end to initialize the transfer, used to initialize a BDC instance on the receiving end.

file.clearData();    // removes arrayBuffer data and all stored information

var to = file.getTransferObject(); // unique instance to track the transfering of each chunk 

to.getChunk([pos]); // will get next chunk, or optionally get the chunk based on the number (position) specific. 
                    // note, the chunk will have header info embedded in the first few bytes, to receiving client 
                    // must also have an instance created based on the information returned from `file.getMetadata()`
to.currentIndex;    // returns the current number if chunks given from `getChunk()`
                      
```                    

#### Receiving client
When you receive the `metadata` sent from the sending client, you can initialize a new `BDC` instance

```javascript
// when metadata is received
var file = new BDC(metadata);

file.onChunkReceived(function (ab, pos) {
    // this handler will be called when a chunk that relates to this file instance is received    
});

file.onComplete(function (ab, metadata) {
   // here you receive the completed ArrayBuffer object along with it's metadata 
});

var to = file.getTransferObject();
var payload = to.getUnpackedChunk(); // next ordered arrayBuffer without the binary metadata bits

// when a binary chunk is received, we don't know yet which file object it belongs to, so we submit it to the Factory object and wait for the handler to be called
BDC.submitChunk(chunk);

file.generatedChecksum; // contains then generated checksum once a transfer is complete
```

With your `file` object instance, you can access the methods like `totalChunks`, `fileSize`, `getMetadata()`, `getChunk()` and once completed `getFile()`.

## Known Issues

The generation of a `uid` does have some collision potential, we we are limited in space, and also we do not know what `uid`s have already been generated on the receiving end(s) of the file transfer(s).
