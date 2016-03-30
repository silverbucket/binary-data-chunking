# binary-data-transfer
A simple binary data transfer protocol that simplifies sending large amounts of chunked binary data. For example via. the WebRTC DataChannel. 

This is useful in the case that you would like to received chunks of data instead of one large file Blob at the end of the transfer **(as in Firefox)**, and avoid the issues with sending large files in Chrome.

Although this was designed for use in WebRTC, it could be used in other environments where you need a custom way to send chunks binary of information.

## Environment
This can be used both in a `node.js` or browser environment *(targeted browsers are the latest: Chrome, Firefox and eventually Edge)*

## Usage
### Include
#### Node 
```javascript
var BDT = require('binary-data-transfer');
```

#### Browser
Include the either the minified, or non-minified files in the `dist/` directory.

```javascript
dist/binary-data-transfer.js
dist/binary-data-transfer.min.js
```

### Initialize
You create a new `BDT` instance for each file you wish to transfer. The initialization parameters give the basic information about your file.

#### Sending client
```javascript
var file = new BDT({ 
    name: 'sample.mp4',
    mimeType: 'video/mp4',
    arrayBuffer: ab, // must be in the ArrayBuffer format
    chunkSize: 16000 // chunkSize to use *before* meta-data additions.
});

file.getFileSize();   // returns actual file size based on ArrayBuffer
file.getTotalChunks(); // total number of chunks that will be sent (based on file size and chunk size)
file.getChecksum();   // checksum based on ArrayBuffer

file.getMetadata();  // to be sent to other end to initialize the transfer, used to initialize a BDT instance on the receiving end.

file.getChunk([num]); // will get next chunk, or optionally get the chunk based on the number (position) specific. 
                      // note, the chunk will have header info embedded in the first few bytes, to receiving client 
                      // must also have an instance created based on the information returned from `file.getMetadata()`
```                    

#### Receiving client
When you receive the `metadata` sent from the sending client, you can initialize a new `BDT` instance

```javascript
// when metadata is received
var file = new BDT(metadata);

file.onChunkReceived(function (chunk, num) {
    // this handler will be called when a chunk that relates to this file instance is received    
});

file.onComplete(function (ab, metadata) {
   // here you receive the completed ArrayBuffer object along with it's metadata 
});

// when a binary chunk is received, we don't know yet which file object it belongs to, so we submit it to the Factory object and wait for the handler to be called
BDT.submitChunk(chunk);
```

With your `file` object instance, you can access the methods like `getNumChunks()`, `getFileSize()`, `getMetadata()`, `getChunk([num])` and once completed `getChecksum()`.


## Known Issues

The generation of a `uid` does have some collision potential, we we are limited in space, and also we do not know what `uid`s have already been generated on the receiving end(s) of the file transfer(s).
