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
exports.pointSanitization = functions.database.ref().onWrite(event => { // '/{mmc}/{operatorName}/{networkType}/{cellId}'
  var abc = admin.database().ref('260') // <-
  abc.once('value', function (userSnapshot) {
    userSnapshot.child('Orange').forEach(function (networkSnapshot) {
      networkSnapshot.forEach(function (cellSnapshot) {
        var dataJSON = cellSnapshot.toJSON()
        // console.log(dataJSON)
        // console.log(cellSnapshot.key)
        // iterate through data and find lat and lng matching points
        // calculate mean power of those points and leave only one point
        // for specific geographical location
        for (var item in dataJSON) {
          var point1 = new Point(dataJSON[item].cellId, dataJSON[item].cellType, dataJSON[item].lac, dataJSON[item].latitude, dataJSON[item].longitude, dataJSON[item].signalStrength)
          for (var jtem = item in dataJSON) {
            if ((dataJSON[jtem].cellId === point1.cellId) && (dataJSON[jtem].latitude === point1.lat) && (dataJSON[jtem].longitude === point1.lng)) {
              console.log(point1)
            }
          }
        }
      })
    })
  })
  return true
})
