# neaderboardjs

A NodeJS leaderboard module that besides the all-time leaderboard supports also periodic leaderboards: daily, weekly, monthly options backed by [Redis](http://redis.io).

## Installation

`npm install neaderboard`
Make sure your redis server is running! Redis configuration is outside the scope of this README, but
check out the [Redis quickstart](https://redis.io/topics/quickstart).

## Setup
```javascript
var neaterboardjs = require('neaterboard');
var Neaterboard = neaterboardjs.Neaterboard;
```

### Creating a leaderboard

Create a new leaderboard. This will create an all-time leaderboard.

```javascript
var neaterboard = new Neaterboard();
```

If you have redis-server running on the same machine as node, then the default Neaterboard constructure will create a default RedisClient with default port and host. If you want to supply configuration for your RedisClient, look into [node_redis#rediscreateclient] (https://github.com/NodeRedis/node_redis#rediscreateclient)

### Adding and removing periodic leaderboards
`addLeaderboards(options)`

```javascript
neaterboard.addLeaderboards({daily: true, weekly:true, monthly:true});
```
removeLeaderboards(options);
```javascript
neaterboard.removeLeaderboards({daily: true, weekly:true, monthly:true});
```
### Insert
`insertScore(userId, rawScore, callback[, options])`

without options:
```javascript
neaterboard.insertScore('fred', 100, (err, res) => {
  console.log(res);
});
```

with options:
* featureId: a game feature
* date: default is set to the inserted date
* scoreData: any additional score data in JSON string or a simple string

```javascript
neaterboard.insertScore('fred', 100, (err, res) => {
  console.log(res);
}, {featureId: 'quiz 1', scoreData: {timeTaken:'1000'}});
```

### Getting the leaderboard
`getLeaderboard(callback, options)`

options:
* leaderboard: daily | weekly | monthly. Default is set to all-time
* featureId: a game feature or none
* fromRank: zero-based start index of the leaderboard to return
* toRank: zero-based end index of the leaderboard to return. If fromRank and toRank is not given, the function returns the entire leaderboard

```javascript
neaterboard.getLeaderboard((err, userIds) => {
  console.log('userIds='+userIds);
});
```

```javascript
neaterboard.getLeaderboard((err, userIds) => {
  console.log('userIds='+userIds);
}, {leaderboard:'daily', featureId:'quiz 1', fromRank:5, toRank:10});
```

`getAroundMeLeaderboard(userId, callback, options)`
Returns the leaderboard within a given range around the rank of the given user.

options:
* leaderboard: daily | weekly | monthly. Default is set to all-time
* featureId: a game feature or none
* range: a positive number. If no range is specified, the returned leanderboard contains all ranks +/- 10 around the given user


### Getting the rank of a user on a leaderboard
`getRank(userId, callback, options)`
Returns the zero-based rank of the user.

options:
* leaderboard: daily | weekly | monthly. Default is set to all-time
* featureId: a game feature or none

```javascript
neaterboard.getRank('fred', (err, rank) => {
  console.log('rank=' + rank);
});
```

```javascript
neaterboard.getRank('fred', (err, rank) => {
  console.log('rank=' + rank);
}, {leaderboard: 'weekly', featureId: 'quiz 1'});
```

#### Retrieving user's best score
`getUserBestScore(userId, callback, getOptions, returnOptions) `

getOptions:
* leaderboard: daily | weekly | monthly. Default is set to all-time
* featureId: a game feature or none

returnOptions:
If no returnOptions are passed, only the rawScore is returned, otherwise the function returns a json object contains the data specified in returnOptions.
* rawScore: the inserted rawScore
* scoreData: any additional score data in JSON string or a simple string
* date: default is set to the inserted date

```javascript
neaterboard.getUserBestScore('fred', (err, score) => {
  console.log('score=' + score);
});
```

```javascript
neaterboard.getUserBestScore('fred', (err, score) => {
  console.log('rank=' + score);
},{leaderboard:'daily', featureId:'quiz 1'}, {date:true, scoreData:true});
```
## Copyright
Copyright (c) 2017 Thanh Nm. See LICENSE.txt for further details.
