var source     = require('vinyl-source-stream'),
    streamify  = require('gulp-streamify'),
    browserify = require('browserify'),
    uglify     = require('gulp-uglify'),
    rename     = require('gulp-rename'),
    gulp       = require('gulp');

var baseDir = './src/';
var baseFileName = 'index';
var browserFileName = 'binary-data-chunking';
var objName  = 'BinaryDataChunking';

gulp.task('default', function () {
  var bundleStream = browserify(baseDir + baseFileName + '.js', { standalone: objName }).bundle();

  return bundleStream
         .pipe(source(browserFileName + '.js'))
         .pipe(gulp.dest('./dist'))
         .pipe(streamify(uglify()))
         .pipe(rename(browserFileName + '.min.js'))
         .pipe(gulp.dest('./dist'));
});
