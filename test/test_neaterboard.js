var neaterboardjs = require('./../lib/neaterboard');
var Neaterboard = neaterboardjs.Neaterboard;

var chai = require('chai');
var assert = require('chai').assert;

describe('Neaterboard', function() {
  var neaterboard = new Neaterboard();

  beforeEach(function(done) {
    this.timeout(3000); // A very long environment setup.
    setTimeout(done, 2500);
    neaterboard.flushAll();

    let date = new Date().toString();
    neaterboard.insertScore('1', 100, done, {featureId: 'quiz1', scoreData: {timeTaken:'1000'}});
    neaterboard.insertScore('1', 200, done, {featureId: 'quiz1', scoreData: {timeTaken:'2000'}});
    neaterboard.insertScore('2', 200, done, {featureId: 'quiz1', scoreData: {timeTaken:'5000'}});
    neaterboard.insertScore('3', 500, done, {featureId: 'quiz1', scoreData: {timeTaken:'1000'}});
    neaterboard.insertScore('4', 50, done, {featureId: 'quiz1', scoreData: {timeTaken:'1000'}});
    neaterboard.insertScore('1', 100, done);
  });

  afterEach(function(done) {
    this.timeout(3000); // A very long environment setup.
    setTimeout(done, 2500);
    neaterboard.flushAll();
  });

  /**
   * Tests getLeaderboard()
   */
  it('#getLeaderboard()', function(done) {
      neaterboard.getLeaderboard((err, userIds) => {
        assert.equal(4, userIds.length);
        done();
      }, {featureId:'quiz1'});
  });

  /**
   * Tests getLeaderboard()
   */
  it('#getAroundMeLeaderboard()', function(done) {
      neaterboard.getAroundMeLeaderboard('2', (err, userIds) => {
        assert.equal(3, userIds.length);
        done();
      }, {featureId:'quiz1', range:1});
  });


  /**
   * Tests getRank()
   */
  it('#getRank', function(done) {
    neaterboard.getRank('3', (err, rank) => {
      assert.equal(0, rank);
      done();
    }, {featureId:'quiz1'});
  });


  /**
   * Tests getUserFeatureBestScore()
   */
  it('#getUserFeatureBestScore', function(done) {
    neaterboard.getUserBestScore('1', (err, score) => {
      assert.equal(100, score);
      done();
    });
  });

  /**
   * Tests getUserFeatureBestScore() with  getOptions and returnOptions
   */
  it('#getUserFeatureBestScore', function(done) {
    neaterboard.getUserBestScore('1', (err, score) => {
      assert.equal(200, score.rawScore);
      assert.equal('2000', JSON.parse(score.scoreData).timeTaken);
      done();
    },{featureId:'quiz1'}, {date:true, scoreData:true});
  });

  /**
   * Tests getAllTimeRank()
   */
  it('#addPeriodicalLeaderboard', function(done) {
    this.timeout(3500);
    neaterboard.addLeaderboards({test: true});
    setTimeout(() => {
      neaterboard.getLeaderboard((err, userIds) => {
        assert.equal(0, userIds.length);
        neaterboard.removeLeaderboards('test_secondly');
        done();
      }, {leaderboard:'daily', featureId:'quiz1'});
    }, 1100);
  });
});
