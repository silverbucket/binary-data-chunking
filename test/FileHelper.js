define(['fs'], function (fs) {

    function FileHelper () {}

    FileHelper.getFile = function (fileName) {
        var data = fs.readFileSync('./test/'+fileName);
        var ab = new ArrayBuffer(data.byteLength);
        new Uint8Array(ab, 0, ab.byteLength).set(new Uint8Array(data));
        return ab;
    }
    
    return FileHelper;
});