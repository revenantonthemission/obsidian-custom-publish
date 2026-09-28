# 이력서 양식 조사와 보완 근거

2026-09-27 사용자 요청: “인터넷에서 이력서 양식을 검색하고 부족한 내용을 채워봐.”

## 참고 자료

- [Harvard College 기술직 이력서 예시](https://careerservices.fas.harvard.edu/resources/harvard-college-resume-example-tech/): 이름과 연락처를 상단에 두고, 프로젝트·경력별 기간과 구체적인 작업을 표시한다. 서식 원칙을 참고했으며 예시 인물의 문구나 실적을 가져오지 않았다.
- [Harvard College 항목식 이력서 양식](https://careerservices.fas.harvard.edu/resources/bullet-point-resume-template/): 항목과 짧은 설명으로 경력을 구성하는 공식 양식이다.
- [MIT 이력서 점검표](https://capd.mit.edu/resources/resume-checklist/): 연락처, 졸업 연월, 직함, 활동 기간, 프로젝트와 결과, 관련 기술을 확인하고 읽기 쉬운 10–12pt 글자와 일관된 형식을 권장한다.
- [MIT 경험·역량 작성법](https://capd.mit.edu/resources/resumes-writing-about-your-skills/): 프로젝트 맥락, 본인의 행동, 결과를 연결하고 짧은 항목으로 나누는 방법을 참고했다.

## 현재 자료에서 보완할 수 있는 내용

| 점검 항목 | 발견한 부족한 점 | 반영 방법과 근거 |
| --- | --- | --- |
| 연락처 | PDF에는 이메일·GitHub가 버튼 이름으로만 표시됨 | 기존 승인된 이메일 주소와 GitHub URL 자체를 화면과 PDF에 표시 |
| 지원 직무 | 데이터 엔지니어 경험과 지원하려는 직무가 구분되지 않음 | 사용자가 요청한 프로덕트 엔지니어를 지원 직무로 명시. 실제 DocSuri 역할은 데이터 엔지니어로 유지 |
| 프로젝트 역할 | DocSuri 역할과 기여가 긴 소개문 안에 섞임 | 프로젝트 항목에 팀 규모·담당 범위·팀원 기여를 모음 |
| 프로젝트 기술 | 전체 기술 목록과 프로젝트의 연결이 약함 | 기존 구현 근거가 있는 Python, PostgreSQL, OpenSearch, Docker, AWS 서비스를 DocSuri 아래 표시 |
| 결과와 검증 | 추상적인 역량 설명만으로 읽힐 수 있음 | 검색 장애 재현 질의의 정상 응답, 워커 3→1 조정, 데이터 계약 변경과 재처리 테스트를 구체적인 작업 항목으로 구성 |
| 학력 | 졸업 여부와 월이 불명확했음 | 사용자 확인에 따라 2026년 2월 졸업 명시 |
| 경력 기간 | 7–8월 인턴십과 10–11월 해외 협업을 혼동할 수 있음 | 별도 협업임을 문장 안에 명시 |
| 분량 | 기술 그룹의 큰 카드와 중복 제목이 2페이지를 차지함 | 한 단 구성과 간결한 기술 행으로 조정. 본문 10pt 이상과 읽기 순서 유지 |

## 확인 없이 채우지 않는 항목

DocSuri 원래 계획서에는 2026.06.03–07.06의 5주 팀 개발 계획이 있으나, 이 날짜가 실제 전체 프로젝트 기간을 뜻하지는 않는다. AWS 운영 종료일 2026.08.17 역시 프로젝트 종료일과 다르다. 실제 참여 시작·종료 및 현재 진행 여부는 사용자에게 확인을 요청했다. 계획 일정을 실적 기간으로 바꾸거나, 확인되지 않은 AWS AI School 수료일을 추가하지 않는다.

전화번호, 학점, 학위 명칭, 사용자 수·매출·전후 성능 향상률은 현재 승인된 자료에서 확인하지 못했다. 선택 항목을 억지로 채우기보다 확인된 이메일·학과·졸업일·기술 기여를 사용한다. 이러한 미기재는 경력이나 자격이 없다는 주장도 아니다.

기술적 사실의 상세 근거는 [DocSuri 맥락과 기여 범위](../../portfolio/kakaopay-data-platform/evidence/context-and-scope.md), [파이프라인](../../portfolio/kakaopay-data-platform/evidence/data-pipelines.md), [계약과 품질](../../portfolio/kakaopay-data-platform/evidence/contracts-quality.md), [운영](../../portfolio/kakaopay-data-platform/evidence/operations.md)를 따른다.
