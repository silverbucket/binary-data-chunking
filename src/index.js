function BDT(metadata = {}) {
    var filename, mimeType, arrayBuffer, chunkSize, uid  = metadata;
    if (! filename) { throw new Error('no filename specified'); }
    if (! mimeType) { throw new Error('no mimeType specified'); }
    if (! chunkSize) { throw new Error('no chunkSize specified'); }
    if ((! arrayBuffer) && (! uid)) { throw new Error('arrayBuffer or uid must be specified')}

}