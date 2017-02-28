var http = require('http')
, fs = require('fs')
, url = require('url')
, port = 8080
, s = require('string') //stringjs.com
, MongoClient = require('mongodb').MongoClient
, assert = require('assert');
var dbUrl = 'mongodb://localhost:27017/LaundryBuddy';

MongoClient.connect(dbUrl, function(err, db) {
  assert.equal(null, err);
  console.log("Database Test: Connected to database with no issues!");
  db.close();
})

var server = http.createServer (function (req, res) {
  var uri =url.parse(req.url)
  switch( uri.pathname) {
    case '/':
      sendFile(res, 'index.html', 'text/html')
      break
    case '/getPlaceInfo':
      getPlaceInfo(req, res)
      break
    case '/checkIn':
      checkIn(req, res)
      break
    case '/updateMachines':
      updateMachines(req, res)
      break
    case '/newLocation':
      newLocation(req, res)
      break
    case '/deleteLocation':
      deleteLocation(req, res)
      break
    default:
      res.end('404: You arent supposed to be here. Go away.')
  }
});

server.listen(process.env.PORT || port)
console.log('listening!')

//subroutines

function deleteLocation(req, res) {
  var contentType = 'text/html'
  if(req.method == 'POST') {
    var body = ' ';
    req.on('data', function (data) {
      body += data;
      if(body.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', function(data) {
      var targetLocation = JSON.parse(s(body).strip('locationID=').s.trim());
      console.log("deleteLocation: " + JSON.stringify(targetLocation));
      removeLocationDB(targetLocation.locationID, function(){
        var JSONresultCode = {
          "result" : "200"
        }
        res.end(JSON.stringify(JSONresultCode));
      })
    })
  } else {
    var JSONresultCode = {
      "result" : "400"
    }
    res.end(JSON.stringify(JSONresultCode));
  }
}

function newLocation(req, res) {
    var contentType = 'text/html'
    if(req.method == 'POST') {
      var body = ' ';
      req.on('data', function (data) {
        body += data;
        if(body.length > 1e6) {
          req.connection.destroy();
        }
      });
      req.on('end', function(data) {
        var newLocation = JSON.parse(s(body).strip('newLocationJSON=').s.trim());
        console.log("newLocation: " + JSON.stringify(newLocation));
        getLocationDB(newLocation.locationID, function(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList){
          if(locationID != -1) {
            console.log("newLocation: call attempted to duplicate an existing location. Ignoring.");
            var JSONresultCode = {
              "result" : "403"
            }
            res.end(JSON.stringify(JSONresultCode));
          } else {
            insertLocationDB(newLocation.locationID, newLocation.locationName, newLocation.washerCount, newLocation.washersInUse, newLocation.dryerCount, newLocation.dryersInUse, newLocation.checkInCount, newLocation.machineList, function(){
              var JSONresultCode = {
                "result" : "200"
              }
              res.end(JSON.stringify(JSONresultCode));
            });
          }
        });
      });
    } else {
      console.log("newLocation: Bad Request!");
      var JSONresultCode = {
        "result" : "400"
      }
      res.end(JSON.stringify(JSONresultCode));
    }
}

function checkIn(req, res) {
  var contentType = 'text/html'
  if(req.method == 'POST') {
    var body = ' ';
    req.on('data', function (data) {
      body += data;
      if(body.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', function(data) {
      var checkInAction = JSON.parse(s(body).strip('checkInAction=').s.trim());
      console.log("checkIn: " + JSON.stringify(checkInAction));
      getLocationDB(checkInAction.locationID, function(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList){
        if(locationID == -1) {
          console.log("checkIn: Bad Request, Invalid Location!");
          var JSONresultCode = {
            "result" : "404"
          }
          res.end(JSON.stringify(JSONresultCode));
        } else {
          var editedCheckInCount = checkInCount;
          if(checkInAction.inLocation = true) {
            editedCheckInCount = (editedCheckInCount + 1);
          } else {
            editedCheckInCount = (editedCheckInCount - 1);
          }
            updateLocationDB(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, editedCheckInCount, machineList, function(){
              var JSONresultCode = {
                "result" : "200"
              }
              res.end(JSON.stringify(JSONresultCode));
            });
        }
      })
    });
  } else {
    console.log("checkIn: Bad Request!");
    var JSONresultCode = {
      "result" : "400"
    }
    res.end(JSON.stringify(JSONresultCode));
  }
}

function sendFile(res, filename, contentType) {
  contentType = contentType || 'text/html'

  fs.readFile(filename, function(error, content) {
    res.writeHead(200, {'Content-type': contentType})
    res.end(content, 'utf-8')
  })
}

function getPlaceInfo(req, res) {
  var contentType = 'text/html'

  if (req.method == 'POST') {
    var body = ' ';
    req.on('data', function (data) {
      body += data;
      if(body.length > 1e6) {
        req.connection.destroy();
      }
    });

    req.on('end', function() {
      console.log("request for location: " + body);
      var locationRequestedString = s(body).strip('location=').s.trim();
      var locationRequestedJSON = JSON.parse(locationRequestedString);
      getLocationDB(locationRequestedJSON.location, function(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList){
        var locationInfoJSON = {
          "locationID" : locationID,
          "locationName" : locationName,
          "washerCount" : washerCount,
          "washersInUse" : washersInUse,
          "dryerCount" : dryerCount,
          "dryersInUse" : dryersInUse,
          "checkInCount" : checkInCount,
          "machineList" : machineList
        }
        res.end(JSON.stringify(locationInfoJSON));
      })
    })
  } else {
    var JSONresultCode = {
      "result" : "400"
    }
    res.end(JSON.stringify(JSONresultCode));
    console.log('getPlaceInfo: Bad request')
  }
}

function updateMachines(req, res) {
  var contentType = 'text/html'
 if(req.method == 'POST') {
   var body = ' ';
   req.on('data', function (data) {
     body += data;
     if(body.length > 1e6) {
       req.connection.destroy();
     }
   });
   req.on('end', function() {
     var processedBody = s(body).strip('checkInJSON=').s.trim();
     console.log("updateMachines: " + processedBody);
     var checkInInfo = JSON.parse(processedBody)
     getLocationDB(checkInInfo.locationID, function(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList){
       if(locationID == -1) {
         res.end("Bad Request: Location Not Found!");
         console.log('updateMachines: Bad request, Location Not Found!');
       } else {
         var editedWashersInUse = washersInUse;
         var editedDryersInUse = dryersInUse;
         var editedMachineList = machineList;
         checkInInfo.dryerChanges.forEach(function(dryerObj) {
           if(dryerObj.newState == "inUse") {
             if (!(S(machineList[dryerObj.machNum].state).contains('inUse'))){
               editedMachineList[dryerObj.machNum].state = "inUse"
               editedDryersInUse++;
             }
           } else {
             if(!(S(machineList[dryerObj.machNum].state).contains('free'))){
               machineList[dryerObj.machNum].state = "free"
               editedDryersInUse--;
             }
           }
         });
         checkInInfo.washerChanges.forEach(function(washerObj) {
           if(washerObj.newState == "inUse") {
             if (!(S(machineList[washerObj.machNum].state).contains('inUse'))){
               editedMachineList[washerObj.machNum].state = "inUse"
               editedWashersInUse++;
             }
           } else {
             if(!(S(machineList[washerObj.machNum].state).contains('free'))){
               machineList[washerObj.machNum].state = "free"
               editedWashersInUse--;
             }
           }
         });

         updateLocationDB(locationID, locationName, washerCount, editedWashersInUse, dryerCount, editedDryersInUse, CheckInCount, editedMachineList, function(){
           var JSONresultCode = {
             "result" : "200"
           }
           res.end(JSON.stringify(JSONresultCode));
         })
       }
     })
   })
 } else {
   var JSONresultCode = {
     "result" : "400"
   }
   res.end(JSON.stringify(JSONresultCode));
   console.log('updateMachines: Bad request');
 }
}

function updateLocationDB(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    console.log("updateLocationDB: Connected to database with no issues!");
    db.collection('laundromats').updateOne({"locationID" : locationID},{
      $set: {"washersInUse": washersInUse},
      $set: {"dryersInUse": dryersInUse},
      $set: {"machineList": machineList}
    }, function(err, results) {
      console.log("updateLocationDB: " +results);
      db.close();
      callback();
    })
  })
}

function getLocationDB(locationRequested, callback) {
  var locationID = -1;
  var locationName = "Unknown Location";
  var washerCount = 0;
  var washersInUse = 0;
  var dryerCount = 0;
  var dryersInUse = 0;
  var checkInCount = 0;
  var machineList = [];

  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    console.log("getLocationDB: Connected to database with no issues!");
    var cursor = db.collection('laundromats').find({"locationID" : locationRequested});
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if(doc != null) {
        locationID = doc.locationID;
        locationName = doc.locationName;
        washerCount = doc.washerCount;
        washersInUse = doc.washersInUse;
        dryerCount = doc.dryerCount;
        dryersInUse = doc.dryersInUse;
        checkInCount = doc.checkInCount;
        machineList = doc.machineList;
      } else {
        db.close();
        callback(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList);
      }
    })
  })
}

function insertLocationDB(locationID, locationName, washerCount, washersInUse, dryerCount, dryersInUse, checkInCount, machineList, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    console.log("insertLocationDB: Connected to database with no issues!");
    db.collection('laundromats').insertOne( {
      "locationID" : locationID,
      "locationName" : locationName,
      "washerCount" : washerCount,
      "washersInUse" : washersInUse,
      "dryerCount" : dryerCount,
      "dryersInUse" : dryersInUse,
      "checkInCount" : checkInCount,
      "machineList" : machineList
    }, function(err, result) {
      assert.equal(err, null);
      console.log("insertLocationDB: Inserted location: " + locationID);
      db.close();
      callback();
    });
  });
}

function removeLocationDB(locationID, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    console.log("removeLocationDB: Connected to database with no issues!");
    db.collection('laundromats').deleteOne(
      {"locationID" : locationID},
      function(err, results) {
        console.log("removeLocationDB: " + results);
        db.close();
        callback();
      });
  });
}
