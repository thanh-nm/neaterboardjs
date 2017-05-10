var redisendpoint = require('./../lib/db_endpoint/redisendpoint');
var RedisEndpoint = redisendpoint.RedisEndpoint;

var chai = require('chai');
var assert = require('chai').assert;
var expect = chai.expect;

describe('RedisEndpoint', function() {
  var redisClient = new RedisEndpoint();
  redisClient.createClient();

  beforeEach(function(done) {
    this.timeout(3000); // A very long environment setup.
    setTimeout(done, 2500);
    redisClient.addPeriodicalLeaderboard('daily');

    //TODO date:
    // API requires ISO_8601 time string
    // validate the ISO time string with moment.js
    // convert ISO time string to UTC to save in the DB
    // for sortring later

    let date = new Date().toString();
    redisClient.insertScore('1', 'quiz 1', date, parseFloat(100), {timeTaken:'1000'}, done);
    redisClient.insertScore('1', 'quiz 1', date, parseFloat(200), {timeTaken:'2000'}, done);
    redisClient.insertScore('2', 'quiz 1', date, parseFloat(200), {timeTaken:'2000'}, done);
    redisClient.insertScore('3', 'quiz 1', date, parseFloat(500), {timeTaken:'5000'}, done);
    redisClient.insertScore('1', 'quiz 2', date, parseFloat(100), {timeTaken:'100'}, done);
  });

  afterEach(function(done) {
    redisClient.flushAll();
    done();
  });

  /**
   * Tests getAllTimeRank()
   */
  it('#getAllTimeRank() should return the rank of the given user and feature', function(done) {
    redisClient.getRank('alltime', '1', 'quiz 1', (err, rank) => {
      assert.equal(2, rank);
      done();
    });
  });

  /**
   * Tests getAllTimeRank()
   */
  it('#getDailyRank() should return the rank of the given user and feature', function(done) {
    redisClient.getRank('alltime', '3', 'quiz 1', (err, rank) => {
      assert.equal(0, rank);
      done();
    });
  });

  /**
   * Tests getAllTimeLeaderboard()
   */
  it('#getAllTimeLeaderboard() should return the userIds in descending order of their scores', function(done) {
    redisClient.getLeaderboard('alltime', 'quiz 1', 0, 10, (err, userIds) => {
      assert.equal('3', userIds[0]);
      assert.equal('2', userIds[1]);
      assert.equal('1', userIds[2]);
      done();
    });
  });

  /**
   * Tests getDailyRank()
   */
  it('#getDailyRank() should return the rank on the daily leaderboard of the given user and feature', function(done) {
    redisClient.getRank('daily', '3', 'quiz 1', (err, rank) => {
      assert.equal(0, rank);
      //console.log('rank =' + rank);
      done();
    });
  });

  /**
   * Tests clearPeriodicalLeaderboard()
   */
  it('#clearPeriodicalLeaderboard() should return null if getDailyRank() is invoked after clearing', function(done) {
    redisClient.clearPeriodicalLeaderboard('daily', (err, res) => {
      redisClient.getRank('daily', '1', 'quiz 2', (err, rank) => {
        assert.equal(null, rank);
        done();
      });
    });
  });

  /**
   * Tests clearPeriodicalLeaderboard()
   */
  it('#clearPeriodicalLeaderboard() should return null if getUserFeatureBestDailyScore() is invoked after clearning ', function(done) {
    redisClient.getUserBestScore('daily', '3', 'quiz 1', (err, bestScore) => {
      assert.equal(500, bestScore);
    });

    redisClient.clearPeriodicalLeaderboard('daily', (err, res) => {
      redisClient.getUserBestScore('daily','3', 'quiz 1', (err, bestScore) => {
        assert.equal(null, bestScore);
        done();
      });
    });
  });
});
