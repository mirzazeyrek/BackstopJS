
var fs = require('fs');

var selectorNotFoundPath = 'capture/resources/selectorNotFound_noun_164558_cc.png'
var hiddenSelectorPath = 'capture/resources/hiddenSelector_noun_63405.png'
var genConfigPath = 'capture/config.json'


var configJSON = fs.read(genConfigPath);
var config = JSON.parse(configJSON);
if (!config.paths) {
  config.paths = {};
}


var test_case = false;
console.log(" test_case " + test_case);
if(config.hasOwnProperty('test_case')){
  test_case = true;
  var test_case_url = config.test_case.url;
  var test_case_referenceUrl = config.test_case.referenceUrl;
  var test_case_screenshotDateTime = config.test_case.screenshotDateTime;
  var test_case_viewport = config.test_case.viewport;
  var test_case_label = config.test_case.label;
  var test_case_checkReference = config.test_case.checkReference;
  console.log("test_case_url " + test_case_url);
  console.log("test_case_referenceUrl " + test_case_referenceUrl);
  console.log("test_case_screenshotDateTime " + test_case_screenshotDateTime);
  console.log("test_case_viewport " + test_case_viewport);
  console.log("test_case_label " + test_case_label);
  console.log("test_case_checkReference " + test_case_checkReference);
}

var checkReference = "";
var bitmaps_reference = config.paths.bitmaps_reference || 'bitmaps_reference';
var bitmaps_test = config.paths.bitmaps_test || 'bitmaps_test';
var casper_scripts = config.paths.casper_scripts || null;
var compareConfigFileName = config.paths.compare_data || 'compare/config.json';
var viewports = config.viewports;
var scenarios = config.scenarios||config.grabConfigs;

var compareConfig = {testPairs:[]};

var casper = require("casper").create({
  // clientScripts: ["jquery.js"] // uncomment to add jQuery if you need that.
});

if (config.debug) {
  console.log('Debug is enabled!');

  casper.on("page.error", function(msg, trace) {
      this.echo("Remote Error >    " + msg, "error");
      this.echo("file:     " + trace[0].file, "WARNING");
      this.echo("line:     " + trace[0].line, "WARNING");
      this.echo("function: " + trace[0]["function"], "WARNING");
  });
}

casper.on('remote.message', function(message) {
  this.echo('remote console > ' + message);
});

casper.on('resource.received', function(resource) {
  var status = resource.status;
  if(status >= 400) {
    casper.log('remote error > ' + resource.url + ' failed to load (' + status + ')', 'error');
  }
});



function capturePageSelectors(url,scenarios,viewports,bitmaps_reference,bitmaps_test,isReference){

  var
    screenshotNow = new Date(),
    screenshotDateTime = screenshotNow.getFullYear() + pad(screenshotNow.getMonth() + 1) + pad(screenshotNow.getDate()) + '-' + pad(screenshotNow.getHours()) + pad(screenshotNow.getMinutes()) + pad(screenshotNow.getSeconds());

  if(test_case)
      screenshotDateTime = test_case_screenshotDateTime;

  var consoleBuffer = '';
  var scriptTimeout = 20000;


  casper.on('remote.message', function(message) {
      this.echo(message);
      consoleBuffer = consoleBuffer + '\n' + message;
  });

  casper.start();

  casper.each(scenarios,function(casper, scenario, scenario_index){

    casper.each(viewports, function(casper, vp, viewport_index) {
      // added conditions for only if test case is active
 //     console.log("scenario url " + scenario.url);
 //     console.log("test case url  " + test_case_url);
      console.log(" checking ");
      if ((test_case && (test_case_label == scenario.label) ) || (test_case == false)) {

        this.then(function () {
          this.viewport(vp.width || vp.viewport.width, vp.height || vp.viewport.height);
        });

        var url = scenario.url;
        if (isReference && scenario.referenceUrl) {
          url = scenario.referenceUrl;
        }

      if(test_case) {
        url = test_case_url;
      }
      if(test_case && isReference) {
        url = test_case_referenceUrl;
      }


        console.log("check confirmed current url " + url);

      var onBeforeScript = scenario.onBeforeScript || config.onBeforeScript;
      if (onBeforeScript) {
        require(getScriptPath(onBeforeScript))(casper, scenario, vp);
      }

      this.thenOpen(url, function () {
        casper.waitFor(
            function () { //test
              var readyEvent = scenario.readyEvent || config.readyEvent;
              if (!readyEvent) {
                return true;
              }
              var regExReadyFlag = new RegExp(readyEvent, 'i');
              return consoleBuffer.search(regExReadyFlag) >= 0;
            }
            , function () {//on done
              consoleBuffer = '';
              casper.echo('Ready event received.');
            }
            , function () {
              casper.echo('ERROR: casper timeout.')
            } //on timeout
            , scriptTimeout
        );
        casper.wait(scenario.delay || 1);
      });

      casper.then(function () {
        this.echo('Current location is ' + url, 'info');

        if (config.debug) {
          var src = this.evaluate(function () {
            return document.body.outerHTML;
          });
          this.echo(src);
        }
      });

      // Custom casperjs scripting after ready event and delay
      casper.then(function () {
        // onReadyScript files should export a module like so:
        //
        // module.exports = function(casper, scenario, vp) {
        //   // run custom casperjs code
        // };
        //
        var onReadyScript = scenario.onReadyScript || config.onReadyScript;
        if (onReadyScript) {
          require(getScriptPath(onReadyScript))(casper, scenario, vp);
        }
      });

      this.then(function () {

        this.echo('Screenshots for ' + vp.name + ' (' + (vp.width || vp.viewport.width) + 'x' + (vp.height || vp.viewport.height) + ')', 'info');

        //HIDE SELECTORS WE WANT TO AVOID
        if (scenario.hasOwnProperty('hideSelectors')) {
          scenario.hideSelectors.forEach(function (o, i, a) {
            casper.evaluate(function (o) {
              Array.prototype.forEach.call(document.querySelectorAll(o), function (s, j) {
                s.style.visibility = 'hidden';
              });
            }, o);
          });
        }

        //REMOVE UNWANTED SELECTORS FROM RENDER TREE
        if (scenario.hasOwnProperty('removeSelectors')) {
          scenario.removeSelectors.forEach(function (o, i, a) {
            casper.evaluate(function (o) {
              Array.prototype.forEach.call(document.querySelectorAll(o), function (s, j) {
                s.style.display = 'none';
              });
            }, o);
          });
        }

        //CREATE SCREEN SHOTS AND TEST COMPARE CONFIGURATION (CONFIG FILE WILL BE SAVED WHEN THIS PROCESS RETURNS)
        // If no selectors are provided then set the default 'body'
        if (!scenario.hasOwnProperty('selectors')) {
          scenario.selectors = ['body'];
        }
        scenario.selectors.forEach(function (o, i, a) {
          var cleanedSelectorName = o.replace(/[^a-z0-9_\-]/gi, '');//remove anything that's not a letter or a number
          var cleanedLabelName = scenario.label.replace(/[^a-z0-9_\-]/gi, '');
          //var cleanedUrl = scenario.url.replace(/[^a-zA-Z\d]/,'');//remove anything that's not a letter or a number
          var fileName = cleanedLabelName + '_' + scenario_index + '_' + i + '_' + cleanedSelectorName + '_' + viewport_index + '_' + vp.name + '.jpg';


          var reference_FP = bitmaps_reference + '/' + fileName;
          var test_FP = bitmaps_test + '/' + screenshotDateTime + '/' + fileName;

          var filePath = (isReference) ? reference_FP : test_FP;


          if (casper.exists(o)) {
            if (casper.visible(o)) {
              casper.captureSelector(filePath, o);
              if(test_case)
              fs.write(bitmaps_reference + '/' + test_case_checkReference,"true",'b');
            } else {
              var assetData = fs.read(hiddenSelectorPath, 'b');
              fs.write(filePath, assetData, 'b');
            }
          } else {
            var assetData = fs.read(selectorNotFoundPath, 'b');
            fs.write(filePath, assetData, 'b');
          }

          console.log("!isReference " + isReference);
          if (!isReference) {
            console.log("!isReference 2 " + isReference);
            compareConfig.testPairs.push({
              reference: reference_FP,
              test: test_FP,
              selector: o,
              fileName: fileName,
              label: scenario.label,
              misMatchThreshold: scenario.misMatchThreshold || config.misMatchThreshold
            });
          }
          //casper.echo('remote capture to > '+filePath,'info');

        });//end topLevelModules.forEach

      });
    }
    });//end casper.each viewports

  });//end casper.each scenario

}


//========================
//this query should be moved to the prior process
//`isReference` could be better passed as env parameter
if(test_case) {
checkReference = bitmaps_reference + '/' + test_case_checkReference;
} else {
checkReference = bitmaps_reference;
}
var exists = fs.exists(checkReference);
var isReference = false;
if(!exists){
  isReference=true;
  console.log('CREATING NEW REFERENCE FILES')
}

//========================



capturePageSelectors(
  'index.html'
  ,scenarios
  ,viewports
  ,bitmaps_reference
  ,bitmaps_test
  ,isReference
);

casper.run(function(){
  complete();
  this.exit();
});

function complete(){
  fs.touch(compareConfigFileName);
  var compareConfigFile = fs.read(compareConfigFileName);
  var compareConfigJSON = JSON.parse(compareConfigFile || '{}');
  compareConfigJSON.compareConfig = compareConfig;
  fs.write(compareConfigFileName, JSON.stringify(compareConfigJSON,null,2), 'w');
  console.log(
    'Comparison config file updated.'
    //,configData
  );
}

function pad(number) {
  var r = String(number);
  if ( r.length === 1 ) {
    r = '0' + r;
  }
  return r;
}

function getScriptPath(scriptFilePath) {
  var script_path = ensureFileSuffix(scriptFilePath, 'js');

  if (casper_scripts) {
    script_path = glueStringsWithSlash(casper_scripts, script_path);
  }

  // make sure it's there...
  if (!fs.isFile(script_path)) {
    casper.echo(script_path + ' was not found.', 'ERROR');
    return;
  }

  return shimRelativePath(script_path);
}

function ensureFileSuffix(filename, suffix) {
  var re = new RegExp('\.' + suffix + '$', '');

  return filename.replace(re, '') + '.' + suffix;
}

// merge both strings while soft-enforcing a single slash between them
function glueStringsWithSlash(stringA, stringB) {
  return stringA.replace(/\/$/, '') + '/' + stringB.replace(/^\//, '');
}

// require() calls are relative to this file `genBitmaps.js` (not CWD) -- therefore relative paths need shimmimg
function shimRelativePath(path) {
  return path.replace(/^\.\.\//, '../../../').replace(/^\.\//, '../../');
}
