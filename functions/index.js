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
    userSnapshot.forEach(function (operatorSnapshot) {
      operatorSnapshot.forEach(function (networkSnapshot) {
        networkSnapshot.forEach(function (cellSnapshot) {
          var dataJSON = cellSnapshot.toJSON()
          for (var item in dataJSON) {
            var point1 = new Point(dataJSON[item].cellId, dataJSON[item].cellType, dataJSON[item].lac, dataJSON[item].latitude, dataJSON[item].longitude, dataJSON[item].signalStrength)

            if (point1.cellType === undefined) {
              point1.cellType = 'UNKNOWN'
            }
            var tab = []
            for (var jtem = item in dataJSON) {
              if ((dataJSON[jtem].latitude === point1.lat) && (dataJSON[jtem].longitude === point1.lng)) {
                tab.push(dataJSON[jtem].signalStrength)
                // console.log(jtem)
                var db = admin.database()
                var ref2 = db.ref(abc.key + '/' + operatorSnapshot.key + '/' + networkSnapshot.key + '/' + cellSnapshot.key + '/' + jtem)
                ref2.remove()
                // console.log(abc.child(jtem).key)
              }
            }
            if (tab.length > 0) {
              var sum = point1.signal
              for (var i = 0; i < tab.length; i++) {
                sum = sum + tab[i]
              }
              var mean = sum / (tab.length + 1)
              var db2 = admin.database()
              var refe = db2.ref(abc.key + '/' + operatorSnapshot.key + '/' + networkSnapshot.key + '/' + cellSnapshot.key + '/' + item)
              refe.update({
                cellId: point1.cellId,
                cellType: point1.cellType,
                lac: point1.lac,
                latitude: point1.lat,
                longitude: point1.lng,
                signalStrength: mean
              })
            }
          }
        })
      })
    })
  })
  return true
})
