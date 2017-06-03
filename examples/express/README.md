# express sample
This sample shows how to use maracuya with an express server.

## Running the sample
```
node .
```

## Testing the sample
```
ab -p body.json -T application/json -c 20 -n 5 -v 4 http://localhost:3000/take
```

You will see output similar to the one below. As you can see, the first two requests are allowed and the latter two aren't.
```
LOG: header received:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 16
ETag: W/"10-MlRbwudyJbmWfLYb+WnjuMDGxQ4"
Date: Sat, 03 Jun 2017 21:04:54 GMT
Connection: close

{"allowed":true}
LOG: header received:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 16
ETag: W/"10-MlRbwudyJbmWfLYb+WnjuMDGxQ4"
Date: Sat, 03 Jun 2017 21:04:54 GMT
Connection: close

{"allowed":true}
LOG: header received:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 17
ETag: W/"11-8KR4tKtRc6aRqvf3kBaXM3Vp4vA"
Date: Sat, 03 Jun 2017 21:04:54 GMT
Connection: close

{"allowed":false}
LOG: header received:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 17
ETag: W/"11-8KR4tKtRc6aRqvf3kBaXM3Vp4vA"
Date: Sat, 03 Jun 2017 21:04:54 GMT
Connection: close

{"allowed":false}
..done
```
