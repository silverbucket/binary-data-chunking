if (typeof define !== 'function') {
    console.log('typeof: ' + typeof require + ' :' + typeof define);
  var define = require('amdefine')(module);
}
define([], function () {

    function FileHelper () {}

    FileHelper.getFile = function (fileName, cb) {
        if (typeof FileReader === 'undefined') {
            var fs = require('fs');
            var data = fs.readFileSync('./test/' + fileName);
            var ab = new ArrayBuffer(data.byteLength);
            new Uint8Array(ab, 0, ab.byteLength).set(new Uint8Array(data));
            cb(ab);
        } else {
            fetch('test.mp4').then(function (res) {
                return res.blob();
            }).then(function (file) {
                var reader = new FileReader();
                reader.onload = function (event) {
                    cb(event.target.result);
                };

                reader.onerror = function(event) {
                    console.error("File could not be read! Code " + event.target.error.code);
                };

                reader.readAsArrayBuffer(file, '');  
            }, function (err) {
                console.log('err: ', err);
            });
            
        }
    }
    
    return FileHelper;
});