define({ "api": [
  {
    "type": "get",
    "url": "/auth/local/logout",
    "title": "Local LogOut",
    "name": "PostLocalLogOut",
    "group": "Auth",
    "description": "<p>로그아웃. 세션에서 사용자 정보를 지운다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n   \"message\": \"LogOut successful\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "post",
    "url": "/auth/local/login",
    "title": "Local Login",
    "name": "PostLocalLogin",
    "group": "Auth",
    "description": "<p>사용자가 입력한 phone과 password, 사용자의 FCM 토큰을 받아 로그인한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "phone",
            "description": "<p>Users unique Phone number.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Users unique Password.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>Users unique token.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n   \"message\": \"LogIn Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"LogIn Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "get",
    "url": "/brands",
    "title": "Brands listing",
    "name": "GetBrands",
    "group": "Brands",
    "description": "<p>브랜드 목록을 조회한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "page",
            "description": "<p>Page number</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "rows",
            "description": "<p>Number of outputs per page.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Next Page URL</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Brands info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"다음 페이지 URL\"\n  \"result\": [\n    {\n     \"bid\": 1   // 브랜드 번호,\n     \"name\": \"브랜드 이름\",\n     \"notice\": \"브랜드 구매 주의사항\"\n     \"location\": \"브랜드 이미지 사진 URL\"\n    }, ...\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Brand Listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/brands.js",
    "groupTitle": "Brands"
  },
  {
    "type": "get",
    "url": "/brands/:bid",
    "title": "Item listing by brand",
    "name": "GetItemsByBrands",
    "group": "Brands",
    "description": "<p>bid에 해당하는 브랜드의 상품 목록을 조회한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "bid",
            "description": "<p>Brand number</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "page",
            "description": "<p>Page number</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "rows",
            "description": "<p>Number of outputs per page.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Next Page URL</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Brands info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"다음 페이지 URL\"\n  \"result\": [\n    {\n      \"id\": 1   // 상품 번호,\n      \"bid\": 2  // 브랜드 번호,\n      \"name\": \"상품 이름\",\n      \"price\": 11900   // 상품 가격,\n      \"detail\": \"상품정보\",\n      \"notice\": \"주의사항\",\n      \"location\": \"상품 이미지 URL\"\n    }, ...\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Item Listing by brand Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/brands.js",
    "groupTitle": "Brands"
  },
  {
    "type": "get",
    "url": "/friends",
    "title": "Friends listing",
    "name": "GetFriends",
    "group": "Friends",
    "description": "<p>사용자의 친구 목록을 불러온다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Friends info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"다음 페이지 URL\"\n  \"result\": [\n    {\n      \"uid\": 1   // 사용자 번호,\n      \"phone\": \"사용자 전화번호\",\n      \"name\": \"사용자 이름\",\n      \"location\": \"상품 이미지 URL\"\n    }, ...\n  ]\n}\n{\n  \"message\": \"친구가 없습니다.\",\n  \"result\": []\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Friends listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/friends.js",
    "groupTitle": "Friends"
  },
  {
    "type": "post",
    "url": "/friends",
    "title": "Friends registration or change",
    "name": "PostFriends",
    "group": "Friends",
    "description": "<p>사용자 전화번호부를 불러와 그 중에서 회원가입한 사용자를 친구로 등록한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Array",
            "optional": false,
            "field": "phone",
            "description": "<p>phone number array</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result",
            "description": "<p>Brands info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"Friends registration or change Succeed\"\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Friends registration or change Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/friends.js",
    "groupTitle": "Friends"
  },
  {
    "type": "get",
    "url": "/items",
    "title": "Item listing",
    "name": "GetItems",
    "group": "Items",
    "description": "<p>모든 상품 목록을 조회한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "page",
            "description": "<p>Page number</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "rows",
            "description": "<p>Number of outputs per page.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Next Page URL</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Items info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"다음 페이지 URL\"\n  \"result\": [\n    {\n      \"id\": 1   // 상품 번호,\n      \"bid\": 2  // 브랜드 번호,\n      \"name\": \"상품 이름\",\n      \"price\": 11900   // 상품 가격,\n      \"detail\": \"상품정보\",\n      \"notice\": \"주의사항\",\n      \"location\": \"상품 이미지 URL\"\n    }, ...\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"All Items Listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/items.js",
    "groupTitle": "Items"
  },
  {
    "type": "get",
    "url": "/items/:iid",
    "title": "Item info",
    "name": "GetItemsInfo",
    "group": "Items",
    "description": "<p>iid에 해당하는 상품 정보를 조회한다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Items info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"result\": [\n    {\n      \"id\": 1   // 상품 번호,\n      \"name\": \"상품 이름\",\n      \"price\": 11900   // 상품 가격,\n      \"detail\": \"상품정보\",\n      \"location\": \"상품 이미지 URL\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Item info Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/items.js",
    "groupTitle": "Items"
  },
  {
    "type": "get",
    "url": "/items/voucher",
    "title": "Vouchers listing",
    "name": "GetVoucher",
    "group": "Items",
    "description": "<p>모든 상품권 목록을 조회한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "page",
            "description": "<p>Page number</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "rows",
            "description": "<p>Number of outputs per page.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Next Page URL</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Items info</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"다음 페이지 URL\"\n  \"result\": [\n    {\n      \"id\": 1   // 상품 번호,\n      \"bid\": 2  // 브랜드 번호,\n      \"name\": \"상품 이름\",\n      \"price\": 11900   // 상품 가격,\n      \"detail\": \"상품정보\",\n      \"notice\": \"주의사항\",\n      \"location\": \"상품 이미지 URL\"\n    }, ...\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"All Voucher Listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/items.js",
    "groupTitle": "Items"
  },
  {
    "type": "get",
    "url": "/orders/receive",
    "title": "Receive orders listing",
    "name": "GetReceiveOrder",
    "group": "Order",
    "description": "<p>사용자가 받은 선물 목록을 조회한다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Receive Orders listing</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"result\": [\n    {\n      \"oid\": 10   // 주문번호,\n      \"state\": \"주문 진행 상태\",\n      \"orderstime\": \"주문등록 시간\",\n      \"receiver\": \"받는사람 이름\",\n      \"receiverphoto\": \"받는 사람 이미지 URL\",\n      \"sender\": \"보내는 사람 이름\",\n      \"senderphoto\": \"보내는 사람 중 대표 이미지 URL\",\n      \"cnt\": 1  // 보내는 사람 중 대표자를 뺀 사람 수\n    },\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Receive orders listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/orders.js",
    "groupTitle": "Order"
  },
  {
    "type": "get",
    "url": "/orders/send",
    "title": "Sent orders listing",
    "name": "GetSendOrder",
    "group": "Order",
    "description": "<p>사용자가 보낸 선물 목록을 조회한다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result",
            "description": "<p>Sent orders listing</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"result\": [\n    {\n      \"oid\": 10   // 주문번호,\n      \"state\": \"진행중\"  // 주문 진행 상태,\n      \"orderstime\": \"2017-04-15T04:47:26.000Z\"  // 주문등록 시간,\n      \"receiver\": \"받는사람 이름\",\n      \"receiverphoto\": \"받는 사람 이미지 URL\",\n      \"sender\": \"보내는 사람 이름\",\n      \"senderphoto\": \"보내는 사람 중 대표 이미지 URL\",\n      \"cnt\": 1  // 보내는 사람 중 대표자를 뺀 사람 수\n    },\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"sent orders listing Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/orders.js",
    "groupTitle": "Order"
  },
  {
    "type": "get",
    "url": "/orders/send/:oid",
    "title": "Sent order info",
    "name": "GetSendOrderInfo",
    "group": "Order",
    "description": "<p>oid에 해당하는 보낸 선물의 정보를 조회한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "oid",
            "description": "<p>Order number</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"result\": [\n    \"orders\": {\n       \"oid\": 9   // 주문번호,\n       \"state\": \"주문진행 상태\",\n       \"orderstime\": \"주문등록한 시간\",\n       \"receiver\": \"선물받을 사람\",\n       \"receiverphoto\": \"선물받을 사람 이미지 URL\",\n       \"sender\": \"선물보낸 사람 중 대표자\",\n       \"senderphoto\": \"대표자 이미지 URL\",\n       \"cnt\": 0\n     },\n     \"settlements\": [\n       {\n         \"oid\": 9   // 주문번호,\n         \"sender\": \"보내는사람 번호\",\n         \"name\": \"보내는사람 이름\",\n         \"cost\": 10000  // 구매할 총 금액,\n         \"state\": \"결제 상태\",\n         \"location\": \"보내는사람 이미지 URL\"\n       }\n     ],\n     \"carts\": [\n       {\n         \"oid\": 9   // 주문번호,\n         \"iid\": 3   // 상품번호,\n         \"name\": \"상품 이름\",\n         \"price\": 24000   // 상품 가격,\n         \"location\": \"상품 이미지 URL\"\n       }, ...\n     ]\n   }\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Order info Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/orders.js",
    "groupTitle": "Order"
  },
  {
    "type": "post",
    "url": "/orders",
    "title": "Order Registration",
    "name": "PostOrder",
    "group": "Order",
    "description": "<p>주문을 등록한다. 주문 등록 성공시, 선물 받는 사람과 보내는 사람들에게 FCM 알림을 보낸다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "receiver",
            "description": "<p>A friend to present</p>"
          },
          {
            "group": "Parameter",
            "type": "Array",
            "optional": false,
            "field": "senders",
            "description": "<p>Friends to send gifts</p>"
          },
          {
            "group": "Parameter",
            "type": "Array",
            "optional": false,
            "field": "carts",
            "description": "<p>Items to present</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"Order Registration Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Order Registration Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/orders.js",
    "groupTitle": "Order"
  },
  {
    "type": "put",
    "url": "/orders/:oid",
    "title": "Update settlement status",
    "name": "PutOrder",
    "group": "Order",
    "description": "<p>oid에 해당하는 사용자의 결제 상태를 변경한다. 주문상태 변경 후, 모두 결제 완료 알림이 발송되고, 한명이 남았을 경우 독촉 알림이 발송된다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "oid",
            "description": "<p>Order number</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"message\": \"결제 성공! 주문이 완료됐습니다. 알람이 발송 됩니다.\"\n}\n{\n  \"message\": \"결제 성공! '가나다'님만 결제하면 주문이 완료됩니다.\"\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Order Registration Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/orders.js",
    "groupTitle": "Order"
  },
  {
    "type": "get",
    "url": "/users/me",
    "title": "User info",
    "name": "GetUser",
    "group": "User",
    "description": "<p>사용자의 정보를 조회한다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n   \"message\": \"사용자 정보 조회 성공\",\n   \"result\": {\n     \"id\": 469  // 사용자 번호,\n     \"phone\": \"사용자 전화번호\",\n     \"name\": \"사용자 이름\",\n     \"token\": \"사용자 토큰\",\n     \"location\": \"사용자 이미지 URL\"\n   }\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"사용자 정보 조회 실패\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "User"
  },
  {
    "type": "post",
    "url": "/users",
    "title": "Sign Up",
    "name": "PostUser",
    "group": "User",
    "description": "<p>사용자가 입력한 phone, name, password와 FCM token을 입력받아 회원가입한다.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "phone",
            "description": "<p>Users unique Phone number.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Users unique Name.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Users unique Password.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>Users unique FCM token.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n   \"message\": \"Sign Up Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"Sign Up Failed\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "User"
  },
  {
    "type": "put",
    "url": "/users/me",
    "title": "Update User image",
    "name": "PutUser",
    "group": "User",
    "description": "<p>사용자의 프로필 사진을 변경한다.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Success Message</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n   \"message\": \"사진 변경 성공\"\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 400 Bad Request\n{\n  \"message\": \"사진 변경 실패\"\n}",
          "type": "json"
        }
      ],
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "BadRequest",
            "description": "<p>All values ​​are not entered.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "User"
  }
] });
