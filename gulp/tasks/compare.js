var gulp = require('gulp');
var resemble = require('node-resemble-js');
var paths = require('../util/paths');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');


gulp.task('compare', function (done) {
  var compareConfig = JSON.parse(fs.readFileSync(paths.compareConfigFileName, 'utf8')).compareConfig;
  var simultanious_comparsion = 0;
  var total_comparsion = 1;
  var comparsion_available = 1;

  function updateProgress() {
    var results = {};
    _.each(compareConfig.testPairs, function (pair) {
      if (!results[pair.testStatus]) {
        results[pair.testStatus] = 0;
      }
      !results[pair.testStatus]++;
    });
    if (!results.running) {
      console.log ("\nTest completed...");
      console.log ((results.pass || 0) + " Passed");
      console.log ((results.fail || 0) + " Failed\n");

      if (results.fail) {
        console.log ("*** Mismatch errors found ***");
        console.log ("For a detailed report run `gulp openReport`\n");
        if (paths.cliExitOnFail) {
          done(new Error('Mismatch errors found.'));
        }
      } else {
        done();
      }

    }
  }


  _.each(compareConfig.testPairs, function (pair) {
    pair.testStatus = "running";

    var referencePath = path.join(paths.backstop, pair.reference);
    var testPath = path.join(paths.backstop, pair.test);
    var line = simultanious_comparsion;

    startComparsion(testPath, referencePath, pair, line);

    // start for first 100 image
    // startComparsion(testPath, referencePath, pair);
    // wait until an image completed
    simultanious_comparsion++;
    total_comparsion++;
  });

  function startComparsion(testPath, referencePath, pair, line) {
    if(fileExists(testPath) && fileExists(referencePath)) {
      if(simultanious_comparsion>10 && comparsion_available > 10) {
        // console.log(" waiting in line " + line + " simultanious comparsion " + simultanious_comparsion + " comparsion available " + comparsion_available);
        setTimeout(function () { startComparsion(testPath, referencePath, pair, line);  },  1000 * (4));

      } else {

        console.log( "started - " + line);
        comparsion_available++;
        resemble(referencePath).compareTo(testPath).onComplete(function (data) {
          // var imageComparisonFailed = !data.isSameDimensions || data.misMatchPercentage > pair.misMatchThreshold;
          var imageComparisonFailed = data.misMatchPercentage > pair.misMatchThreshold;
          if (imageComparisonFailed) {
            console.log('mismatch : ', pair.misMatchThreshold, data.misMatchPercentage);
            pair.testStatus = "fail";
            console.log('ERROR:', pair.label, pair.fileName);
            storeFailedDiffImage(testPath, data);
            comparsion_available--;
          } else {
            pair.testStatus = "pass";
            comparsion_available--;
            console.log('OK:', pair.label, pair.fileName);
          }

          updateProgress();
        });

      }
    } else {

    }
    updateProgress();
  }

  function storeFailedDiffImage(testPath, data) {
    var failedDiffFilename = getFailedDiffFilename(testPath);
    console.log('Storing diff image in ', failedDiffFilename);
    var failedDiffStream = fs.createWriteStream(failedDiffFilename);
    data.getDiffImage().pack().pipe(failedDiffStream)
  }

  function getFailedDiffFilename(testPath) {
    var lastSlash = testPath.lastIndexOf(path.sep);
    return testPath.slice(0, lastSlash + 1) + 'failed_diff_' + testPath.slice(lastSlash + 1, testPath.length);
  }

  function fileExists(path) {

    try  {
      return fs.statSync(path).isFile();
    }
    catch (e) {

      if (e.code == 'ENOENT') { // no such file or directory. File really does not exist
        console.log("File does not exist. " + path);
        return false;
      }

      console.log("Exception fs.statSync (" + path + "): " + e);
      return false; // something else went wrong, we don't have rights, ...
    }
  }

});
