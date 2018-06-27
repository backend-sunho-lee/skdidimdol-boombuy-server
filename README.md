# BOOMBUY

분할결제 서비스 제공 안드로이드 앱
선물을 줄 때 저렴한 선물을 주기엔 미안하고, 비싼 선물을 주기엔 너무 부담되는 사람들의 니즈를 충족시키는 것이 목적입니다.

> 현재 레포지토리는 Back-end 부분만 있습니다. [안드로이드 코드 보러가기](https://github.com/sssunho/boombuy_android)


### 특징

- 상품을 ​친구들과 ​함께 1/N로 ​결제하여 ​선물하기
- 다양한 ​결제 ​수단 ​제공
- 받은 ​선물은 ​바코드로 ​쉽게 ​확인가능
- 주소록 ​동기화로 ​친구 ​목록 ​생성




## 개발도구

- AWS
- ubuntu
- Node.js
- WebStorm
- MySQL
- Firebase




## ERD

![erd](/Users/sunny/boombuy_server/public/erd.png)




## 서버 아키텍처

![server_architecture](/Users/sunny/boombuy_server/public/server_architecture.png)


#### AWS

- EC2​ ​서비스로​ ​ubuntu​ ​서버를​ ​설치하여​ ​사용함
- 한​ ​개의​ ​RDS​ ​인스턴스에서​ ​MySQL로​ ​DB를​ ​관리함
- S3​ ​스토리지를​ ​사용하여​ ​정적​ ​자원(사진,​ ​동영상)을​ ​저장함. 데이터베이스에는​ ​S3​ ​URL을​ ​저장하여​ ​사용함
- SES,​ ​메일​ ​서비스


#### Node.js

- ​express 웹 프레임워크를 이용하여 Rest API 작성, 메소드와 URL별로 미들웨어를 나눠서 서비스함
- ​passport 모듈로 페이스북 연동 로그인을 구현함
- node-gcm​ ​모듈로​ ​푸쉬​ ​알림을​ ​보냄
- winston으로​ ​로깅​ ​기능​ ​구현


#### 보안

- SSL/TLS로​ ​암호화를​ ​사용하여​ ​네트워크​ ​보안
- 데이터베이스에​ ​저장되는​ ​개인​ ​정보는​ ​AES256,​ ​SHA256을​ ​통해​ ​암호화

