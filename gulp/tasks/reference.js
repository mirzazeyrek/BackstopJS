var gulp = require('gulp');


//FIRST CLEAN REFERENCE DIR.  THEN TEST
gulp.task('reference', ['clean','bless'], function() {
//    console.log('reference is starting');
    gulp.run('test');
//    console.log('reference has run.');
});
