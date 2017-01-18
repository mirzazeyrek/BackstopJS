var path = require('path');
var temp = require('temp');

function extendConfig(config, userConfig) {
  bitmapPaths(config, userConfig);
  ci(config, userConfig);
  htmlReport(config, userConfig);
  comparePaths(config);
  config.engine = userConfig.engine || null;
  captureConfigPaths(config);
  casper(config, userConfig);


  config.report = userConfig.report || ['browser'];
  config.defaultMisMatchThreshold = 0.1;
  config.debug = userConfig.debug || false;
  config.resembleOutputOptions = userConfig.resembleOutputOptions;
  return config;
}

function bitmapPaths(config, userConfig) {
  config.bitmaps_reference = path.join(config.projectPath, 'backstop_data', 'bitmaps_reference');
  config.bitmaps_test = path.join(config.projectPath, 'backstop_data', 'bitmaps_test');
  if (userConfig.paths) {
    config.bitmaps_reference = userConfig.paths.bitmaps_reference || config.bitmaps_reference;
    config.bitmaps_test = userConfig.paths.bitmaps_test || config.bitmaps_test;
  }
}

function ci(config, userConfig) {
  config.ci_report = path.join(config.projectPath, 'backstop_data', 'ci_report');
  if (userConfig.paths) {
    config.ci_report = userConfig.paths.ci_report || config.ci_report;
  }
  config.ciReport = {
    format: 'junit',
    testReportFileName: 'xunit',
    testSuiteName: 'BackstopJS'
  };

  if (userConfig.ci) {
    config.ciReport = {
      format: userConfig.ci.format || config.ciReport.format,
      testReportFileName: userConfig.ci.testReportFileName || config.ciReport.testReportFileName,
      testSuiteName: userConfig.ci.testSuiteName || config.ciReport.testSuiteName
    };
  }
}
function htmlReport(config, userConfig) {
  config.html_report = path.join(config.projectPath, 'backstop_data', 'html_report');
  config.openReport = userConfig.openReport || true;

  if (userConfig.paths) {
    config.html_report = userConfig.paths.html_report || config.html_report;
  }

  var htmlReportSubPath = config.testReportFileName || "";
  if(htmlReportSubPath)
    config.html_report = config.html_report + config.testReportFileName.replace(/\.xml$/, '');

  config.compareConfigFileName = path.join(config.html_report, 'config.js');
  config.compareReportURL = path.join(config.html_report, 'index.html');
}

function comparePaths(config) {
  config.comparePath = path.join(config.backstop, 'compare');
  config.tempCompareConfigFileName = temp.path({suffix: '.json'});
}

function captureConfigPaths(config) {
  var htmlReportSubPath = config.testReportFileName || "";
  if(htmlReportSubPath)
  htmlReportSubPath = config.testReportFileName.replace(/\.xml$/, '')+'-';
  var engineType = (config.engine) ? config.engine + "-" : "";
  config.captureConfigFileName = path.join(config.backstop, 'capture', engineType+htmlReportSubPath+'config.json');



  console.log("captureConfigFileName " + config.captureConfigFileName);
  config.captureConfigFileNameDefault = path.join(config.backstop, 'capture', 'config.default.json');
}

function casper(config, userConfig) {
  config.casper_scripts = path.join(config.projectPath, 'backstop_data', 'casper_scripts');
  config.casper_scripts_default = path.join(config.backstop, 'capture', 'casper_scripts');

  config.casperFlags = userConfig.casperFlags || null;

  if (userConfig.paths) {
    config.casper_scripts = userConfig.paths.casper_scripts || config.casper_scripts;
  }
}

module.exports = extendConfig;
