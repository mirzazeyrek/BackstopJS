module.exports = function(casper, scenario, vp) {
 // casper.echo('onReady.js', 'INFO');
  casper.evaluate(function(){
    jQuery("#mk-theme-container").css("overflow", "hidden");
  });
  casper.wait(50);
};
