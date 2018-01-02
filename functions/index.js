const functions = require('firebase-functions')

const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)

class Point {
  constructor (cellId, cellType, lac, lat, lng, signal) {
    this.cellId = cellId
    this.cellType = cellType
    this.lac = lac
    this.lat = lat
    this.lng = lng
    this.signal = signal
  }
}
exports.locpoint = functions.database.ref().onCreate(event => { // '/{mcc}/{operator}/{type}/{cellId}/{pushId}'
  const original = event.data
  var point1, mcc, operator, type
  original.forEach(function (mccSnapshot) {
    mcc = mccSnapshot.key
    mccSnapshot.forEach(function (operatorSnapshot) {
      operator = operatorSnapshot.key
      operatorSnapshot.forEach(function (typeSnapshot) {
        type = typeSnapshot.key
        typeSnapshot.forEach(function (cellSnapshot) {
          var dataJSON = cellSnapshot.toJSON()
          for (var item in dataJSON) {
            point1 = new Point(dataJSON[item].cellId, dataJSON[item].cellType, dataJSON[item].lac, dataJSON[item].latitude, dataJSON[item].longitude, dataJSON[item].signalStrength)

            if (point1.cellType === undefined) {
              point1.cellType = 'UNKNOWN'
            }
          }
        })
      })
    })
  })
  var ref = admin.database().ref(mcc + '/' + operator + '/' + type + '/' + point1.cellId)
  ref.once('value', function (dataSnapshot) {
    dataSnapshot.forEach(function (pointsSnapshot) {
      var cointained = cointainedIn(point1.lat, point1.lng, pointsSnapshot.val().latitude, pointsSnapshot.val().longitude)
      if (cointained === true) {
        var referenceSignal = dbmToLinear(pointsSnapshot.val().signalStrength)
        var pointSignal = dbmToLinear(point1.signal)
        var meanLinear = (referenceSignal + pointSignal) / 2.0
        var ref = admin.database().ref(mcc + '/' + operator + '/' + type + '/' + point1.cellId + '/' + pointsSnapshot.key)
        return ref.update({
          cellId: pointsSnapshot.val().cellId,
          cellType: pointsSnapshot.val().cellType,
          lac: pointsSnapshot.val().lac,
          latitude: pointsSnapshot.val().latitude,
          longitude: pointsSnapshot.val().longitude,
          signalStrength: linearTodBm(meanLinear)
        })
      }
    })
  })
  // console.log(original)
  return true
})

function cointainedIn (lat1, lng1, lat2, lng2) {
  // first check if the point is contained in circle of 5m radius around point (lat2,lng2)

  var distance = calculateDistance(lat1, lng1, lat2, lng2)
  var R = 6371e3
  var d = 5.0 * Math.sqrt(2)
  if (distance <= 5.0) {
    console.log('in')
    return true
  } else if (distance <= d) {
    // just check if lat and lng are withing bondaries of cornerss
    var cphi1 = Math.asin(Math.sin(lat2 * (Math.PI / 180)) * Math.cos(d / R) + Math.cos(lat2 * (Math.PI / 180)) * Math.sin(d / R) * Math.cos(Math.PI / 4))
    var cλ1 = (lng2 * (Math.PI / 180)) + Math.atan2(Math.sin(Math.PI / 4) * Math.sin(d / R) * Math.cos(lat2 * (Math.PI / 180)), Math.cos(d / R) - Math.sin(lat2 * (Math.PI / 180)) * Math.sin(cphi1))
    var cphi2 = Math.asin(Math.sin(lat2 * (Math.PI / 180)) * Math.cos(d / R) + Math.cos(lat2 * (Math.PI / 180)) * Math.sin(d / R) * Math.cos(3 * Math.PI / 4))
    var cλ2 = (lng2 * (Math.PI / 180)) + Math.atan2(Math.sin(3 * Math.PI / 4) * Math.sin(d / R) * Math.cos(lat2 * (Math.PI / 180)), Math.cos(d / R) - Math.sin(lat2 * (Math.PI / 180)) * Math.sin(cphi2))
    var cphi3 = Math.asin(Math.sin(lat2 * (Math.PI / 180)) * Math.cos(d / R) + Math.cos(lat2 * (Math.PI / 180)) * Math.sin(d / R) * Math.cos(-3 * Math.PI / 4))
    var cλ3 = (lng2 * (Math.PI / 180)) + Math.atan2(Math.sin(-3 * Math.PI / 4) * Math.sin(d / R) * Math.cos(lat2 * (Math.PI / 180)), Math.cos(d / R) - Math.sin(lat2 * (Math.PI / 180)) * Math.sin(cphi3))
    var cphi4 = Math.asin(Math.sin(lat2 * (Math.PI / 180)) * Math.cos(d / R) + Math.cos(lat2 * (Math.PI / 180)) * Math.sin(d / R) * Math.cos(-Math.PI / 4))
    var cλ4 = (lng2 * (Math.PI / 180)) + Math.atan2(Math.sin(-Math.PI / 4) * Math.sin(d / R) * Math.cos(lat2 * (Math.PI / 180)), Math.cos(d / R) - Math.sin(lat2 * (Math.PI / 180)) * Math.sin(cphi4))
    var clat1 = cphi1 * (180 / Math.PI)
    var clng1 = cλ1 * (180 / Math.PI)
    var clat2 = cphi2 * (180 / Math.PI)
    var clng2 = cλ2 * (180 / Math.PI)
    var clat3 = cphi3 * (180 / Math.PI)
    var clng3 = cλ3 * (180 / Math.PI)
    var clat4 = cphi4 * (180 / Math.PI)
    var clng4 = cλ4 * (180 / Math.PI)
    // border conditions
    var condition1 = lat1 <= clat1 && lng1 <= clng1
    var condition2 = lat1 >= clat2 && lng1 <= clng2
    var condition3 = lat1 >= clat3 && lng1 >= clng3
    var condition4 = lat1 <= clat4 && lng1 >= clng4
    if ((condition1 === true) && (condition2 === true) && (condition3 === true) && (condition4 === true)) {
      console.log('in')
      return true
    } else {
      console.log('out')
      return false
    }
  } else {
    console.log('out')
    return false
  }
}

function calculateDistance (lat1, lng1, lat2, lng2) {
  // Haversine formula
  var R = 6371e3
  var phi1 = lat1 * (Math.PI / 180)
  var phi2 = lat2 * (Math.PI / 180)
  var dLat = (lat2 - lat1) * (Math.PI / 180)
  var dLng = (lng2 - lng1) * (Math.PI / 180)

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  var d = R * c
  // console.log(d)
  return d
}

function dbmToLinear (dbm) {
  var ref = 1e-3
  var cal = Math.pow(10, dbm / 10)
  var value = ref * cal
  return value
}

function linearTodBm (linear) {
  var cal = 10 * Math.log10(linear / 1e-3)
  return cal
}
