'use strict';

//import { RedisEndpoint } from './db_endpoint/redisendpoint';
var redisendpoint = require('./db_endpoint/redisendpoint');
var RedisEndpoint = redisendpoint.RedisEndpoint;

var cron = require('node-cron');
var log4js = require('log4js');

const alltime = 'alltime';
const daily = 'daily';
const weekly = 'weekly';
const monthly = 'monthly';
const test_secondly = 'test_secondly';

const default_featureId = 'NONE';

/**
 * Constructor
 * @param {[type]} port_arg [description]
 * @param {[type]} host_arg [description]
 * @param {[type]} options  [description]
 */
function Neaterboard(port_arg, host_arg, options) {
  this.logger = log4js.getLogger();
  this.logger.setLevel('ERROR');
  setupDb.call(this, port_arg, host_arg, options);
}

/**
 * [Private function]
 */
function setupDb(port_arg, host_arg, options) {
  this.redisClient = new RedisEndpoint();
  this.redisClient.createClient(port_arg, host_arg, options);
}

/**
 * [Private function]
 */
function scheduleLbClear(cronPattern, period) {
  return cron.schedule(cronPattern, function() {
    this.redisClient.clearPeriodicalLeaderboard(period, (err, res) => {
      this.logger.debug('Daily leaderboards cleared');
    });
  }.bind(this));
}

Neaterboard.prototype.insertScore = function(userId, rawScore, callback, options) {
  options = options || {};
  var featureId = options.featureId || default_featureId,
      date = options.date || new Date().toString(),
      scoreData = options.scoreData || {};
  this.redisClient.insertScore(userId, featureId, date, rawScore, scoreData, callback);
}

Neaterboard.prototype.getUserBestScore = function(userId, callback, getOptions, returnOptions) {
  getOptions = getOptions || {};
  var leaderboard = getOptions.leaderboard || alltime,
      featureId = getOptions.featureId || default_featureId;
  this.redisClient.getUserBestScore(leaderboard, userId, featureId, callback, returnOptions);
}

Neaterboard.prototype.getLeaderboard = function(callback, options) {
  options = options || {};
  var leaderboard = options.leaderboard || alltime,
      featureId = options.featureId || default_featureId,
      fromRank = options.fromRank || 0,
      toRank = options.toRank || -1; // entire leaderboard
  this.redisClient.getLeaderboard(leaderboard, featureId, fromRank, toRank, callback);
}

Neaterboard.prototype.getAroundMeLeaderboard = function(userId, callback, options) {
  options = options || {};
  var leaderboard = options.leaderboard || alltime,
      featureId = options.featureId || default_featureId,
      range = options.range || 10;
  this.redisClient.getAroundMeLeaderboard(userId, leaderboard, featureId, range, callback);
}

Neaterboard.prototype.getRank = function(userId, callback, options) {
  options = options || {};
  var leaderboard = options.leaderboard || alltime,
      featureId = options.featureId || default_featureId;
  this.redisClient.getRank(leaderboard, userId, featureId, callback);
}

Neaterboard.prototype.flushAll = function() {
  this.redisClient.flushAll();
}

Neaterboard.prototype.addLeaderboards = function(options) {
  options = options || {};
  var daily = options.daily || false,
      weekly = options.weekly || false,
      monthly = options.monthly || false,
      test = options.test || false;

  if (test) {
    this.secondlyTask = scheduleLbClear.call(this, '* * * * * *');
    this.redisClient.addPeriodicalLeaderboard(daily);
  }
  if (daily) {
    this.dailyTask = scheduleLbClear(this, '0 0 * * *');
    this.redisClient.addPeriodicalLeaderboard(daily);
  }

  if (weekly) {
    this.weeklyTask = scheduleLbClear(this, '0 0 * * 0');
    this.redisClient.addPeriodicalLeaderboard(weekly);
  }

  if (monthly) {
    this.monthlyTask = scheduleLbClear(this, '0 0 0 1 *');
    this.redisClient.addPeriodicalLeaderboard(montyly);
  }
}

Neaterboard.prototype.removeLeaderboards = function(options) {
  options = options || {};
  var daily = options.daily || false,
      weekly = options.weekly || false,
      monthly = options.monthly || false,
      test = options.test || false;

  if (test && this.secondlyTask != null) {
    this.logger.debug('Destroy test_secondly task');
    this.secondlyTask.destroy();
    this.redisClient.clearPeriodicalLeaderboard(daily);
  }

  if (daily === daily && this.dailyTask != null) {
    this.dailyTask.destroy();
    this.redisClient.clearPeriodicalLeaderboard(daily);
  }

  if (weekly && this.weeklyTask != null) {
    this.weeklyTask.destroy();
    this.redisClient.clearPeriodicalLeaderboard(weekly);
  }

  if (monthly && this.monthlyTask != null) {
    this.monthlyTask.destroy();
    this.redisClient.clearPeriodicalLeaderboard(monthly);
  }
}

exports.Neaterboard = Neaterboard;
