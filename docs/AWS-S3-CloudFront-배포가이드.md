# 정적 포트폴리오 — AWS S3 + CloudFront 배포 체크리스트·설정 가이드

이 문서는 HTML/CSS/JS 정적 사이트를 **Amazon S3**에 올리고 **CloudFront**로 배포할 때의 설정값, 버킷 정책, CloudFront 옵션, 배포 후 점검, 캐시 무효화까지 정리합니다.

---

## 사전 준비

- [ ] AWS 계정 및 결제(또는 Free Tier) 확인  
- [ ] [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) 설치  
- [ ] `aws configure`로 리전·자격 증명 설정  

```bash
aws configure
# AWS Access Key ID / Secret / Default region (예: ap-northeast-2) / output json
```

---

## 1. S3 버킷 생성 — 설정값 체크리스트

| 항목 | 권장·주의 |
|------|-----------|
| **버킷 이름** | 전 세계에서 유일해야 합니다. 소문자, 숫자, 하이픈(`-`)만 사용(대문자·언더스코어 비권장). 예: `portfolio-kimjunhyuk-prod`. **정적 웹 호스팅 URL**을 쓸 경우, 예전 관행상 **버킷명 = 도메인명**이었으나, 실제 서비스 URL은 **CloudFront 도메인** 또는 **커스텀 도메인 + ACM**을 쓰는 경우가 많습니다. |
| **리전** | 사용자·배포 대상에 가깝게 선택(예: 한국 `ap-northeast-2`, 도쿄 `ap-northeast-1`). CloudFront는 글로벌 엣지이므로 오리진만 리전에 맞추면 됩니다. |
| **퍼블릭 액세스(블록)** | **정적 웹 호스팅 + 퍼블릭 읽기**로 갈 경우: “새 ACL을 통한 퍼블릭 액세스 차단” 등은 켜도 되지만, 아래 **버킷 정책으로 `s3:GetObject` 허용**이 핵심입니다. **ACL에 의존한 퍼블릭 읽기**는 신규 버킷에서 비권장이므로 **버킷 정책(JSON)** 방식을 권장합니다. |
| **버전 관리** | 선택. 롤백·감사가 필요하면 활성화. |
| **암호화** | 기본(SSE-S3)으로 충분한 경우가 많습니다. |

### AWS CLI — 버킷 생성

```bash
# 변수 (본인 값으로 변경)
export AWS_REGION="ap-northeast-2"
export BUCKET_NAME="portfolio-kimjunhyuk-prod"

aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

> `us-east-1`에서는 `LocationConstraint` 생략이 필요합니다. [공식 문서](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html) 참고.

---

## 2. S3 정적 웹사이트 호스팅 활성화

### 콘솔

1. S3 → 해당 버킷 → **속성(Properties)**  
2. **정적 웹 사이트 호스팅(Static website hosting)** → **편집**  
3. **활성화** → 인덱스 문서: `index.html` → (선택) 오류 문서: `index.html` 또는 `404.html`  
4. 저장 후 표시되는 **버킷 웹 사이트 엔드포인트** URL을 메모합니다.  
   - 형식: `http://<버킷명>.s3-website-<리전>.amazonaws.com`

### AWS CLI

```bash
aws s3api put-bucket-website \
  --bucket "$BUCKET_NAME" \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'
```

> 이 프로젝트는 **빌드 없는 멀티 섹션 원페이지**이므로, 존재하지 않는 경로 요청 시에도 `index.html`로 돌리면 앵커·클라이언트 라우팅과 맞추기 쉽습니다.

---

## 3. 버킷 정책 JSON (객체 퍼블릭 읽기)

아래에서 **`YOUR-BUCKET-NAME`**을 실제 버킷명으로 바꿔 사용합니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

### AWS CLI 적용

```bash
# policy.json 파일에 위 내용 저장 후 YOUR-BUCKET-NAME 치환
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy file://policy.json
```

**보안 참고**

- 퍼블릭 읽기는 **누구나 URL만 알면 객체를 읽을 수 있음**을 의미합니다.  
- 더 안전한 구성은 **버킷 비공개 + CloudFront OAC(Origin Access Control)** 만 허용하는 방식입니다. (별도 가이드 권장)

---

## 4. CloudFront 배포 — 주요 설정값

### 4.1 Origin (S3 연결)

| 설정 | 권장 |
|------|------|
| **Origin domain** | (A) **S3 웹사이트 엔드포인트** — 위 정적 호스팅에서 나온 `s3-website-...` 도메인을 선택하면 `index.html` 기본 문서·오류 문서 동작이 자연스럽습니다. **또는** (B) **REST API 엔드포인트** (`bucket.s3.region.amazonaws.com`) + OAC + 비공개 버킷. |
| **Origin path** | 비움(루트). 하위 폴더만 서빙할 때만 지정. |
| **HTTPS only** | Viewer에서 HTTPS 권장. |

> 콘솔에서 S3 오리진을 고르면 **OAC 자동 권장** 안내가 뜰 수 있습니다. **퍼블릭 버킷 + 웹사이트 엔드포인트**를 쓰는 경우에는 OAC 없이도 동작시킬 수 있으나, 운영 정책에 맞게 선택하세요.

### 4.2 Default root object

- **Default root object**: `index.html`  
- 루트 URL(`https://dxxxx.cloudfront.net/`) 요청 시 `index.html`을 반환합니다.

### 4.3 에러 페이지 (404 → index.html, SPA·원페이지 대응)

콘솔: **CloudFront → 배포 → Error pages → Create custom error response**

| HTTP error code | Response page path | HTTP Response code |
|-----------------|----------------------|--------------------|
| **404** | `/index.html` | **200** |
| (선택) **403** | `/index.html` | **200** |

REST 오리진 + OAC 조합에서는 누락 객체가 **403**으로 올 수 있어 **403도 동일 처리**하는 경우가 많습니다.

### 4.4 기타 권장

- **Viewer Protocol Policy**: Redirect HTTP to HTTPS  
- **Compress objects automatically**: Yes (gzip/br)  
- **Price class**: 필요 시 North America/Europe만 등으로 비용 조절  
- **Alternate domain name (CNAME)**: 실제 도메인 사용 시 ACM 인증서(미국 동부 `us-east-1`에서 발급하는 경우가 많음 — CloudFront용 ACM 정책 확인)  

### AWS CLI로 배포 생성 (참고)

콘솔로 만든 뒤 `get-distribution-config`로 JSON을 받아 수정하는 방식이 가장 단순합니다. 처음부터 CLI만으로 만들려면 `create-distribution`에 큰 JSON이 필요합니다.

```bash
# 예: 기존 배포 ID의 설정을 덤프해 템플릿으로 사용
aws cloudfront get-distribution-config --id E1234567890ABC > dist-config.json
# (로컬에서 Origin, DefaultRootObject, CustomErrorResponses 등 수정 후 create-distribution / copy-distribution)
```

실무에서는 **콘솔로 1회 생성 → Terraform/CDK로 이전**을 많이 씁니다.

---

## 5. 배포 후 확인 사항 체크리스트

- [ ] **CloudFront URL**로 `index.html` 로딩(히어로·CSS·JS·폰트)  
- [ ] **HTTPS**로만 접속되는지(Viewer redirect)  
- [ ] **존재하지 않는 경로** 입력 시 의도대로 `index.html`이 나오는지(커스텀 에러 설정 확인)  
- [ ] **`/css/`, `/js/`, `/data/`** 등 상대 경로 리소스 200 여부(개발자 도구 Network)  
- [ ] **`file://` 전용**으로 넣었던 `#portfolio-embed` vs **`fetch('./data/portfolio.json')`** — **HTTPS 배포 시** 서버에서 `fetch`가 동작하는지 확인(권장: **embed 제거하고 JSON만** 운영)  
- [ ] **OG 이미지** `og:image` 절대 URL이 실제로 열리는지(카카오·슬랙 미리보기 테스트)  
- [ ] **캐시**: HTML/CSS/JS 수정 후 이전 버전이 보이면 **Invalidation**(아래 6절)  

---

## 6. 파일 업데이트 후 — CloudFront 캐시 무효화(Invalidation)

배포 ID는 콘솔 **CloudFront → 배포 목록 → ID**에서 확인합니다.

### 전체 무효화(자주 쓰는 패턴)

```bash
export DISTRIBUTION_ID="E1234567890ABC"

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"
```

### 특정 경로만

```bash
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/css/*" "/js/*"
```

### S3에 파일 동기화(업로드) 예시

```bash
export BUCKET_NAME="portfolio-kimjunhyuk-prod"

# 프로젝트 루트에서 (index.html, css/, js/, data/ 등)
aws s3 sync . "s3://$BUCKET_NAME/" \
  --exclude ".git/*" \
  --exclude ".cursor/*" \
  --exclude "docs/*" \
  --exclude "*.md" \
  --delete
```

> `--delete`는 S3에만 있고 로컬에 없는 객체를 지웁니다. 사용 전 경로를 반드시 확인하세요.

업로드 후:

```bash
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
```

---

## 한 페이지 요약 체크리스트

1. [ ] S3 버킷 생성(이름·리전)  
2. [ ] 정적 웹 호스팅 ON, 인덱스 `index.html`  
3. [ ] 버킷 정책으로 `GetObject` 퍼블릭 허용(또는 OAC로 비공개 + CloudFront만)  
4. [ ] CloudFront 배포: Origin = S3(웹 또는 REST+OAC), **Default root object = index.html**  
5. [ ] Custom error: **404(및 필요 시 403) → /index.html, 응답 200**  
6. [ ] `aws s3 sync`로 업로드  
7. [ ] `aws cloudfront create-invalidation --paths "/*"`  
8. [ ] 브라우저·OG·모바일로 최종 확인  

---

## 참고 링크

- [S3 정적 웹 사이트 호스팅](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)  
- [CloudFront S3 오리진](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html)  
- [CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)  
- [create-invalidation](https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html)  

문서 버전: 정적 포트폴리오(`index.html` + `css/` + `js/` + `data/`) 기준.
