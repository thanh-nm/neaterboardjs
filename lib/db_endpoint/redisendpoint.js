'use strict'

var redis = require('redis');
var async = require('async');
var log4js = require('log4js');

const alltime = 'alltime';
const daily = 'daily';
const weekly = 'weekly';
const monthly = 'monthly';

const field_scoreId = 'score_id';
const field_userId = 'user_id';
const field_featureId = 'feature_id';
const field_date = 'date';
const field_score = 'score'
const field_scoreData = 'score_data';

const field_best_score = 'best_score';

const key_score = 'score:'
const key_userId = field_userId + ':'
const key_featureAllTimeBestScoreId =  'featureAllTimeBestScore:' // key for sorted set for all time best scores
const key_userFeatureAllTimeBestScoreId = 'userFeatureAllTimeBestScore:' // key for hashes for user's best for a feature
const key_featureDailyBestScoreId =  'featureDailyBestScore:' // key for sorted set for daily best scores
const key_userFeatureDailyBestScoreId = 'userFeatureDailyBestScore:'
const key_featureWeeklyBestScoreId =  'featureWeeklyBestScore:' // key for sorted set for weekly best scores
const key_userFeatureWeeklyBestScoreId = 'userFeatureWeeklyBestScore:'
const key_featureMonthlyBestScoreId =  'featureMonthlyBestScore:' // key for sorted set for monthly best scores
const key_userFeatureMonthlyBestScoreId = 'userFeatureMonthlyBestScore:'

/**
 * Constructor
 */
function RedisEndpoint (){}

RedisEndpoint.prototype.addPeriodicalLeaderboard = function (period) {
  if (period === 'daily') {
    this.dailyBoard = true;
  } else if  (period === 'weekly') {
    this.weeklyBoard = true;
  } else if  (period === 'monthly') {
    this.monthlyBoard = true;
  }
}

/**
 * Creates a new Redis client
 */
RedisEndpoint.prototype.createClient = function (port_arg, host_arg, options) {
  this.logger = log4js.getLogger();
  this.logger.setLevel('ERROR');

  this.client = redis.createClient(port_arg, host_arg, options);
  this.logger.debug('Created a client');
  // Executed if errors happen
  this.client.on('error', (err) => {
      this.logger.error('error event - ' + this.client.host + ':' + this.client.port + ' - ' + err);
  });
}

/**
 *  Quits the client
 */
RedisEndpoint.prototype.quit = function () {
  this.client.quit((err, res) => {
      this.logger.info('Exiting from quit command.');
  });
}

/**
 *  Flushes all
 */
RedisEndpoint.prototype.flushAll = function () {
  this.client.flushall((err, res) => {

  });
}

/**
 * Clears the Daily leaderboard
 */
RedisEndpoint.prototype.clearPeriodicalLeaderboard = function (period, callback) {
  var key_feature;
  var key_userFeature;

  if(period === daily) {
    key_feature = key_featureDailyBestScoreId + "*";
    key_userFeature = key_userFeatureDailyBestScoreId + "*";
  } else if (period === weekly) {
    key_feature = key_featureWeeklyBestScoreId + "*";
    key_userFeature = key_userFeatureWeeklyBestScoreId + "*";
  } else if (period === monthly) {
    key_feature = key_featureMonthlyBestScoreId + "*";
    key_userFeature = key_userFeatureMonthlyBestScoreId + "*";
  } else {
    // nothing to do
    return;
  }

  var tasks = [];
  tasks.push((taskCallback) => {
    this.client.keys(key_feature, (err, keys) => {
      this.client.del(keys, taskCallback);
    });
  });

  tasks.push((taskCallback) => {
    this.client.keys(key_userFeature, (err, keys) => {
      this.client.del(keys, taskCallback);
    });
  });

  // all tasks completed
  async.parallel(tasks, callback);
}

/**
 * Inserts a scoreboard
 * @param  {[type]}   userId
 * @param  {[type]}   featureId
 * @param  {[type]}   date
 * @param  {[type]}   rawScore
 * @param  {[type]}   scoreData
 * @param  {Function} callback
 */
RedisEndpoint.prototype.insertScore = function (userId, featureId, date, rawScore, scoreData, callback) {
  this.client.incr(field_scoreId, (err, scoreId) => {
    // maintain a reverse index for user_id and feature_id to query the scores by user_id and feature_id
    // this.client.sadd(key_userId + userId, score_id);
    // this.client.sadd(key_featureId+ featureId, score_id);
    addNewScore.call(this, scoreId, userId, featureId, date, rawScore, scoreData, callback);
  });
}

  /**
   * Adds new score to the score hashes and update user's best score
   * @param {[type]}   scoreId
   * @param {[type]}   userId
   * @param {[type]}   featureId
   * @param {[type]}   date
   * @param {[type]}   rawScore
   * @param {[type]}   scoreData
   * @param {Function} callback
   */
function addNewScore (scoreId, userId, featureId, date, rawScore, scoreData, callback) {
  this.logger.trace('Inserting score: scoreId=' + scoreId + ', userId=' + userId + ', featureId=' + featureId + ', date='+ date + ', rawScore='+rawScore + ', scoreData='+scoreData);

  this.client.hmset(key_score + scoreId,
    field_userId, userId,
    field_featureId, featureId,
    field_date, date,
    field_score, rawScore,
    field_scoreData, JSON.stringify(scoreData),
    (err, resp) => {
      addUserPeriodicBestScore.call(this, userId, featureId, scoreId, rawScore);
      callback;
    });
}

function addUserPeriodicBestScore (userId, featureId, scoreId, rawScore) {
  // add alltime bestscore
  upsertUserBestScore.call(this, userId, featureId, scoreId, rawScore, key_userFeatureAllTimeBestScoreId, key_featureAllTimeBestScoreId);

  if (this.dailyBoard) {
    upsertUserBestScore.call(this, userId, featureId, scoreId, rawScore, key_userFeatureDailyBestScoreId, key_featureDailyBestScoreId);
  }
  if (this.weeklyBoard) {
    upsertUserBestScore.call(this, userId, featureId, scoreId, rawScore, key_userFeatureWeeklyBestScoreId, key_featureWeeklyBestScoreId);
  }
  if (this.monthlyBoard) {
    upsertUserBestScore.call(this, userId, featureId, scoreId, rawScore, key_userFeatureMonthlyBestScoreId, key_featureMonthlyBestScoreId);
  }
}

/**
 * Upserts user best score into the all time, daily, weekly, monthly scoreboards
 * @param  {[type]} userId                   [description]
 * @param  {[type]} featureId                [description]
 * @param  {[type]} scoreId                  [description]
 * @param  {[type]} rawScore                 [description]
 * @param  {[type]} key_userFeatureBestScore [description]
 * @param  {[type]} key_featureBestScore     [description]
 * @return {[type]}                          [description]
 */
function upsertUserBestScore (userId, featureId, scoreId, rawScore, key_userFeatureBestScore, key_featureBestScore) {
  // this.logger.debug('rawScore='+rawScore);
  let userFeatureBestScoreKey = key_userFeatureBestScore + userId + '_' + featureId;

  let setBestScore = (userId, featureId, scoreId, rawScore) => {
    //hashed set of user and the score object id of his best score
    this.client.hset(userFeatureBestScoreKey, field_best_score, scoreId);

    //sorted set for each feature in order of rawSCore of the user
    this.client.zadd(key_featureBestScore + featureId, rawScore, userId);
  }

  let bestScoreIdCallback = (err, bestScoreId) => {
    if (bestScoreId == null) {
      setBestScore(userId, featureId, scoreId, rawScore);
      return;
    }
    // get score object to compare and replace best scoreId  if new score is higher
    this.client.hget(key_score + bestScoreId, field_score, (err, prevBestScore) => {
      if (rawScore > prevBestScore) {
        setBestScore(userId, featureId, scoreId, rawScore);
      }
    });
  }
  this.client.hget(userFeatureBestScoreKey, field_best_score, bestScoreIdCallback);
}

/**
 * [getUserFeatureBestScore description]
 * @param  {[type]}   leaderboard    [description]
 * @param  {[type]}   userId    [description]
 * @param  {[type]}   featureId [description]
 * @param  {Function} callback  [description]
 * @return {[type]}             [description]
 */
RedisEndpoint.prototype.getUserBestScore = function (leaderboard, userId, featureId, callback, returnOptions) {
  var key = getKeyUserFeatureBestScore.call(this, leaderboard);
  getUserFeatureBestScore.call(this, userId, featureId, callback, key, returnOptions);
}

function getUserFeatureBestScore(userId, featureId, callback, key_userFeatureBestScore, returnOptions) {
  let userFeatureBestScoreKey = key_userFeatureBestScore + userId + '_' + featureId;
  this.client.hget(userFeatureBestScoreKey, field_best_score, (err, scoreId) => {
    this.client.hgetall(key_score + scoreId, (err, score) => {
      if (err)
        callback(err, score);
      returnFilteredScore.call(this, err, score, returnOptions, callback);
    });
  });
}

function returnFilteredScore (err, score, returnOptions, callback) {
  if (score === null) callback(err, score);

  returnOptions = returnOptions || {};
  var rawScore = returnOptions.rawscore || true,
      scoreData = returnOptions.scoreData || false,
      date = returnOptions.date || false;

  var scoreObject = {};
  if (scoreData || date) {
    if (scoreData) scoreObject.scoreData = score.score_data;
    if (date) scoreObject.date = score.date;
    if (rawScore) scoreObject.rawScore = score.score;
  } else {
    scoreObject = score.score;
  }
  callback(err, scoreObject);
}

/*
* Returns the userIds in descending order of their scores (highest score first)
*/
RedisEndpoint.prototype.getLeaderboard = function (leaderboard, featureId, fromIndex, toIndex, callback) {
  var key = getKeyFeatureBestScore.call(this, leaderboard) + featureId;
  this.client.zrevrange(key, fromIndex, toIndex , callback);
}

RedisEndpoint.prototype.getAroundMeLeaderboard = function (userId, leaderboard, featureId, range, callback) {
  this.getRank(leaderboard, userId, featureId, (err, rank) => {
    if (err)
      callback(err, rank);
    var fromRank = rank - range;
    var toRank = rank + range;
    this.getLeaderboard(leaderboard, featureId, fromRank, toRank, callback)
  });
}

/**
 * Returns the rank of the user start from 0
 */
RedisEndpoint.prototype.getRank = function (leaderboard, userId, featureId, callback) {
  var key = getKeyFeatureBestScore.call(this, leaderboard) + featureId;
  this.client.zrevrank(key, userId, callback);
}

function getKeyFeatureBestScore (leaderboard) {
  if (leaderboard === daily) {
    return key_featureDailyBestScoreId;
  } else if (leaderboard === weekly) {
    return key_featureWeeklyBestScoreId;
  } else if (leaderboard === monthly) {
    return key_featureMonthlyBestScoreId;
  } else {
    return key_featureAllTimeBestScoreId;
  }
}

function getKeyUserFeatureBestScore (leaderboard) {
  if (leaderboard === daily) {
    return key_userFeatureDailyBestScoreId;
  } else if (leaderboard === weekly) {
    return key_userFeatureWeeklyBestScoreId;
  } else if (leaderboard === monthly) {
    return key_userFeatureMonthlyBestScoreId;
  } else {
    return key_userFeatureAllTimeBestScoreId;
  }
}

// // Returns all scores of the userId for the featureId
// s(userId, featureId, callback) {
//   this.client.sinter(key_userId + userId, key_featureId + featureId, callback);
// }
//
// // Returns all scores of the featureId
// s(featureId, callback) {
//   this.logger.debug('s');
//   var scores = [];
//
//   let sByIds = (err, scoreIds) => {
//     for (let scoreId of scoreIds) {
//       this.client.hgetall(key_score + scoreId, (err, score) => {
//         scores.push(score);
//         if (scores.length == scoreIds.length) {
//           this.logger.debug('return scores');
//           callback(err, scores);
//         }
//       });
//     }
//   }
//
//   this.client.smembers(key_featureId + featureId, sByIds);
// }
exports.RedisEndpoint = RedisEndpoint;
