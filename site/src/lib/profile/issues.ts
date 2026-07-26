import type {
  ProfileIssueCode,
  ProfilePath,
  ValidationIssue,
} from './types.js';

export const PROFILE_ISSUE_CODES = [
  'field.required',
  'field.type',
  'text.empty',
  'collection.minimum',
  'collection.range',
  'fact.identifier.format',
  'fact.identifier.duplicate',
  'identifier.format',
  'identifier.duplicate',
  'order.positive-integer',
  'order.duplicate',
  'period.precision',
  'period.value',
  'period.range',
  'reference.kind',
  'reference.missing',
  'contact.email.invalid',
  'contact.github.invalid',
  'evidence.url.invalid',
  'content.block.kind',
  'content.block.empty',
  'approval.record.missing',
  'approval.status',
  'approval.value-mismatch',
  'approval.production-extra',
  'metadata.title.mismatch',
  'metadata.route.invalid',
  'metadata.description.mismatch',
  'metadata.claim.unsupported',
  'metadata.structured-data.invalid',
  'jsonld.serialization',
  'navigation.model.invalid',
  'navigation.current.invalid',
  'document.link.invalid',
  'document.source.invalid',
  'document.generation.failed',
  'document.missing',
  'document.unreadable',
  'document.stale',
  'document.parity',
] as const satisfies readonly ProfileIssueCode[];

const STATIC_ISSUE_MESSAGES = {
  'field.required': '필수값이 없습니다.',
  'field.type': '허용된 값 종류가 아닙니다.',
  'text.empty': '정규화한 텍스트가 비어 있습니다.',
  'fact.identifier.format':
    'Fact ID는 소문자 영숫자 kebab-case여야 합니다.',
  'fact.identifier.duplicate':
    'Fact ID가 다른 public fact에 중복 사용되었습니다.',
  'identifier.format': 'ID는 소문자 영숫자 kebab-case여야 합니다.',
  'identifier.duplicate': '같은 entity 종류 안에서 ID가 중복됩니다.',
  'order.positive-integer': '표시 순서는 양의 정수여야 합니다.',
  'order.duplicate': '같은 collection 안에서 표시 순서가 중복됩니다.',
  'period.precision':
    '기간은 year 또는 year-month의 같은 정밀도를 사용해야 합니다.',
  'period.value': '유효한 기간 값이 아닙니다.',
  'period.range': '기간 종료가 시작보다 이를 수 없습니다.',
  'reference.kind': '허용된 relation 종류가 아닙니다.',
  'reference.missing': '참조 대상 entity가 존재하지 않습니다.',
  'contact.email.invalid': '공개 이메일 형식이 유효하지 않습니다.',
  'contact.github.invalid': 'GitHub profile URL 형식이 유효하지 않습니다.',
  'evidence.url.invalid': '공개 근거 URL 형식이 유효하지 않습니다.',
  'content.block.kind': '허용되지 않은 content block 종류입니다.',
  'content.block.empty':
    'Content block과 list item은 비어 있을 수 없습니다.',
  'approval.record.missing':
    'Production fact에 대응하는 승인 기록이 없습니다.',
  'approval.status':
    '승인되지 않은 fact는 production output에 포함할 수 없습니다.',
  'approval.value-mismatch':
    '승인된 값과 production 값이 일치하지 않습니다.',
  'approval.production-extra':
    '승인 범위를 벗어난 production fact가 있습니다.',
  'metadata.title.mismatch':
    'Metadata title이 페이지의 고정 title 계약과 일치하지 않습니다.',
  'metadata.route.invalid':
    '페이지 route와 metadata URL 계약이 일치하지 않습니다.',
  'metadata.description.mismatch':
    'Metadata description은 화면의 승인된 summary와 같아야 합니다.',
  'metadata.claim.unsupported':
    '화면의 승인된 사실보다 강한 metadata claim입니다.',
  'metadata.structured-data.invalid':
    '구조화 데이터가 페이지의 승인된 projection과 일치하지 않습니다.',
  'jsonld.serialization':
    '구조화 데이터 직렬화 결과를 안전하게 복원할 수 없습니다.',
  'navigation.model.invalid':
    '공통 navigation model 계약이 일치하지 않습니다.',
  'navigation.current.invalid':
    '현재 경로에 필요한 navigation current 상태가 유일하지 않습니다.',
  'document.link.invalid':
    '이력서 문서 링크가 고정 public contract와 일치하지 않습니다.',
  'document.source.invalid':
    'PDF 요청이 현재 승인된 résumé source에서 파생되지 않았습니다.',
  'document.generation.failed':
    '현재 résumé source에서 PDF를 생성하지 못했습니다.',
  'document.missing': '승인된 이력서 PDF 파일이 없습니다.',
  'document.unreadable': '이력서 PDF를 읽거나 검사할 수 없습니다.',
  'document.stale':
    '이력서 PDF가 현재 승인된 source보다 오래되었습니다.',
  'document.parity':
    'Web, print와 PDF의 승인 사실이 일치하지 않습니다.',
} as const satisfies Record<
  Exclude<ProfileIssueCode, 'collection.minimum' | 'collection.range'>,
  string
>;

const PROFILE_PATH_PATTERN =
  /^profile(?:\.[A-Za-z][A-Za-z0-9]*|\[\d+\])*$/;

const ROOT_FIELD_RANK = new Map<string, number>([
  ['identity', 0],
  ['narrative', 1],
  ['contact', 2],
  ['skillGroups', 3],
  ['experiences', 4],
  ['achievements', 5],
  ['projects', 6],
  ['education', 7],
  ['certifications', 8],
  ['facts', 9],
  ['metadata', 10],
  ['navigation', 11],
  ['document', 12],
]);

export interface IssueMessageParameters {
  readonly min?: number;
  readonly max?: number;
}

export function isProfilePath(value: unknown): value is ProfilePath {
  return typeof value === 'string' && PROFILE_PATH_PATTERN.test(value);
}

export function profilePath(value: string): ProfilePath {
  if (!isProfilePath(value)) {
    throw new TypeError('Profile issue path must start at the profile root.');
  }

  return value;
}

export function issueMessage(
  code: ProfileIssueCode,
  parameters: IssueMessageParameters = {},
): string {
  if (code === 'collection.minimum') {
    if (!Number.isInteger(parameters.min) || (parameters.min ?? 0) < 0) {
      throw new TypeError('collection.minimum requires a non-negative min.');
    }

    return `최소 ${parameters.min}개가 필요합니다.`;
  }

  if (code === 'collection.range') {
    if (
      !Number.isInteger(parameters.min) ||
      !Number.isInteger(parameters.max) ||
      (parameters.min ?? 0) < 0 ||
      (parameters.max ?? -1) < (parameters.min ?? 0)
    ) {
      throw new TypeError(
        'collection.range requires a valid non-negative min/max range.',
      );
    }

    return `${parameters.min}개 이상 ${parameters.max}개 이하만 허용합니다.`;
  }

  return STATIC_ISSUE_MESSAGES[code];
}

export function createValidationIssue(
  code: ProfileIssueCode,
  path: string | ProfilePath,
  parameters: IssueMessageParameters = {},
): ValidationIssue {
  return Object.freeze({
    code,
    path: profilePath(path),
    message: issueMessage(code, parameters),
  });
}

export function compareValidationIssues(
  left: ValidationIssue,
  right: ValidationIssue,
): number {
  const phaseDifference = issuePhaseRank(left.code) - issuePhaseRank(right.code);
  if (phaseDifference !== 0) {
    return phaseDifference;
  }

  const rootDifference = rootFieldRank(left.path) - rootFieldRank(right.path);
  if (rootDifference !== 0) {
    return rootDifference;
  }

  const indexDifference = compareNumericIndices(
    sourceIndices(left.path),
    sourceIndices(right.path),
  );
  if (indexDifference !== 0) {
    return indexDifference;
  }

  const codeDifference = compareAscii(left.code, right.code);
  if (codeDifference !== 0) {
    return codeDifference;
  }

  const messageDifference = compareAscii(left.message, right.message);
  if (messageDifference !== 0) {
    return messageDifference;
  }

  return compareAscii(left.path, right.path);
}

export function sortAndDedupeIssues(
  issues: readonly ValidationIssue[],
): readonly ValidationIssue[] {
  const sorted = [...issues].sort(compareValidationIssues);
  const seen = new Set<string>();
  const unique: ValidationIssue[] = [];

  for (const issue of sorted) {
    const key = `${issue.code}\u0000${issue.path}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(issue);
  }

  return Object.freeze(unique);
}

function issuePhaseRank(code: ProfileIssueCode): number {
  if (
    code.startsWith('field.') ||
    code.startsWith('text.') ||
    code.startsWith('content.')
  ) {
    return 0;
  }

  if (
    code.startsWith('period.') ||
    code.startsWith('contact.') ||
    code.startsWith('evidence.')
  ) {
    return 1;
  }

  if (
    code.startsWith('collection.') ||
    code.startsWith('fact.identifier.') ||
    code.startsWith('identifier.') ||
    code.startsWith('order.')
  ) {
    return 2;
  }

  if (code.startsWith('reference.') || code.startsWith('approval.')) {
    return 3;
  }

  if (
    code.startsWith('metadata.') ||
    code.startsWith('jsonld.') ||
    code.startsWith('navigation.')
  ) {
    return 4;
  }

  return 5;
}

function rootFieldRank(path: ProfilePath): number {
  const match = /^profile\.([A-Za-z][A-Za-z0-9]*)/.exec(path);
  if (!match) {
    return -1;
  }

  return ROOT_FIELD_RANK.get(match[1]) ?? Number.MAX_SAFE_INTEGER;
}

function sourceIndices(path: ProfilePath): readonly number[] {
  const indices: number[] = [];
  const pattern = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    indices.push(Number(match[1]));
  }

  return indices;
}

function compareNumericIndices(
  left: readonly number[],
  right: readonly number[],
): number {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? -1;
    const rightValue = right[index] ?? -1;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

function compareAscii(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
