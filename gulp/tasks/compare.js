var gulp = require('gulp');
var resemble = require('node-resemble-js');
var paths = require('../util/paths');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');


gulp.task('compare', function (done) {
  var compareConfig = JSON.parse(fs.readFileSync(paths.compareConfigFileName, 'utf8')).compareConfig;
  var simultanious_comparsion = 0;
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
    simultanious_comparsion++;
    pair.testStatus = "running";
    var referencePath = path.join(paths.backstop, pair.reference);
    var testPath = path.join(paths.backstop, pair.test);
    if(simultanious_comparsion>100) {
      console.log("waiting in the line");
      console.log(simultanious_comparsion);
      console.log(testPath);
    } else {
      console.log(simultanious_comparsion);
      resemble(referencePath).compareTo(testPath).onComplete(function (data) {
        var imageComparisonFailed = !data.isSameDimensions || data.misMatchPercentage > pair.misMatchThreshold;

        if (imageComparisonFailed) {
          pair.testStatus = "fail";
          simultanious_comparsion--;
          console.log('ERROR:', pair.label, pair.fileName);
          storeFailedDiffImage(testPath, data);
          startComparsion(testPath, referencePath);
        } else {
          pair.testStatus = "pass";
          simultanious_comparsion--;
          console.log('OK:', pair.label, pair.fileName);
          startComparsion(testPath, referencePath);
        }

        updateProgress();
      });
    }
  });

  function startComparsion(testPath, referencePath) {
    resemble(referencePath).compareTo(testPath).onComplete(function (data) {
      var imageComparisonFailed = !data.isSameDimensions || data.misMatchPercentage > pair.misMatchThreshold;

      if (imageComparisonFailed) {
        pair.testStatus = "fail";
        simultanious_comparsion--;
        console.log('ERROR:', pair.label, pair.fileName);
        storeFailedDiffImage(testPath, data);

      } else {
        pair.testStatus = "pass";
        simultanious_comparsion--;
        console.log('OK:', pair.label, pair.fileName);

      }

      updateProgress();
    });
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
});
