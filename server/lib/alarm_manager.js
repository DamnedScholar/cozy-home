// Generated by CoffeeScript 1.6.3
var AlarmManager, CozyAdapter, RRule, oneDay, tDate, time,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

time = require('time');

tDate = time.Date;

CozyAdapter = require('jugglingdb-cozy-adapter');

RRule = require('rrule').RRule;

oneDay = 24 * 60 * 60 * 1000;

module.exports = AlarmManager = (function() {
  var handleNotification,
    _this = this;

  AlarmManager.prototype.dailytimer = null;

  AlarmManager.prototype.timeouts = {};

  function AlarmManager(timezone, Alarm, notificationhelper) {
    this.timezone = timezone;
    this.Alarm = Alarm;
    this.notificationhelper = notificationhelper;
    this.handleAlarm = __bind(this.handleAlarm, this);
    this.fetchAlarms = __bind(this.fetchAlarms, this);
    this.fetchAlarms();
  }

  AlarmManager.prototype.fetchAlarms = function() {
    var _this = this;
    this.dailytimer = setTimeout(this.fetchAlarms, oneDay);
    return this.Alarm.all(function(err, alarms) {
      var alarm, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = alarms.length; _i < _len; _i++) {
        alarm = alarms[_i];
        _results.push(_this.addAlarmCounters(alarm));
      }
      return _results;
    });
  };

  AlarmManager.prototype.clearTimeouts = function(id) {
    var timeout, _i, _len, _ref;
    if (this.timeouts[id] != null) {
      _ref = this.timeouts[id];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        timeout = _ref[_i];
        clearTimeout(timeout);
      }
      return delete this.timeouts[id];
    }
  };

  AlarmManager.prototype.handleAlarm = function(event, msg) {
    var _this = this;
    switch (event) {
      case "alarm.create":
        return this.Alarm.find(msg, function(err, alarm) {
          if (alarm) {
            return _this.addAlarmCounters(alarm);
          }
        });
      case "alarm.update":
        return this.Alarm.find(msg, function(err, alarm) {
          if (alarm) {
            return _this.addAlarmCounters(alarm);
          }
        });
      case "alarm.delete":
        return this.clearTimeouts(id);
    }
  };

  AlarmManager.prototype.addAlarmCounters = function(alarm) {
    var in24h, now, occurence, occurences, rrule, trigg, _i, _len, _ref, _results;
    this.clearTimeouts(alarm._id);
    now = new tDate();
    now.setTimezone(this.timezone);
    in24h = new tDate(now.getTime() + oneDay);
    in24h.setTimezone(this.timezone);
    trigg = new tDate(alarm.trigg);
    trigg.setTimezone('UTC');
    if (alarm.rrule) {
      rrule = RRule.parseString(alarm.rrule);
      rrule.dtstart = trigg;
      occurences = new RRule(rrule).between(now, in24h);
      occurences = occurences.map(function(string) {
        var occurence;
        occurence = new tDate(string);
        occurence.setTimezone(this.timezone);
        return occurence;
      });
    } else if ((now.getTime() <= (_ref = trigg.getTime()) && _ref < in24h.getTime())) {
      occurences = [trigg];
    } else {
      occurences = [];
    }
    _results = [];
    for (_i = 0, _len = occurences.length; _i < _len; _i++) {
      occurence = occurences[_i];
      _results.push(this.addAlarmCounter(alarm, occurence));
    }
    return _results;
  };

  AlarmManager.prototype.addAlarmCounter = function(alarm, triggerDate) {
    var delta, now, _base, _name,
      _this = this;
    now = new tDate();
    now.setTimezone(this.timezone);
    triggerDate.setTimezone(this.timezone);
    delta = triggerDate.getTime() - now.getTime();
    if (delta > 0) {
      console.info("Notification in " + (delta / 1000) + " seconds.");
      if ((_base = this.timeouts)[_name = alarm._id] == null) {
        _base[_name] = [];
      }
      return this.timeouts[alarm._id].push(setTimeout((function() {
        return _this.handleNotification(alarm);
      }), delta));
    }
  };

  handleNotification = function(alarm) {
    var data, resource, _ref, _ref1;
    if ((_ref = alarm.action) === 'DISPLAY' || _ref === 'BOTH') {
      resource = alarm.related != null ? alarm.related : {
        app: 'calendar',
        url: "/#list"
      };
      return AlarmManager.notificationhelper.createTemporary({
        text: "Reminder: " + alarm.description,
        resource: resource
      });
    } else if ((_ref1 = alarm.action) === 'EMAIL' || _ref1 === 'BOTH') {
      data = {
        from: "Cozy Agenda <no-reply@cozycloud.cc>",
        subject: "[Cozy-Agenda] Reminder",
        content: "Reminder: " + alarm.description
      };
      return CozyAdapter.sendMailToUser(data, function(error, response) {
        if (error != null) {
          return console.info(error);
        }
      });
    } else {
      return console.log("UNKNOWN ACTION TYPE");
    }
  };

  return AlarmManager;

}).call(this);
